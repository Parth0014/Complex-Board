/** Image-to-image and masked inpainting; credentials never enter browser responses. */
export async function editImage({ image, prompt, mask }, env = process.env, fetcher = fetch) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000)
    throw new Error('Enter an editing prompt.');
  if (
    typeof image !== 'string' ||
    image.length > 4000000 ||
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)
  )
    throw new Error('Invalid editing image.');
  if (
    mask !== undefined &&
    (typeof mask !== 'string' ||
      mask.length > 4000000 ||
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(mask))
  )
    throw new Error('Invalid editing mask.');
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN)
    throw new Error('AI is not configured.');
  const model = mask
    ? '@cf/runwayml/stable-diffusion-v1-5-inpainting'
    : '@cf/runwayml/stable-diffusion-v1-5-img2img';
  const body = {
    prompt,
    image_b64: image.split(',')[1],
    num_steps: 4,
    strength: 0.75,
    ...(mask ? { mask: [...Buffer.from(mask.split(',')[1], 'base64')] } : {}),
  };
  const response = await fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/ai/run/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? 'Generation quota reached. Try again later.'
        : `Image editing provider returned ${response.status}.`,
    );
  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    bytes.length > 12000000 ||
    bytes.length < 8 ||
    bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
  )
    throw new Error('The editing provider returned an invalid image.');
  return { image: `data:image/png;base64,${bytes.toString('base64')}`, model };
}
