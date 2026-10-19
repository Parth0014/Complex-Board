import { interlockingDesigns, interlockingFrames } from './interlockingGeometry';
import { it, expect } from 'vitest';
import { designedCollageItems } from './designedCollages';
import { resolveCollage } from './collageAdjustment';
import { SCRAPBOOK_PHOTO_PLACEHOLDER } from './scrapbookPresets';
import { KonvaCanvasAdapter } from './canvas/KonvaCanvasAdapter';
import { newBoard } from './document';
import { validateBoard } from './storage';
it('saves boundary edits, preserves source proportions and undoes a complete drag', () => {
  const a = new KonvaCanvasAdapter({} as Window & typeof globalThis);
  let serial = 0;
  const items = designedCollageItems(
    'interlocking:moon',
    Array.from({ length: 7 }, (_, i) => ({
      ...SCRAPBOOK_PHOTO_PLACEHOLDER,
      id: `photo-${i}`,
      width: 800,
      height: 1200,
    })),
    1080,
    1920,
    () => `frame-${serial++}`,
  );
  a.commit({ ...newBoard(), width: 1080, height: 1920, items });
  a.select([items[1].id]);
  a.startCollageAdjustment();
  const before = JSON.stringify(a.history.document.items),
    base = a.collageAdjustment!;
  expect(base.result.dividers.some((d) => (d.type as string) === 'sector')).toBe(false);
  const edge = base.result.dividers.find((d) => d.type === 'outer')!;
  a.beginGesture();
  a.moveCollageDivider(base, edge, 0.02);
  a.moveCollageDivider(base, edge, 0.03);
  a.endGesture();
  const after = JSON.stringify(a.history.document.items);
  expect(after).not.toBe(before);
  expect(a.collageAdjustment).toBeTruthy();
  for (const i of a.history.document.items) {
    const c = i.crop!;
    expect((800 * c.width) / (1200 * c.height)).toBeCloseTo(i.width / i.height, 8);
  }
  const saved = validateBoard(JSON.parse(JSON.stringify(a.history.document)));
  expect(resolveCollage(saved.items, items[1].id)).toBeTruthy();
  a.undo();
  expect(JSON.stringify(a.history.document.items)).toBe(before);
  a.redo();
  expect(JSON.stringify(a.history.document.items)).toBe(after);
  a.select([]);
  expect(a.adjustingCollage).toBe(false);
});
it('does not snap individually moved or incomplete collages back into place', () => {
  let serial = 0;
  const items = designedCollageItems(
    'interlocking:tide',
    Array.from({ length: 5 }, (_, i) => ({ ...SCRAPBOOK_PHOTO_PLACEHOLDER, id: `p${i}` })),
    1000,
    1000,
    () => `i${serial++}`,
  );
  expect(resolveCollage(items, items[0].id)).toBeTruthy();
  expect(resolveCollage(items.slice(1), items[1].id)).toBeUndefined();
  items[1] = { ...items[1], x: items[1].x + 30 };
  expect(resolveCollage(items, items[0].id)).toBeUndefined();
});
it('upgrades untouched legacy polygons only on request and keeps the upgrade undoable', () => {
  const a = new KonvaCanvasAdapter({} as Window & typeof globalThis);
  const design = interlockingDesigns.find((d) => d.id === 'heart')!;
  const frames = interlockingFrames(design, 5, 9 / 16);
  let serial = 0;
  const photos = Array.from({ length: 5 }, (_, i) => ({
    ...SCRAPBOOK_PHOTO_PLACEHOLDER,
    id: `p${i}`,
    width: 800,
    height: 1200,
  }));
  const items = designedCollageItems(
    'interlocking:heart',
    photos,
    1080,
    1920,
    () => `old${serial++}`,
  ).map((i, slot) => {
    const f = frames[slot];
    const { collageLayout: unused, ...rest } = i;
    void unused;
    return {
      ...rest,
      x: f.x * 1080,
      y: f.y * 1920,
      width: f.w * 1080,
      height: f.h * 1920,
      scrapbookPhoto: {
        ...i.scrapbookPhoto!,
        width: f.w * 1080,
        height: f.h * 1920,
        clip: f.points.flatMap(([x, y]) => [(100 * (x - f.x)) / f.w, (100 * (y - f.y)) / f.h]),
      },
    };
  });
  a.commit({ ...newBoard(), width: 1080, height: 1920, items });
  a.select([items[1].id]);
  expect(a.canAdjustCollage).toBe(true);
  expect(a.history.document.items[0].collageLayout).toBeUndefined();
  a.startCollageAdjustment();
  expect(a.collageAdjustment).toBeTruthy();
  a.undo();
  expect(a.history.document.items[0].collageLayout).toBeUndefined();
  expect(a.adjustingCollage).toBe(false);
});
it('protects frame geometry in normal mode while allowing photo edits and layout-mode dividers', () => {
  const a = new KonvaCanvasAdapter({} as Window & typeof globalThis);
  let id = 0;
  const items = designedCollageItems(
    'interlocking:tide',
    Array.from({ length: 5 }, (_, i) => ({
      ...SCRAPBOOK_PHOTO_PLACEHOLDER,
      id: `p${i}`,
      width: 800,
      height: 1200,
    })),
    1080,
    1920,
    () => `f${id++}`,
  );
  a.commit({ ...newBoard(), width: 1080, height: 1920, items });
  a.select([items[1].id]);
  const initial = a.history.document.items[1];
  expect(a.isCollageFrame(initial.id)).toBe(true);
  a.patchItems([
    { id: initial.id, patch: { x: 123, y: 345, width: 200, height: 300, rotation: 40 } },
  ]);
  expect(a.history.document.items[1]).toEqual(initial);
  a.patchItems([
    { id: initial.id, patch: { flipX: true, crop: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 } } },
  ]);
  expect(a.history.document.items[1].flipX).toBe(true);
  const base = a.collageAdjustment!,
    edge = base.result.dividers[0];
  a.moveCollageDivider(base, edge, 0.02);
  expect(a.history.document.items[1].x).toBe(initial.x);
  a.startCollageAdjustment();
  a.beginGesture();
  a.moveCollageDivider(base, edge, 0.02);
  a.endGesture();
  expect(a.history.document.items.map((i) => i.width)).not.toEqual(items.map((i) => i.width));
});
it('keeps layout mode when selecting a photo or the complete collage', () => {
  const a = new KonvaCanvasAdapter({} as Window & typeof globalThis);
  let id = 0;
  const items = designedCollageItems(
    'interlocking:moon',
    Array.from({ length: 5 }, (_, i) => ({ ...SCRAPBOOK_PHOTO_PLACEHOLDER, id: `p${i}` })),
    1080,
    1920,
    () => `f${id++}`,
  );
  a.commit({ ...newBoard(), width: 1080, height: 1920, items });
  a.select([items[0].id]);
  a.startCollageAdjustment();
  a.select([items[2].id]);
  expect(a.adjustingCollage).toBe(true);
  expect(a.collageAdjustment).toBeTruthy();
  a.select(items.map((i) => i.id));
  expect(a.adjustingCollage).toBe(true);
  expect(a.selectedIds).toHaveLength(5);
  a.select([]);
  expect(a.adjustingCollage).toBe(false);
});
