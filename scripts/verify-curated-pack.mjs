import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const manifest = JSON.parse(
  readFileSync(new URL('../public/curated-v1/manifest.json', import.meta.url)),
);
assert.equal(manifest.assets.length, 250);
assert.equal(new Set(manifest.assets.map((a) => a.id)).size, 250);
assert.equal(manifest.categories.length, 10);
assert.equal(
  manifest.categories.reduce((count, category) => count + category.count, 0),
  250,
);
const files = {};
for (const category of manifest.categories) {
  assert.equal(manifest.assets.filter((a) => a.category === category.id).length, category.count);
  assert.equal(
    readdirSync(new URL(`../public/curated-v1/assets/${category.id}/`, import.meta.url)).length,
    category.count,
  );
}
for (const asset of manifest.assets) {
  assert.equal(asset.provider, 'curated-v1');
  assert.match(asset.file, /^assets\/[a-z-]+\/[a-z0-9-]+\.svg$/);
  const svg = readFileSync(new URL(`../public/curated-v1/${asset.file}`, import.meta.url), 'utf8');
  assert.match(svg, /<svg\b/);
  assert.doesNotMatch(svg, /<script\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']https?:/i);
  files[`../../public/curated-v1/${asset.file}`] = svg;
}
let provider = readFileSync(new URL('../src/assets/curatedPack.ts', import.meta.url), 'utf8');
const sources = readFileSync(new URL('../src/assets/curatedSources.ts', import.meta.url), 'utf8');
assert.ok(sources.includes("import.meta.glob('../../public/curated-v1/assets/**/*.svg'"));
assert.ok(sources.includes('eager: true'));
provider = provider
  .replace(/^import .*;\r?\n/gm, '')
  .replace("await import('./curatedSources')", `{ files: ${JSON.stringify(files)} }`);
provider = `const manifest = ${JSON.stringify(manifest)};\n` + provider;
const { curatedPackProvider } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(provider)).toString('base64')}`
);
let cursor;
const all = [];
do {
  const page = await curatedPackProvider.search({ cursor, limit: 17 });
  all.push(...page.items);
  cursor = page.nextCursor;
} while (cursor);
assert.equal(all.length, 250);
assert.equal(new Set(all.map((a) => a.id)).size, 250);
assert.ok(all.every((asset) => asset.width > 0 && asset.height > 0));
assert.ok(all.some((asset) => asset.type === 'doodle'));
assert.ok(all.some((asset) => asset.type === 'frame' && asset.frameSlot && asset.slotPath));
const contractsSource = readFileSync(
  new URL('../src/assets/contracts.ts', import.meta.url),
  'utf8',
);
const { normalizeGratitudeAsset } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(contractsSource)).toString('base64')}`
);
assert.ok(all.every((asset) => normalizeGratitudeAsset(asset) !== null));
assert.equal((await curatedPackProvider.search({ type: 'photo' })).items.length, 0);
const results = await curatedPackProvider.search({ search: 'gratitude', limit: 250 });
assert.ok(results.items.length > 0);
assert.ok(
  results.items.every((a) => `${a.title} ${a.tags.join(' ')}`.toLowerCase().includes('gratitude')),
);
await assert.rejects(() => curatedPackProvider.resolve('external:asset'));
await assert.rejects(() => curatedPackProvider.search({ cursor: '-1' }));
assert.equal((await curatedPackProvider.resolve(all[0].id)).id, all[0].id);
console.log('PASS: 250 SVGs, 10 categories, safe sources, pagination, search and resolution.');
