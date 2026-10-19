import { it, expect, vi } from 'vitest';
import { KonvaCanvasAdapter } from './canvas/KonvaCanvasAdapter';
import { newBoard } from './document';
import { SCRAPBOOK_PHOTO_PLACEHOLDER } from './scrapbookPresets';
it('updates immediately, coalesces a held nudge into one undo, and saves on release', () => {
  const a = new KonvaCanvasAdapter({} as Window & typeof globalThis);
  a.commit({
    ...newBoard(),
    items: [
      {
        id: 'photo',
        kind: 'asset',
        asset: SCRAPBOOK_PHOTO_PLACEHOLDER,
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
      },
    ],
  });
  const save = vi
    .spyOn(a as unknown as { persist(): void }, 'persist')
    .mockImplementation(() => {});
  a.beginKeyboardGesture();
  for (let x = 101; x <= 110; x++) a.patchItems([{ id: 'photo', patch: { x } }]);
  expect(a.history.document.items[0].x).toBe(110);
  expect(save).not.toHaveBeenCalled();
  a.endGesture();
  expect(save).toHaveBeenCalledTimes(1);
  a.undo();
  expect(a.history.document.items[0].x).toBe(100);
  a.redo();
  expect(a.history.document.items[0].x).toBe(110);
});
