import { it, expect } from 'vitest';
import { snapResize } from './geometry';
it('snaps the dragged resize edge and preserves the opposite anchor and ratio', () => {
  const snap = snapResize(
    { x: 10, y: 20, width: 87, height: 40 },
    'bottom-right',
    [],
    { width: 100, height: 200 },
    6,
    true,
  );
  expect(snap.box.x).toBe(10);
  expect(snap.box.width).toBe(90);
  expect(snap.box.width / snap.box.height).toBeCloseTo(87 / 40);
  expect(snap.vertical).toBe(100);
  const left = snapResize(
    { x: 3, y: 20, width: 87, height: 40 },
    'middle-left',
    [],
    { width: 100, height: 200 },
    6,
    false,
  );
  expect(left.box.x).toBe(0);
  expect(left.box.x + left.box.width).toBe(90);
});
