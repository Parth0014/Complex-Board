export async function removeBackground(image, env = process.env, fetcher = fetch) {
  if (!env.REMBG_URL)
    throw new Error(
      'Background removal is not configured. Set REMBG_URL to your local rembg server.',
    );
  if (
    typeof image !== 'string' ||
    !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image) ||
    image.length > 16000000
  )
    throw new Error('Invalid background removal image.');
  const form = new FormData();
  form.append(
    'file',
    new Blob([Buffer.from(image.split(',')[1], 'base64')], { type: 'image/png' }),
    'image.png',
  );
  const response = await fetcher(env.REMBG_URL, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok || !String(response.headers.get('content-type')).startsWith('image/png'))
    throw new Error('Background removal service failed.');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 12000000) throw new Error('Cutout image is too large.');
  return { image: `data:image/png;base64,${buffer.toString('base64')}` };
}
