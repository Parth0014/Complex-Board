import { it, expect } from 'vitest';
import { updateConnectors } from './connectors';
import type { BoardItem } from './document';
it('keeps arrow endpoints attached through movement and releases deleted bindings', () => {
  const a: BoardItem = {
      id: 'a',
      kind: 'shape',
      shape: 'rectangle',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
    },
    b = { ...a, id: 'b', x: 400 },
    arrow: BoardItem = { ...a, id: 'link', shape: 'arrow', connector: { from: 'a', to: 'b' } };
  const initial = updateConnectors([a, b, arrow])[2];
  expect(initial.x).toBe(200);
  expect(initial.width).toBe(200);
  expect(initial.rotation).toBe(0);
  expect(updateConnectors([a, { ...b, x: 500 }, arrow])[2].width).toBe(300);
  expect(updateConnectors([a, arrow])[1].connector).toBeUndefined();
});
