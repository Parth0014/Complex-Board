export async function removeBackground(image, env = process.env, fetcher = fetch) {
  if (!env.REMBG_URL)
    throw Object.assign(
      new Error(
        'Background removal needs a separate cutout service. Start rembg s, set REMBG_URL in .env, and restart npm run ai:server.',
      ),
      { status: 503 },
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
  let response;
  try {
    response = await fetcher(env.REMBG_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(90000),
    });
  } catch {
    throw Object.assign(
      new Error(
        'The background removal service is unavailable. Start rembg s and check that REMBG_URL points to its /api/remove endpoint. Then retry; your original image is unchanged.',
      ),
      { status: 503 },
    );
  }
  if (!response.ok || !String(response.headers.get('content-type')).startsWith('image/png'))
    throw Object.assign(
      new Error(
        'The cutout service could not process this image. Check REMBG_URL and the rembg server logs, or try a smaller photo.',
      ),
      { status: 502 },
    );
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 12000000) throw new Error('Cutout image is too large.');
  return { image: `data:image/png;base64,${buffer.toString('base64')}` };
}
