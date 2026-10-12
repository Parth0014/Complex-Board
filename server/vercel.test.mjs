import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/handler.js';
async function request(url, method = 'GET', body, origin = 'https://preview.vercel.app') {
  let status, data;
  const req = {
    url,
    method,
    body,
    headers: { host: 'preview.vercel.app', origin, 'content-type': 'application/json' },
  };
  const res = {
    writeHead(code) {
      status = code;
    },
    end(value) {
      data = JSON.parse(value);
    },
  };
  await handler(req, res);
  return { status, data };
}
test('Vercel rewrites, preview origin, parsed JSON body and cross-instance image tokens', async () => {
  const old = {
    vercel: process.env.VERCEL,
    key: process.env.UNSPLASH_ACCESS_KEY,
    secret: process.env.IMAGE_TOKEN_SECRET,
  };
  const fetch = globalThis.fetch;
  process.env.VERCEL = '1';
  process.env.UNSPLASH_ACCESS_KEY = 'test-key';
  process.env.IMAGE_TOKEN_SECRET = 'stable-test-secret';
  try {
    assert.equal((await request('/api/handler?route=images/status')).data.unsplash, true);
    assert.equal(
      (await request('/api/handler?route=images/status', 'GET', undefined, 'https://wrong.example'))
        .status,
      403,
    );
    const ai = await request('/api/handler?route=ai/status&deployment=test');
    assert.equal(ai.status, 200);
    assert.equal(
      (
        await request('/api/handler?route=ai/generate&deployment=test', 'POST', {
          mode: 'invalid',
          prompt: 'test',
        })
      ).status,
      400,
    );
    const invalid = await request('/api/handler?route=images/import', 'POST', { token: 'invalid' });
    assert.equal(invalid.status, 400);
    assert.equal(
      (await request('/api/handler?route=images/import', 'POST', { token: 'x'.repeat(17000) }))
        .status,
      413,
    );
    globalThis.fetch = async (url) =>
      new URL(url).pathname.endsWith('/download')
        ? Response.json({})
        : Response.json({
            total: 1,
            results: [
              {
                id: 'p',
                urls: {
                  small: 'https://images.unsplash.com/small',
                  regular: 'https://images.unsplash.com/full',
                },
                user: { name: 'Artist', links: { html: 'https://unsplash.com/@artist' } },
                links: {
                  html: 'https://unsplash.com/photos/p',
                  download_location: 'https://api.unsplash.com/photos/p/download',
                },
              },
            ],
          });
    const first = await import('./images.mjs?instance=first'),
      second = await import('./images.mjs?instance=second');
    const result = await first.searchImages('unsplash', 'mountain');
    assert.equal((await second.importImage(result.items[0].token)).provider, 'unsplash');
  } finally {
    globalThis.fetch = fetch;
    for (const [name, value] of [
      ['VERCEL', old.vercel],
      ['UNSPLASH_ACCESS_KEY', old.key],
      ['IMAGE_TOKEN_SECRET', old.secret],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
