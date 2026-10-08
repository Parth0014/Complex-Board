import { describe, expect, it } from 'vitest';
import { curatedAssets, curatedPackProvider } from './curatedPack';
describe('user supplied SVG library', () => {
  it('includes every SVG and excludes raster media', () => {
    expect(curatedAssets).toHaveLength(442);
    expect(new Set(curatedAssets.map((asset) => asset.id)).size).toBe(442);
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
    expect([...first.items, ...next.items]).toHaveLength(442);
    expect(next.nextCursor).toBeUndefined();
  });
  it('rejects uninstalled artwork', async () => {
    await expect(
      curatedPackProvider.resolve('unknown', {} as Window & typeof globalThis),
    ).rejects.toThrow('Unknown vector asset');
  });
});
