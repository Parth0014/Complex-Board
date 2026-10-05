import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateAI } from './ai.mjs';
const env = { CLOUDFLARE_ACCOUNT_ID: 'test-account', CLOUDFLARE_API_TOKEN: 'test-token' };
test('requires configuration, validates inputs and handles quotas', async () => {
  await assert.rejects(generateAI({ prompt: 'Dream' }, {}), /not configured/);
  await assert.rejects(generateAI({ prompt: '', mode: 'image' }, env), /prompt/);
  await assert.rejects(
    generateAI({ prompt: 'Dream' }, env, async () => new Response('', { status: 429 })),
    /quota/,
  );
});
test('sends credentials only upstream and requests a four-step image', async () => {
  const result = await generateAI({ prompt: 'Dream garden' }, env, async (url, options) => {
    assert.match(url, /flux-1-schnell$/);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.equal(JSON.parse(options.body).steps, 4);
    return Response.json({ success: true, result: { image: 'abcd' } });
  });
  assert.equal(result.image, 'data:image/jpeg;base64,abcd');
  assert.equal('token' in result, false);
});
test('validates AI board JSON rather than executing arbitrary output', async () => {
  const bad = async () => Response.json({ success: true, result: { response: 'not JSON' } });
  await assert.rejects(generateAI({ prompt: 'Dream', mode: 'board' }, env, bad), /invalid board/);
  const good = async () =>
    Response.json({ success: true, result: { response: '{"title":"Dream","goals":["Grow"]}' } });
  assert.deepEqual((await generateAI({ prompt: 'Dream', mode: 'board' }, env, good)).goals, [
    'Grow',
  ]);
});
test('limits semantic search to validated keywords', async () => {
  const result = await generateAI({ prompt: 'I want to explore', mode: 'search' }, env, async () =>
    Response.json({ success: true, result: { response: '{"keywords":["travel","adventure"]}' } }),
  );
  assert.deepEqual(result.keywords, ['travel', 'adventure']);
  await assert.rejects(
    generateAI({ prompt: 'Explore', mode: 'search' }, env, async () =>
      Response.json({ success: true, result: { response: '{"keywords":[123]}' } }),
    ),
    /Invalid search/,
  );
});
