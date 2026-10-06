import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeReference, validateReference } from './reference.mjs';
const detected = {
  background: '#fafafa',
  elements: [
    {
      type: 'photo',
      x: 0,
      y: 0.2,
      width: 0.5,
      height: 0.5,
      assetUrl: 'https://example.com/original.jpg',
    },
    {
      type: 'text',
      x: 0,
      y: 0,
      width: 0.9,
      height: 0.1,
      text: 'MY 2026\nDreams',
      fontFamily: 'georgia',
    },
  ],
};
test('preserves exact text and discards source photos and unknown properties', () => {
  const result = validateReference(detected, 1080, 1350);
  assert.equal(result.elements[1].text, 'MY 2026\nDreams');
  assert.equal(result.width, 1080);
  assert.equal(JSON.stringify(result).includes('original.jpg'), false);
  assert.throws(() =>
    validateReference({ elements: [{ ...detected.elements[0], width: Infinity }] }, 1080, 1350),
  );
  assert.throws(() =>
    validateReference({ elements: [{ ...detected.elements[0], x: 0.8 }] }, 1080, 1350),
  );
});
test('vision request sends the image and handles invalid and failed providers', async () => {
  const input = { image: 'data:image/jpeg;base64,/9j/', width: 1080, height: 1350 };
  const env = { CLOUDFLARE_ACCOUNT_ID: 'test', CLOUDFLARE_API_TOKEN: 'secret' };
  const provider = async (url, options) => {
    assert.match(url, /llama-3.2-11b-vision-instruct$/);
    const body = JSON.parse(options.body);
    assert.equal(body.image, input.image);
    assert.match(body.messages[0].content, /verbatim/);
    return Response.json({ success: true, result: { response: JSON.stringify(detected) } });
  };
  assert.equal((await analyzeReference(input, env, provider)).elements.length, 2);
  await assert.rejects(
    analyzeReference({ ...input, image: 'https://example.com' }, env, provider),
    /Upload/,
  );
  await assert.rejects(
    analyzeReference(input, env, async () => new Response('', { status: 429 })),
    /quota/,
  );
  await assert.rejects(
    analyzeReference(input, env, async () =>
      Response.json({ errors: [{ code: 5016 }] }, { status: 403 }),
    ),
    /ai:vision:agree.*--accept-license/,
  );
  await assert.rejects(
    analyzeReference(input, env, async () =>
      Response.json({ success: true, result: { response: 'not JSON' } }),
    ),
    /unreadable/,
  );
});
