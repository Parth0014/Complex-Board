import { describe, expect, it } from 'vitest';
import { curatedAssets, curatedPackProvider } from './curatedPack';
import { ELEMENT_THEMES } from './elementThemes';
import elementTopics from './elementTopics.json';
describe('user supplied SVG library', () => {
  it('includes every SVG and excludes raster media', () => {
    expect(curatedAssets).toHaveLength(330);
    expect(new Set(curatedAssets.map((asset) => asset.id)).size).toBe(330);
    expect(
      curatedAssets.every(
        (asset) =>
          asset.mimeType === 'image/svg+xml' &&
          asset.assetUrl.startsWith('data:image/svg+xml;') &&
          !asset.editable.colors &&
          !asset.editable.stroke &&
          !asset.editable.crop &&
          !asset.editable.filters,
      ),
    ).toBe(true);
  });
  it('excludes removed icons and stickers from the app catalog', () => {
    expect(curatedAssets.some((asset) => /^vision-svg:(icons|stickers)\//.test(asset.id))).toBe(
      false,
    );
  });
  it('searches across categories and paginates without losing assets', async () => {
    const page = await curatedPackProvider.search(
      { search: 'make memories' },
      {} as Window & typeof globalThis,
    );
    expect(page.items.map((asset) => asset.id)).toEqual(['vision-svg:phrases/make-memories']);
    const first = await curatedPackProvider.search(
      { limit: 250 },
      {} as Window & typeof globalThis,
    );
    const next = await curatedPackProvider.search(
      { cursor: first.nextCursor, limit: 250 },
      {} as Window & typeof globalThis,
    );
    expect([...first.items, ...next.items]).toHaveLength(330);
    expect(next.nextCursor).toBeUndefined();
  });
  it('organizes every asset into readable themes while preserving saved asset IDs', () => {
    const themes = new Set<string>(ELEMENT_THEMES.map((theme) => theme.id));
    expect(
      curatedAssets.every(
        (asset) => asset.topics?.length && asset.topics.every((topic) => themes.has(topic)),
      ),
    ).toBe(true);
    const body = curatedAssets.find(
      (asset) => asset.id === 'vision-svg:affirmations/health-love-calm-01',
    );
    expect(body?.title).toBe('I take care of my body, gently.');
    expect(body?.topics).toContain('health');
    const love = curatedAssets.find(
      (asset) => asset.id === 'vision-svg:affirmations/health-love-calm-06',
    );
    expect(love?.topics).toContain('love');
    expect(love?.topics).not.toContain('health');
  });
  it('finds themes and artwork wording regardless of case', async () => {
    const page = await curatedPackProvider.search(
      { search: 'BODY, GENTLY' },
      {} as Window & typeof globalThis,
    );
    expect(page.items.map((asset) => asset.id)).toContain(
      'vision-svg:affirmations/health-love-calm-01',
    );
  });
  it('rejects uninstalled artwork', async () => {
    await expect(
      curatedPackProvider.resolve('unknown', {} as Window & typeof globalThis),
    ).rejects.toThrow('Unknown vector asset');
  });
  it('has a reviewed assignment for every installed element and no retired entries', () => {
    expect(Object.keys(elementTopics).sort()).toEqual(
      curatedAssets.map((asset) => asset.id.replace('vision-svg:', '')).sort(),
    );
    for (const asset of curatedAssets) {
      expect(asset.topics?.[0]).toBe(asset.category);
      expect(new Set(asset.topics).size).toBe(asset.topics?.length);
    }
    const sections = ELEMENT_THEMES.flatMap((theme) =>
      curatedAssets.filter((asset) => asset.category === theme.id),
    );
    expect(sections).toHaveLength(curatedAssets.length);
    expect(new Set(sections.map((asset) => asset.id)).size).toBe(curatedAssets.length);
  });
  it.each([
    ['affirmations/self-love-growth-02', ['growth']],
    ['affirmations/work-money-01', ['career']],
    ['affirmations/work-money-03', ['money']],
    ['affirmations/work-money-05', ['money']],
    ['affirmations/work-money-06', ['career']],
    ['bubbles/worth-it', ['growth']],
    ['phrases/read-more-books', ['growth']],
    ['phrases/dream-job', ['career', 'planning']],
    ['gratitude-notes/a-place-i-love', ['joy']],
    ['letters-bold/excl', ['creative']],
    ['patterns/hearts-pink', ['creative', 'love']],
    ['patterns/clouds-sky', ['creative', 'nature']],
    ['life-areas/torn-faith', ['faith']],
  ])('classifies %s by its meaning instead of loose keywords', (id, topics) => {
    expect(curatedAssets.find((asset) => asset.id === 'vision-svg:' + id)?.topics).toEqual(topics);
  });
});
