import { expect, it } from 'vitest';
import { centeredDropPosition, elementDropSize } from './dropPlacement';
import { curatedAssets } from '../../assets/curatedPack';
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

it('sizes curated artwork by role without stretching or exceeding the board', () => {
  for (const board of [
    { width: 1080, height: 1920 },
    { width: 1920, height: 1080 },
    { width: 1080, height: 1080 },
  ]) {
    for (const asset of curatedAssets) {
      const size = elementDropSize(asset, board);
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
      expect(size.width).toBeLessThanOrEqual(board.width * 0.78 + 0.001);
      expect(size.height).toBeLessThanOrEqual(Math.min(board.width, board.height) * 0.46 + 0.001);
      expect(size.width / size.height).toBeCloseTo(asset.width! / asset.height!, 8);
    }
  }
  const board = { width: 1080, height: 1920 };
  const letter = curatedAssets.find((asset) => asset.id.startsWith('vision-svg:letters-bold/'))!;
  const quote = curatedAssets.find((asset) => asset.id.startsWith('vision-svg:affirmations/'))!;
  expect(elementDropSize(quote, board).width).toBeGreaterThan(
    elementDropSize(letter, board).width * 3,
  );
});
