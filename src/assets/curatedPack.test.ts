import { describe, expect, it } from 'vitest';
import { curatedAssets, curatedPackProvider } from './curatedPack';
import { ELEMENT_THEMES } from './elementThemes';
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
});
