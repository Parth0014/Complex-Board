import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removeBackground } from './background.mjs';
const image = 'data:image/png;base64,YWJjZA==';
test('cutout configuration and offline service return actionable availability errors', async () => {
  await assert.rejects(
    removeBackground(image, {}),
    (error) => error.status === 503 && /REMBG_URL/.test(error.message),
  );
  await assert.rejects(
    removeBackground(image, { REMBG_URL: 'http://localhost:7000/api/remove' }, async () => {
      throw new TypeError('fetch failed');
    }),
    (error) => error.status === 503 && /Start rembg s/.test(error.message),
  );
});
test('bad cutout requests and upstream failures are distinct from availability', async () => {
  await assert.rejects(removeBackground('bad', { REMBG_URL: 'test' }), /Invalid/);
  await assert.rejects(
    removeBackground(
      image,
      { REMBG_URL: 'test' },
      async () => new Response('bad', { status: 500 }),
    ),
    (error) => error.status === 502,
  );
  const result = await removeBackground(
    image,
    { REMBG_URL: 'test' },
    async () => new Response(Buffer.from('png'), { headers: { 'Content-Type': 'image/png' } }),
  );
  assert.equal(result.image, 'data:image/png;base64,cG5n');
});
