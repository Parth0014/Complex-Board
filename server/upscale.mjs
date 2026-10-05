export async function upscaleImage(image, env = process.env, fetcher = fetch) {
  if (!env.UPSCALE_URL || !env.UPSCALE_TOKEN)
    throw new Error(
      'AI upscaling needs the Images Worker configured on the server. See AI_SETUP.md.',
    );
  if (
    typeof image !== 'string' ||
    image.length > 16000000 ||
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image)
  )
    throw new Error('Invalid upscaling image.');
  const png = Buffer.from(image.split(',')[1], 'base64');
  if (png.length < 24 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
    throw new Error('Invalid PNG image.');
  const width = png.readUInt32BE(16),
    height = png.readUInt32BE(20);
  if (!width || !height || width > 8192 || height > 8192)
    throw new Error('Image dimensions exceed the upscaler limit.');
  const response = await fetcher(env.UPSCALE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.UPSCALE_TOKEN}`,
      'Content-Type': 'image/png',
      'X-Output-Width': String(Math.min(4096, width * 2)),
      'X-Output-Height': String(Math.min(4096, height * 2)),
    },
    body: png,
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok)
    throw new Error(
      `AI upscaler returned ${response.status}. Check quota and service configuration.`,
    );
  const output = Buffer.from(await response.arrayBuffer());
  if (
    output.length > 12000000 ||
    output.length < 24 ||
    output.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
  )
    throw new Error('Invalid upscaled PNG.');
  return { image: `data:image/png;base64,${output.toString('base64')}` };
}
