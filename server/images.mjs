import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
const localSecret = randomBytes(32);
const secret = () =>
  process.env.IMAGE_TOKEN_SECRET || process.env.UNSPLASH_ACCESS_KEY || localSecret;
const cache = new Map();
const keys = () => ({
  unsplash: process.env.UNSPLASH_ACCESS_KEY,
});
export const imageStatus = () =>
  Object.fromEntries(Object.entries(keys()).map(([k, v]) => [k, Boolean(v)]));
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const referral = (value) => {
  const u = new URL(value);
  u.searchParams.set('utm_source', 'visbo');
  u.searchParams.set('utm_medium', 'referral');
  return u.href;
};
async function json(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok)
    throw fail(
      response.status === 429
        ? 'Image search limit reached. Try again shortly.'
        : 'The image provider is unavailable. Check its API key and try again.',
      response.status === 429 ? 429 : 502,
    );
  return response.json();
}
function token(item) {
  const payload = Buffer.from(JSON.stringify({ ...item, expires: Date.now() + 86400000 })).toString(
    'base64url',
  );
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}
export async function searchImages(provider, query, page = 1) {
  if (provider !== 'unsplash') throw fail('Choose an image provider.');
  const key = keys()[provider];
  if (!key) throw fail('Unsplash is not connected. Add its server API key to .env.', 503);
  if (
    typeof query !== 'string' ||
    !query.trim() ||
    query.length > 100 ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100
  )
    throw fail('Enter a search of up to 100 characters.');
  const cacheKey = `${provider}:${query.trim().toLowerCase()}:${page}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  const params = new URLSearchParams({ page: String(page), per_page: '20' });
  params.set('query', query.trim());
  params.set('content_filter', 'high');
  const data = await json(`https://api.unsplash.com/search/photos?${params}`, {
    Authorization: `Client-ID ${key}`,
    'Accept-Version': 'v1',
  });
  const total = data.total;
  const items = data.results.map((x) => ({
    id: x.id,
    provider,
    title: x.alt_description || x.description || 'Photograph',
    thumb: x.urls.small,
    url: x.urls.regular,
    author: x.user.name,
    authorUrl: referral(x.user.links.html),
    source: referral(x.links.html),
    tracking: x.links.download_location,
    width: x.width,
    height: x.height,
  }));
  const value = {
    items: items.map((item) => ({
      ...item,
      token: token(item),
      tracking: undefined,
      url: undefined,
    })),
    hasMore: page * 20 < total,
  };
  for (const [k, v] of cache) if (v.expires < Date.now()) cache.delete(k);
  if (cache.size >= 500) cache.delete(cache.keys().next().value);
  cache.set(cacheKey, { value, expires: Date.now() + 86400000 });
  return value;
}
export async function importImage(signed) {
  if (typeof signed !== 'string' || signed.length > 12000) throw fail('Invalid image selection.');
  const [payload, signature] = signed.split('.');
  const expected = createHmac('sha256', secret())
    .update(payload || '')
    .digest();
  const received = Buffer.from(signature || '', 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    throw fail('Search again to select this image.');
  const item = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (item.expires < Date.now()) throw fail('This search expired. Search again.');
  if (item.provider !== 'unsplash') throw fail('Invalid image source.');
  const url = item.url;
  const tracking = new URL(item.tracking);
  if (tracking.origin !== 'https://api.unsplash.com') throw fail('Invalid image source.');
  await json(tracking.href, {
    Authorization: `Client-ID ${keys().unsplash}`,
    'Accept-Version': 'v1',
  });
  return {
    id: `${item.provider}:${item.id}`,
    externalId: item.id,
    provider: item.provider,
    type: 'photo',
    title: item.title,
    tags: [],
    previewUrl: url,
    assetUrl: url,
    editable: { crop: true, filters: true },
    license: {
      tier: 'E',
      id: item.provider,
      label: 'Unsplash License',
      attributionRequired: true,
      author: item.author,
      authorUrl: item.authorUrl,
      sourceUrl: item.source,
      licenseUrl: 'https://unsplash.com/license',
    },
  };
}
