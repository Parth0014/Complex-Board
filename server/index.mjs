import { createServer } from 'node:http';
import { generateAI } from './ai.mjs';
import { removeBackground } from './background.mjs';
import { editImage } from './edit.mjs';
import { upscaleImage } from './upscale.mjs';
import { generateVideo } from './video.mjs';
import { analyzeReference } from './reference.mjs';
const port = Number(process.env.AI_PORT || 8787),
  allowedOrigin = process.env.APP_ORIGIN || 'http://127.0.0.1:5173';
let active = 0;
const server = createServer(async (req, res) => {
  const respond = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };
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
      '/api/ai/reference',
    ].includes(req.url) ||
    req.method !== 'POST'
  ) {
    respond(404, { error: 'Not found' });
    return;
  }
  if (
    req.headers.origin &&
    req.headers.origin !== allowedOrigin &&
    req.headers.origin !== 'http://127.0.0.1:4173'
  ) {
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
    let body = '';
    const limit = req.url === '/api/ai/generate' ? 16000 : 16000100;
    for await (const chunk of req) {
      body += chunk;
      if (body.length > limit) throw new Error('Request too large.');
    }
    const input = JSON.parse(body);
    respond(
      200,
      req.url === '/api/ai/remove-background'
        ? await removeBackground(input.image)
        : req.url === '/api/ai/reference'
          ? await analyzeReference(input)
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
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} is already in use. If the AI server is already running, keep using it and start the frontend with npm run dev. To restart it, stop the existing server with Ctrl+C in its terminal, then run npm run ai:server again.`,
    );
  } else {
    console.error('AI server failed to start:', error.message);
  }
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () =>
  console.log(`AI server listening on http://127.0.0.1:${port}`),
);
