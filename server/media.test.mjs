import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upscaleImage } from './upscale.mjs';
import worker from './upscale-worker.mjs';
import { generateVideo } from './video.mjs';
const png = Buffer.alloc(24);
Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
png.writeUInt32BE(32, 16);
png.writeUInt32BE(32, 20);
const image = `data:image/png;base64,${png.toString('base64')}`;
test('upscaler authenticates only server-to-worker and explicitly requests AI interpolation', async () => {
  await assert.rejects(upscaleImage(image, {}), /configured/);
  const result = await upscaleImage(
    image,
    { UPSCALE_URL: 'https://upscale.example.com', UPSCALE_TOKEN: 'private' },
    async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer private');
      assert.equal(options.headers['X-Output-Width'], '64');
      return new Response(png);
    },
  );
  assert.equal(result.image, image);
  const env = {
    SECRET_TOKEN: 'private',
    IMAGES: {
      input: () => ({
        transform: (options) => {
          assert.equal(options.upscale, 'generate');
          assert.equal(options.width, 64);
          return { output: async () => ({ response: () => new Response(png) }) };
        },
      }),
    },
  };
  assert.equal(
    (
      await worker.fetch(
        new Request('https://worker.example.com', { method: 'POST', body: png }),
        env,
      )
    ).status,
    401,
  );
  const request = new Request('https://worker.example.com', {
    method: 'POST',
    headers: { Authorization: 'Bearer private', 'X-Output-Width': '64', 'X-Output-Height': '64' },
    body: png,
  });
  assert.equal((await worker.fetch(request, env)).status, 200);
});
test('video cannot spend by default and validates downloaded media hosts', async () => {
  await assert.rejects(generateVideo({ image, prompt: 'Move' }, {}), /disabled/);
  const env = {
    ENABLE_AI_VIDEO: 'true',
    CLOUDFLARE_ACCOUNT_ID: 'test',
    CLOUDFLARE_API_TOKEN: 'private',
  };
  await assert.rejects(
    generateVideo({ image, prompt: 'Move' }, env, async () =>
      Response.json({ result: { video: 'http://127.0.0.1/private' } }),
    ),
    /unsupported/,
  );
  let count = 0;
  const result = await generateVideo({ image, prompt: 'Move' }, env, async (url, options) => {
    if (count++ === 0) {
      const request = JSON.parse(options.body);
      assert.equal(request.input.duration, 2);
      assert.equal(request.input.resolution, '720P');
      return Response.json({ result: { video: 'https://examples.aig.cloudflare.com/output.mp4' } });
    }
    return new Response(Buffer.from('000000186674797069736f6d', 'hex'));
  });
  assert.match(result.video, /^data:video\/mp4;base64,/);
});
