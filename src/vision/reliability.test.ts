import { it, expect, vi } from 'vitest';
import { KonvaCanvasAdapter } from './canvas/KonvaCanvasAdapter';
import { newBoard } from './document';
import { designedCollageItems } from './designedCollages';
import { SCRAPBOOK_PHOTO_PLACEHOLDER } from './scrapbookPresets';
import { resolveCollage } from './collageAdjustment';
const fixture = () => {
  let serial = 0;
  const a = new KonvaCanvasAdapter({
    crypto: { randomUUID: () => `copy-${serial++}` },
  } as unknown as Window & typeof globalThis);
  const items = designedCollageItems(
    'interlocking:moon',
    Array.from({ length: 5 }, (_, i) => ({ ...SCRAPBOOK_PHOTO_PLACEHOLDER, id: `p${i}` })),
    1080,
    1920,
    () => `item-${serial++}`,
  );
  a.commit({ ...newBoard(), width: 1080, height: 1920, items });
  return { a, items };
};
it('flushing a held keyboard edit saves the current document', async () => {
  const { a, items } = fixture();
  a.commit({
    ...a.history.document,
    items: [
      ...items,
      {
        ...items[0],
        id: 'free-photo',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        collageLayout: undefined,
        scrapbookPhoto: undefined,
      },
    ],
  });
  const save = vi
    .spyOn(a as unknown as { persist(): void }, 'persist')
    .mockImplementation(() => {});
  a.beginKeyboardGesture();
  a.patchItems([{ id: 'free-photo', patch: { x: 130 } }]);
  await a.flushSave();
  expect(a.history.document.items.at(-1)?.x).toBe(130);
  expect(save).toHaveBeenCalledTimes(1);
  expect(a.history.gestureActive).toBe(false);
  a.undo();
  expect(a.history.document.items.at(-1)?.x).toBe(100);
});
it('duplicating one collage photo does not invalidate the original layout', () => {
  const { a, items } = fixture();
  a.select([items[0].id]);
  a.duplicateSelection();
  expect(resolveCollage(a.history.document.items, items[0].id)).toBeTruthy();
  expect(
    a.history.document.items.find((i) => a.selectedIds.includes(i.id))?.collageLayout,
  ).toBeUndefined();
});
it.each(['duplicate', 'paste'])(
  'copying a complete collage via %s gives it an independent editable layout',
  (mode) => {
    const { a, items } = fixture();
    a.select(items.map((i) => i.id));
    if (mode === 'paste') {
      a.copySelection();
      a.pasteSelection();
    } else a.duplicateSelection();
    const source = resolveCollage(a.history.document.items, items[0].id),
      copy = resolveCollage(a.history.document.items, a.selectedIds[0]);
    expect(source).toBeTruthy();
    expect(copy).toBeTruthy();
    expect(copy?.meta.group).not.toBe(source?.meta.group);
  },
);
