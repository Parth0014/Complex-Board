import { expect, it } from 'vitest';
import { photoRotationTransform } from './crop';
import { newBoard } from './document';
import { validateBoard } from './storage';
import { SCRAPBOOK_PHOTO_PLACEHOLDER } from './scrapbookPresets';

it('keeps every frame corner covered by a proportionally rotated photo', () => {
  for (const [width, height] of [
    [100, 100],
    [100, 300],
    [400, 100],
  ])
    for (const degrees of [-180, -90, -37, 0, 15, 45, 90, 179])
      for (const flip of [false, true]) {
        const t = photoRotationTransform(width, height, degrees, flip);
        expect(Math.abs(t.scaleX)).toBeCloseTo(Math.abs(t.scaleY));
        const angle = (degrees * Math.PI) / 180;
        for (const [x, y] of [
          [0, 0],
          [width, 0],
          [0, height],
          [width, height],
        ]) {
          const dx = x - t.x,
            dy = y - t.y;
          const px = (dx * Math.cos(angle) + dy * Math.sin(angle)) / t.scaleX + t.offsetX;
          const py = (-dx * Math.sin(angle) + dy * Math.cos(angle)) / t.scaleY + t.offsetY;
          expect(px).toBeGreaterThanOrEqual(-0.00001);
          expect(px).toBeLessThanOrEqual(width + 0.00001);
          expect(py).toBeGreaterThanOrEqual(-0.00001);
          expect(py).toBeLessThanOrEqual(height + 0.00001);
        }
      }
});

it('persists image rotation independently from frame rotation', () => {
  const board = {
    ...newBoard(),
    items: [
      {
        id: 'rotated-photo',
        kind: 'asset',
        asset: SCRAPBOOK_PHOTO_PLACEHOLDER,
        x: 100,
        y: 200,
        width: 400,
        height: 500,
        opacity: 1,
        rotation: 12,
        imageRotation: -35,
      },
    ],
  };
  const saved = validateBoard(JSON.parse(JSON.stringify(board)));
  expect(saved.items[0].imageRotation).toBe(-35);
  expect(saved.items[0].rotation).toBe(12);
});
