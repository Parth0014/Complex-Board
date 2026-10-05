import { it, expect } from 'vitest';
import { dragCrop } from './crop';
it('uses local rotated/flipped coordinates and clamps the source viewport', () => {
  const crop = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
    item = { width: 100, height: 100, rotation: 90 };
  expect(dragCrop(crop, item, 0, 20, 1).x).toBeCloseTo(0.15);
  expect(dragCrop(crop, { ...item, flipX: true }, 0, 20, 1).x).toBeCloseTo(0.35);
  expect(dragCrop(crop, item, 0, 2000, 1).x).toBe(0);
  expect(dragCrop(crop, item, 0, 10, 0.5)).toEqual(dragCrop(crop, item, 0, 20, 1));
});
