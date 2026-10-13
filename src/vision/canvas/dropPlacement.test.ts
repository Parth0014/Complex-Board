import { expect, it } from 'vitest';
import { centeredDropPosition } from './dropPlacement';
import { KonvaCanvasAdapter } from './KonvaCanvasAdapter';

it('centers drops at the pointer and keeps every edge inside the board', () => {
  const size = { width: 200, height: 100 },
    board = { width: 800, height: 600 };
  expect(centeredDropPosition({ x: 350, y: 250 }, size, board)).toEqual({ x: 250, y: 200 });
  expect(centeredDropPosition({ x: 0, y: 0 }, size, board)).toEqual({ x: 0, y: 0 });
  expect(centeredDropPosition({ x: 800, y: 600 }, size, board)).toEqual({ x: 600, y: 500 });
  expect(centeredDropPosition({ x: 20, y: 20 }, { width: 1000, height: 800 }, board)).toEqual({
    x: 0,
    y: 0,
  });
});

it('commits an edge drop as one undoable edit with its original shape dimensions', () => {
  const adapter = new KonvaCanvasAdapter({
    crypto: { randomUUID: () => 'dropped-shape' },
  } as unknown as Window & typeof globalThis);
  const board = adapter.history.document;
  adapter.createShape('cloud', { x: board.width, y: board.height });
  expect(adapter.history.document.items).toHaveLength(1);
  expect(adapter.history.document.items[0]).toMatchObject({
    width: 240,
    height: 156,
    x: board.width - 240,
    y: board.height - 156,
  });
  adapter.undo();
  expect(adapter.history.document.items).toHaveLength(0);
  adapter.redo();
  expect(adapter.history.document.items).toHaveLength(1);
});
