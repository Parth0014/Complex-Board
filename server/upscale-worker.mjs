/** Deploy separately with an IMAGES binding and SECRET_TOKEN secret. */
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('POST required', { status: 405 });
    if (!env.SECRET_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.SECRET_TOKEN}`)
      return new Response('Unauthorized', { status: 401 });
    const width = Number(request.headers.get('X-Output-Width')),
      height = Number(request.headers.get('X-Output-Height'));
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 4096 ||
      height > 4096
    )
      return new Response('Invalid dimensions', { status: 400 });
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > 12000000) return new Response('Image too large', { status: 413 });
    const output = await env.IMAGES.input(new Blob([bytes], { type: 'image/png' }).stream())
      .transform({ width, height, fit: 'contain', upscale: 'generate' })
      .output({ format: 'image/png' });
    return output.response({ headers: { 'Cache-Control': 'no-store' } });
  },
};
