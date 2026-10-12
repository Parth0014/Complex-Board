import { describe, it, expect } from 'vitest';
import { photoLayout } from './photoLayout';
describe('photo arrangements', () => {
  it('keeps every photo inside landscape, square and portrait boards', () => {
    for (const [width, height] of [
      [1920, 1080],
      [1000, 1000],
      [1080, 1920],
    ])
      for (const style of ['grid', 'hero', 'columns'] as const)
        for (let count = 1; count <= 12; count++) {
          const slots = photoLayout(count, style, width, height);
          expect(slots).toHaveLength(count);
          slots.forEach((slot) => {
            expect(slot.width).toBeGreaterThan(0);
            expect(slot.height).toBeGreaterThan(0);
            expect(slot.x).toBeGreaterThanOrEqual(0);
            expect(slot.y).toBeGreaterThanOrEqual(0);
            expect(slot.x + slot.width).toBeLessThanOrEqual(width);
            expect(slot.y + slot.height).toBeLessThanOrEqual(height);
          });
        }
  });
  it('rejects empty, fractional and excessive selections', () => {
    for (const count of [0, 2.5, 13])
      expect(() => photoLayout(count, 'grid', 1920, 1080)).toThrow();
  });
});
