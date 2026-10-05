/** Optional paid video route. Disabled unless the server owner explicitly enables it. */
export async function generateVideo({ image, prompt }, env = process.env, fetcher = fetch) {
  if (env.ENABLE_AI_VIDEO !== 'true')
    throw new Error(
      'AI video is disabled. It requires a paid provider; enable it on the server only if desired.',
    );
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN)
    throw new Error('AI is not configured.');
  if (
    typeof prompt !== 'string' ||
    prompt.length > 2000 ||
    typeof image !== 'string' ||
    image.length > 4000000 ||
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)
  )
    throw new Error('Invalid video input.');
  const model = 'alibaba/wan-2.7-i2v',
    response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/ai/run`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, input: { image, prompt, duration: 2, resolution: '720P' } }),
        signal: AbortSignal.timeout(180000),
      },
    );
  if (!response.ok)
    throw new Error(
      `Video provider returned ${response.status}. Check quota and paid-model access.`,
    );
  const result = await response.json(),
    url = result.result?.video || result.result?.result?.video;
  if (typeof url !== 'string')
    throw new Error(
      'The provider did not return a completed video. Check its job status before retrying.',
    );
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    !['cloudflare.com', 'aliyuncs.com'].some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
    )
  )
    throw new Error('Video provider returned an unsupported download host.');
  const video = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(90000) });
  if (!video.ok || !video.body) throw new Error('Generated video download failed.');
  const reader = video.body.getReader(),
    chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 32000000) throw new Error('Generated video exceeds the download limit.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = Buffer.concat(chunks);
  if (bytes.length < 12 || bytes.subarray(4, 8).toString() !== 'ftyp')
    throw new Error('Provider returned an invalid MP4.');
  return { video: `data:video/mp4;base64,${bytes.toString('base64')}`, model };
}
