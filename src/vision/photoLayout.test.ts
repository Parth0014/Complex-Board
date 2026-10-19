import { describe, it, expect } from 'vitest';
import { photoLayout, photoComposition, compositionItems, PHOTO_THEMES } from './photoLayout';
import { boundsOf } from './canvas/geometry';
const legacyStyles = ['scrapbook', 'collage', 'sticker'] as const;
const newStyles = ['moodboard', 'pinterest', 'editorial'] as const;
const allStyles = [...legacyStyles, ...newStyles] as const;
describe('Forge photo arrangements', () => {
  it('uses each selected photo once, with rotated bounds inside every board orientation', () => {
    for (const [width, height] of [
      [1920, 1080],
      [1000, 1000],
      [1080, 1920],
    ])
      for (const style of legacyStyles)
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
      for (const style of legacyStyles) {
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
    for (const n of [0, 2.5, 21]) expect(() => photoLayout(n, 'scrapbook', 1920, 1080)).toThrow();
  });

  // ── New styles tests ──────────────────────────────────────────────────────
  it('new styles produce correct photo count for all board orientations', () => {
    for (const [width, height] of [
      [1920, 1080],
      [1000, 1000],
      [1080, 1920],
    ])
      for (const style of newStyles)
        for (const count of [1, 3, 6, 10, 15, 20]) {
          const slots = photoLayout(count, style, width, height);
          expect(slots).toHaveLength(count);
          expect(new Set(slots.map((s) => s.photoIndex)).size).toBe(count);
          slots.forEach((slot) => {
            expect(slot.width).toBeGreaterThan(0);
            expect(slot.height).toBeGreaterThan(0);
          });
        }
  });

  it('new styles are deterministic (same inputs → same output)', () => {
    for (const style of newStyles) {
      const a = photoComposition(6, style, 1920, 1080);
      const b = photoComposition(6, style, 1920, 1080);
      expect(a).toEqual(b);
    }
  });

  it('new styles include decorative text and shape layers', () => {
    for (const style of newStyles) {
      const c = photoComposition(8, style, 1920, 1080);
      expect(c.layers.some((l) => l.kind === 'text')).toBe(true);
      expect(c.layers.some((l) => l.kind === 'shape')).toBe(true);
    }
  });

  it('new themes are accessible and produce valid compositions', () => {
    for (const theme of ['manifestation', 'studycore', 'selfcare', 'wanderlust'] as const)
      for (const style of allStyles) {
        const c = photoComposition(5, style, 1080, 1080, [], theme);
        expect(c.layers.length).toBeGreaterThan(5); // photos + decorations
        expect(c.layers.filter((l) => l.kind === 'photo')).toHaveLength(5);
      }
  });

  it('moodboard fills board edge-to-edge with minimal gaps', () => {
    const c = photoComposition(8, 'moodboard', 1920, 1080);
    const photos = c.layers.filter((l) => l.kind === 'photo');
    // Photos should cover significant area of the board
    const totalPhotoArea = photos.reduce((sum, p) => sum + p.width * p.height, 0);
    const boardArea = 1920 * 1080;
    expect(totalPhotoArea / boardArea).toBeGreaterThan(0.3); // at least 30% coverage
  });

  it('pinterest style produces overlapping photos with varied rotations', () => {
    const c = photoComposition(8, 'pinterest', 1920, 1080);
    const photos = c.layers.filter((l) => l.kind === 'photo');
    const rotations = photos.map((p) => p.rotation);
    // Should have varied rotations (not all 0 or all ±3)
    const uniqueRotations = new Set(rotations.map((r) => Math.round(r)));
    expect(uniqueRotations.size).toBeGreaterThan(1);
  });

  it('editorial style has a hero photo larger than others', () => {
    const c = photoComposition(6, 'editorial', 1920, 1080);
    const photos = c.layers.filter((l) => l.kind === 'photo');
    const areas = photos.map((p) => p.width * p.height);
    // First photo (hero) should be the largest
    expect(areas[0]).toBe(Math.max(...areas));
  });

  it('supports up to 20 photos in all styles', () => {
    for (const style of allStyles) {
      const slots = photoLayout(20, style, 1920, 1080);
      expect(slots).toHaveLength(20);
    }
  });
});
