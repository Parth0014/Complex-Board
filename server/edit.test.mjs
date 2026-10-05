import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editImage } from './edit.mjs';
const env = { CLOUDFLARE_ACCOUNT_ID: 'test-account', CLOUDFLARE_API_TOKEN: 'test-token' },
  image = 'data:image/png;base64,iVBORw0KGgo=';
test('routes masked and unmasked edits and rejects invalid provider output', async () => {
  const provider = async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.num_steps, 4);
    assert.equal(body.image_b64, 'iVBORw0KGgo=');
    assert.match(url, body.mask ? /inpainting$/ : /img2img$/);
    return new Response(Buffer.from('89504e470d0a1a0a', 'hex'), {
      headers: { 'Content-Type': 'image/png' },
    });
  };
  assert.equal((await editImage({ image, prompt: 'Garden' }, env, provider)).image, image);
  assert.equal(
    (await editImage({ image, mask: image, prompt: 'Garden' }, env, provider)).image,
    image,
  );
  await assert.rejects(
    editImage({ image: 'https://example.com', prompt: 'Garden' }, env),
    /Invalid editing image/,
  );
  await assert.rejects(
    editImage({ image, prompt: 'Garden' }, env, async () => new Response('bad')),
    /invalid image/,
  );
});
