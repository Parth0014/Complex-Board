import { imageStatus, searchImages, importImage } from './images.mjs';
import { generateAI } from './ai.mjs';
import { removeBackground } from './background.mjs';
import { editImage } from './edit.mjs';
import { upscaleImage } from './upscale.mjs';
import { generateVideo } from './video.mjs';
let active = 0;
export async function handleRequest(req, res) {
  const allowedOrigin = process.env.APP_ORIGIN || 'http://127.0.0.1:5173';
  const allowed =
    !req.headers.origin ||
    [allowedOrigin, 'http://127.0.0.1:4173'].includes(req.headers.origin) ||
    (process.env.VERCEL && req.headers.origin === `https://${req.headers.host}`);
  const respond = (status, data) => {
    let output = JSON.stringify(data);
    if (process.env.VERCEL && Buffer.byteLength(output) > 4000000) {
      status = 413;
      output = JSON.stringify({
        error: 'This image exceeds the hosted AI response limit. Use a smaller image.',
      });
    }
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(output);
  };
  const route = new URL(req.url, 'http://localhost');
  if (route.pathname.startsWith('/api/images/')) {
    if (!allowed) {
      respond(403, { error: 'Origin not allowed' });
      return;
    }
    try {
      if (route.pathname === '/api/images/status' && req.method === 'GET')
        respond(200, imageStatus());
      else if (route.pathname === '/api/images/search' && req.method === 'GET')
        respond(
          200,
          await searchImages(
            route.searchParams.get('provider'),
            route.searchParams.get('q'),
            Number(route.searchParams.get('page') || 1),
          ),
        );
      else if (route.pathname === '/api/images/import' && req.method === 'POST') {
        if (!String(req.headers['content-type']).startsWith('application/json'))
          throw new Error('JSON required.');
        respond(200, await importImage((await readInput(req, 16000)).token));
      } else respond(404, { error: 'Not found' });
    } catch (error) {
      respond(error.status || 400, {
        error: error instanceof Error ? error.message : 'Image request failed.',
      });
    }
    return;
  }
  if (req.url === '/api/ai/status' && req.method === 'GET') {
    let backgroundAvailable = false;
    if (process.env.REMBG_URL) {
      try {
        const health = await fetch(process.env.REMBG_URL, {
          method: 'HEAD',
          signal: AbortSignal.timeout(1500),
        });
        backgroundAvailable = health.ok || health.status === 405;
      } catch {
        /* A configured endpoint may be offline. */
      }
    }
    respond(200, {
      configured: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
      videoConfigured: process.env.ENABLE_AI_VIDEO === 'true',
      backgroundConfigured: !!process.env.REMBG_URL,
      backgroundAvailable,
      upscaleConfigured: !!(process.env.UPSCALE_URL && process.env.UPSCALE_TOKEN),
      provider: 'Cloudflare Workers AI',
    });
    return;
  }
  if (
    ![
      '/api/ai/generate',
      '/api/ai/remove-background',
      '/api/ai/edit',
      '/api/ai/upscale',
      '/api/ai/video',
    ].includes(req.url) ||
    req.method !== 'POST'
  ) {
    respond(404, { error: 'Not found' });
    return;
  }
  if (!allowed) {
    respond(403, { error: 'Origin not allowed' });
    return;
  }
  if (!String(req.headers['content-type']).startsWith('application/json')) {
    respond(415, { error: 'JSON required' });
    return;
  }
  if (active >= 2) {
    respond(429, { error: 'Generation is busy. Try again shortly.' });
    return;
  }
  active++;
  try {
    const limit = req.url === '/api/ai/generate' ? 16000 : process.env.VERCEL ? 4000000 : 16000100;
    const input = await readInput(req, limit);
    respond(
      200,
      req.url === '/api/ai/remove-background'
        ? await removeBackground(input.image)
        : req.url === '/api/ai/edit'
          ? await editImage(input)
          : req.url === '/api/ai/upscale'
            ? await upscaleImage(input.image)
            : req.url === '/api/ai/video'
              ? await generateVideo(input)
              : await generateAI(input),
    );
  } catch (error) {
    respond(error.status || 400, {
      error: error instanceof Error ? error.message : 'Generation failed.',
    });
  } finally {
    active--;
  }
}

async function readInput(req, limit) {
  if (req.body !== undefined) {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(body) > limit)
      throw Object.assign(new Error('Image request is too large. Use a smaller image.'), {
        status: 413,
      });
    return JSON.parse(body);
  }
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > limit)
      throw Object.assign(new Error('Request is too large.'), { status: 413 });
  }
  return JSON.parse(body);
}
