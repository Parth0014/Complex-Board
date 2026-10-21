import { describe, expect, it } from 'vitest';
import { studioCutouts, retiredStudioCutouts, approvedCutoutIds } from './studioCutouts';
import { curatedPackProvider } from './curatedPack';
import { elementDropSize } from '../vision/dropPlacement';
import { svgColors } from '../vision/svgColors';

describe('template studio cutouts', () => {
  it('offers the original six and the approved 26 digital objects with stable image sources', () => {
    const digital = studioCutouts.filter((asset) => asset.styles?.includes('digital'));
    expect(digital).toHaveLength(32);
    expect(new Set(digital.map((asset) => asset.id)).size).toBe(32);
    const reviewed = digital.filter((asset) => asset.id.startsWith('studio-cutout:lifestyle-'));
    expect(reviewed).toHaveLength(26);
    expect(reviewed.every((asset) => approvedCutoutIds.includes(asset.id))).toBe(true);
    expect(reviewed.some((asset) => asset.title === 'Diptyque Baies candle')).toBe(true);
    expect(reviewed.some((asset) => /27-|28-|29-|30-/.test(asset.id))).toBe(false);
    for (const asset of digital) {
      expect(asset.title).not.toMatch(/^digital-/);
      expect(asset.mimeType).toBe('image/png');
      expect(asset.tags.some((tag) => tag.includes(' '))).toBe(true);
      expect(asset.assetUrl).toMatch(/\.png(?:\?|$)/);
      expect(asset.editable.colors).toBe(false);
    }
  });
  it('offers varied paper silhouettes with one editable face color and board-safe sizes', () => {
    const pieces = studioCutouts.filter((asset) =>
      asset.id.startsWith('studio-cutout:paper-piece-'),
    );
    expect(pieces).toHaveLength(24);
    expect(
      new Set(pieces.map((asset) => asset.width! / asset.height!)).size,
    ).toBeGreaterThanOrEqual(7);
    for (const piece of pieces) {
      expect(piece.editable.colors).toBe(true);
      expect(svgColors(piece.assetUrl)).toHaveLength(1);
      for (const board of [
        { width: 1080, height: 1920 },
        { width: 1920, height: 1080 },
      ]) {
        const size = elementDropSize(piece, board);
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeLessThan(board.height);
        expect(size.width / size.height).toBeCloseTo(piece.width! / piece.height!);
      }
    }
  });
  it('inserts torn dividers across portrait and landscape pages without stretching their aspect ratio', () => {
    const dividers = studioCutouts.filter((asset) =>
      asset.id.startsWith('studio-cutout:paper-divider-'),
    );
    expect(dividers.length).toBeGreaterThan(0);
    for (const asset of dividers) {
      for (const board of [
        { width: 1080, height: 1920 },
        { width: 1920, height: 1080 },
      ]) {
        const size = elementDropSize(asset, board);
        expect(size.width).toBe(board.width);
        expect(size.width / size.height).toBeCloseTo(asset.width! / asset.height!);
        expect(size.height).toBeLessThan(board.height / 3);
      }
    }
  });
  it('retains saved paper-object IDs without offering them in the library', async () => {
    const result = await curatedPackProvider.search({}, {} as Window & typeof globalThis);
    for (const cutout of retiredStudioCutouts) {
      expect(studioCutouts.some((asset) => asset.id === cutout.id)).toBe(false);
      expect(result.items.some((asset) => asset.id === cutout.id)).toBe(false);
      expect(await curatedPackProvider.resolve(cutout.id, {} as Window & typeof globalThis)).toBe(
        cutout,
      );
    }
  });
  it('keeps unapproved artwork out of the public search while retaining saved-board resolution', async () => {
    const result = await curatedPackProvider.search({}, {} as Window & typeof globalThis);
    for (const cutout of studioCutouts) {
      expect(result.items.some((asset) => asset.id === cutout.id)).toBe(
        approvedCutoutIds.includes(cutout.id),
      );
      expect(await curatedPackProvider.resolve(cutout.id, {} as Window & typeof globalThis)).toBe(
        cutout,
      );
    }
  });

  it('rejects unknown cutout IDs instead of trusting saved asset URLs', async () => {
    await expect(
      curatedPackProvider.resolve('studio-cutout:uninstalled', {} as Window & typeof globalThis),
    ).rejects.toThrow('Unknown vector asset');
  });
});
