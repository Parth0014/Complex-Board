import { describe, it, expect } from 'vitest';
import { photoLayout, photoComposition, compositionItems, PHOTO_THEMES } from './photoLayout';
import { boundsOf } from './canvas/geometry';
const styles = ['scrapbook', 'collage', 'sticker'] as const;
describe('Forge photo arrangements', () => {
  it('uses each selected photo once, with rotated bounds inside every board orientation', () => {
    for (const [width, height] of [
      [1920, 1080],
      [1000, 1000],
      [1080, 1920],
    ])
      for (const style of styles)
        for (let count = 1; count <= 12; count++) {
          const slots = photoLayout(count, style, width, height, [0.65, 1.9, 0.8, 1.6, 1.3, 0.7]);
          expect(slots).toHaveLength(count);
          expect(new Set(slots.map((s) => s.photoIndex)).size).toBe(count);
          slots.forEach((slot) => {
            expect(slot.width).toBeGreaterThan(0);
            expect(slot.height).toBeGreaterThan(0);
            const b = boundsOf(slot);
            expect(b.x).toBeGreaterThanOrEqual(0);
            expect(b.y).toBeGreaterThanOrEqual(0);
            expect(b.x + b.width).toBeLessThanOrEqual(width + 0.01);
            expect(b.y + b.height).toBeLessThanOrEqual(height + 0.01);
          });
        }
  });
  it('preserves mixed photo proportions in the two framed styles', () => {
    const ratios = [0.65, 1.9, 0.8, 1.6, 1.3, 0.7];
    for (const style of ['scrapbook', 'sticker'] as const)
      photoLayout(6, style, 1920, 1080, ratios).forEach((slot, i) =>
        expect(slot.width / slot.height).toBeCloseTo(ratios[i], 8),
      );
  });
  it('uses the supplied theme copy and produces editable native decorations', () => {
    for (const theme of ['vision2027', 'travel', 'diaries'] as const)
      for (const style of styles) {
        const c = photoComposition(6, style, 1080, 1920, [], theme);
        expect(
          c.layers
            .filter((l) => l.kind === 'text')
            .map((l) => l.text)
            .join(' '),
        ).toContain(PHOTO_THEMES[theme].copy.quotes[0].replace(/\n/g, ' '));
        expect(c.layers.some((l) => l.kind === 'shape')).toBe(true);
      }
  });
  it('keeps previews deterministic and does not reuse photo indices when materializing', () => {
    const c = photoComposition(6, 'scrapbook', 1080, 1920);
    expect(c).toEqual(photoComposition(6, 'scrapbook', 1080, 1920));
    let serial = 0;
    const assets = Array.from({ length: 6 }, (_, i) => ({ id: `photo-${i}` }));
    const items = compositionItems(
      c,
      assets as Parameters<typeof compositionItems>[1],
      () => `item-${serial++}`,
    );
    expect(items.filter((i) => i.kind === 'asset').map((i) => i.asset?.id)).toEqual(
      assets.map((a) => a.id),
    );
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it('rejects empty, fractional and excessive photo counts', () => {
    for (const n of [0, 2.5, 13]) expect(() => photoLayout(n, 'scrapbook', 1920, 1080)).toThrow();
  });
});
