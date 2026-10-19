import { describe, expect, it } from 'vitest';
import { authoredCollagesForBoard, authoredItems } from './authoredLayouts';
import { validateBoard } from './storage';
import { newBoard } from './document';
import { SCRAPBOOK_PHOTO_PLACEHOLDER } from './scrapbookPresets';
describe('supplied authored layouts', () => {
  it('uses every selected image exactly once across all presets, sizes and photo counts', () => {
    for (const [width, height] of [
      [1080, 1920],
      [1080, 1080],
      [1920, 1080],
    ])
      for (const count of [1, 2, 3, 5, 8, 12, 20]) {
        const assets = Array.from({ length: count }, (_, index) => ({
          ...SCRAPBOOK_PHOTO_PLACEHOLDER,
          id: `photo-${index}`,
        }));
        for (const preset of authoredCollagesForBoard(width, height, count)) {
          let serial = 0;
          const items = authoredItems(preset.id, assets, width, height, () => `smart-${serial++}`);
          const photos = items.filter((item) => item.scrapbookPhoto);
          expect(preset.slots).toBe(count);
          expect(photos).toHaveLength(count);
          expect(photos.every((p) => !p.templatePlaceholder)).toBe(true);
          expect(new Set(photos.map((p) => p.asset?.id)).size).toBe(count);
          expect(
            photos.every((p) => p.width > 0 && p.height > 0 && p.scrapbookPhoto!.clip!.length >= 6),
          ).toBe(true);
          expect(
            validateBoard(JSON.parse(JSON.stringify({ ...newBoard(), width, height, items })))
              .items,
          ).toEqual(items);
        }
      }
  }, 20000);
  it('exposes all 42 variants in Arrange photos', () =>
    expect(authoredCollagesForBoard(1080, 1920)).toHaveLength(42));
  for (const [width, height] of [
    [1080, 1920],
    [1080, 1080],
    [1920, 1080],
  ])
    it(`preserves native polygon clips and save data at ${width}x${height}`, () => {
      for (const preset of authoredCollagesForBoard(width, height)) {
        let serial = 0;
        const items = authoredItems(
          preset.id,
          [SCRAPBOOK_PHOTO_PLACEHOLDER],
          width,
          height,
          () => `item-${serial++}`,
        );
        const photos = items.filter((i) => i.scrapbookPhoto);
        expect(photos.length).toBeGreaterThan(0);
        expect(photos.every((i) => i.scrapbookPhoto!.clip!.length >= 6)).toBe(true);
        for (const item of items) {
          expect(item.x).toBeGreaterThanOrEqual(0);
          expect(item.y).toBeGreaterThanOrEqual(0);
          expect(item.x + item.width).toBeLessThanOrEqual(width + 1.01);
          expect(item.y + item.height).toBeLessThanOrEqual(height + 1.01);
        }
        expect(
          validateBoard(JSON.parse(JSON.stringify({ ...newBoard(), width, height, items }))).items,
        ).toEqual(items);
        const only = authoredItems(
          preset.id,
          [SCRAPBOOK_PHOTO_PLACEHOLDER],
          width,
          height,
          () => `photo-${serial++}`,
          true,
        );
        expect(only.slice(1).every((i) => i.kind === 'asset')).toBe(true);
        expect(only.filter((i) => i.scrapbookPhoto)).toHaveLength(photos.length);
      }
    });
});
