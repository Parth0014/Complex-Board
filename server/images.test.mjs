import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchImages, importImage } from './images.mjs';
test('provider search, signed imports, caching and download tracking', async () => {
  const original = globalThis.fetch;
  process.env.UNSPLASH_ACCESS_KEY = 'test';
  let searches = 0,
    tracking = 0;
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    if (u.hostname === 'api.unsplash.com') {
      if (u.pathname.endsWith('/download')) {
        tracking++;
        return Response.json({ url: 'unused' });
      }
      searches++;
      return Response.json({
        total: 21,
        results: [
          {
            id: 'photo',
            alt_description: 'Mountain',
            urls: {
              small: 'https://images.unsplash.com/small',
              regular: 'https://images.unsplash.com/regular',
            },
            user: { name: 'Artist', links: { html: 'https://unsplash.com/@artist' } },
            links: {
              html: 'https://unsplash.com/photos/photo',
              download_location: 'https://api.unsplash.com/photos/photo/download',
            },
            width: 100,
            height: 100,
          },
        ],
      });
    }
    throw new Error('Unexpected provider request.');
  };
  try {
    const results = await searchImages('unsplash', 'mountains', 1);
    assert.equal(results.hasMore, true);
    assert.equal(results.items[0].url, undefined);
    const asset = await importImage(results.items[0].token);
    assert.equal(asset.assetUrl, 'https://images.unsplash.com/regular');
    assert.equal(tracking, 1);
    assert.equal(asset.license.author, 'Artist');
    assert.match(asset.license.authorUrl, /utm_source=visbo/);
    await assert.rejects(importImage(`${results.items[0].token}x`));
    await searchImages('unsplash', 'mountains');
    assert.equal(searches, 1);
    await assert.rejects(searchImages('pixabay', 'forest'));
    await assert.rejects(searchImages('other', 'forest'));
    await assert.rejects(searchImages('unsplash', 'forest', 1.5));
  } finally {
    globalThis.fetch = original;
    delete process.env.UNSPLASH_ACCESS_KEY;
  }
});
