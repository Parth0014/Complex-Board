import { it, expect } from 'vitest';
import { boundsOf, snapMovement, constrainItems, unionBounds } from './geometry';
import { KonvaCanvasAdapter } from './KonvaCanvasAdapter';
import type { BoardItem } from '../document';
const item = (id: string, x: number, y: number): BoardItem => ({
  id,
  kind: 'text',
  text: id,
  x,
  y,
  width: 100,
  height: 80,
  rotation: 0,
  opacity: 1,
});
const setup = () => {
  let serial = 0;
  const adapter = new KonvaCanvasAdapter({
    crypto: { randomUUID: () => `new-${serial++}` },
  } as unknown as Window & typeof globalThis);
  adapter.commit({
    ...adapter.history.document,
    items: [item('a', 100, 100), item('b', 300, 200), item('c', 600, 400)],
  });
  return adapter;
};
it('border and silhouette settings remain independent', () => {
  const adapter = setup();
  adapter.patchItems([{ id: 'a', patch: { stickerWidth: 8, stickerColor: '#ffffff' } }]);
  adapter.patchItems([{ id: 'a', patch: { borderColor: '#ff0000', borderWidth: 12 } }]);
  expect(adapter.history.document.items[0]).toMatchObject({
    borderColor: '#ff0000',
    borderWidth: 12,
    stickerColor: '#ffffff',
    stickerWidth: 8,
  });
});
it('copies a snapshot, remaps pasted groups and restores cut with undo', () => {
  const adapter = setup();
  adapter.select(['a', 'b']);
  adapter.groupSelection();
  const group = adapter.history.document.items[0].groupId;
  adapter.patchItems([{ id: 'a', patch: { bold: true, letterSpacing: 3 } }]);
  adapter.copySelection();
  adapter.patchItems([{ id: 'a', patch: { bold: false } }]);
  adapter.pasteSelection();
  const copies = adapter.history.document.items.slice(3);
  expect(copies[0].bold).toBe(true);
  expect(copies[0].letterSpacing).toBe(3);
  expect(copies[0].groupId).toBe(copies[1].groupId);
  expect(copies[0].groupId).not.toBe(group);
  adapter.cutSelection();
  expect(adapter.history.document.items).toHaveLength(3);
  adapter.undo();
  expect(adapter.history.document.items).toHaveLength(5);
});
it('moves layers one step while preserving selected order and whole groups', () => {
  const adapter = setup();
  adapter.select(['a']);
  adapter.arrangeSelection('forward');
  expect(adapter.history.document.items.map((item) => item.id)).toEqual(['b', 'a', 'c']);
  adapter.arrangeSelection('backward');
  expect(adapter.history.document.items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  adapter.select(['a', 'b']);
  adapter.groupSelection();
  adapter.arrangeSelection('forward');
  expect(adapter.history.document.items.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  adapter.undo();
  expect(adapter.history.document.items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
});
it('copies compatible styles without changing text, geometry or group identity', () => {
  const adapter = setup();
  adapter.select(['a']);
  adapter.patchItems([{ id: 'a', patch: { bold: true, fontSize: 60, opacity: 0.4 } }]);
  adapter.copyStyle();
  adapter.select(['b']);
  adapter.pasteStyle();
  const target = adapter.history.document.items[1];
  expect(target.bold).toBe(true);
  expect(target.fontSize).toBe(60);
  expect(target.opacity).toBe(0.4);
  expect(target.text).toBe('b');
  expect(target.x).toBe(300);
  expect(target.id).toBe('b');
  adapter.undo();
  expect(adapter.history.document.items[1].bold).toBeUndefined();
});
it('preserves nested groups and supports individual edits inside a group', () => {
  const adapter = setup();
  adapter.select(['a', 'b']);
  adapter.groupSelection();
  const inner = adapter.history.document.items[0].groupId;
  adapter.select(['a', 'c']);
  adapter.groupSelection();
  const outer = adapter.history.document.items[0].groupId;
  expect(adapter.history.document.items[0].groupPath).toEqual([outer, inner]);
  adapter.enterGroup('a');
  adapter.select(['a']);
  expect(adapter.selectedIds).toEqual(['a', 'b']);
  adapter.enterGroup('a');
  adapter.select(['a']);
  expect(adapter.selectedIds).toEqual(['a']);
  adapter.patchItems([{ id: 'a', patch: { text: 'Edited child' } }]);
  expect(adapter.history.document.items[0].groupPath).toEqual([outer, inner]);
  adapter.exitGroup();
  adapter.exitGroup();
  adapter.select(['a']);
  expect(adapter.selectedIds).toEqual(['a', 'b', 'c']);
  adapter.duplicateSelection();
  const copies = adapter.history.document.items.slice(3);
  expect(copies[0].groupPath?.[0]).not.toBe(outer);
  expect(copies[0].groupPath?.[1]).not.toBe(inner);
  expect(copies[0].groupPath).toEqual(copies[1].groupPath);
});
it('snaps to page edges and centers with a zoom-aware threshold', () => {
  const snap = snapMovement(
    { x: 4, y: 3, width: 100, height: 80 },
    [],
    { width: 1080, height: 1350 },
    6,
  );
  expect(snap.dx).toBe(-4);
  expect(snap.dy).toBe(-3);
  expect(snap.vertical).toBe(0);
  expect(
    snapMovement({ x: 4, y: 3, width: 100, height: 80 }, [], { width: 1080, height: 1350 }, 2)
      .vertical,
  ).toBeUndefined();
  expect(
    snapMovement({ x: 488, y: 300, width: 100, height: 80 }, [], { width: 1080, height: 1350 }, 6)
      .vertical,
  ).toBe(540);
});
it('snaps against neighboring items and accounts for rotated bounds', () => {
  const rotated = boundsOf({ ...item('a', 100, 100), rotation: 90 });
  expect(rotated.x).toBeCloseTo(20);
  expect(rotated.width).toBeCloseTo(80);
  const snap = snapMovement(
    { x: 202, y: 400, width: 100, height: 80 },
    [{ x: 300, y: 200, width: 100, height: 80 }],
    { width: 1080, height: 1350 },
    6,
  );
  expect(snap.dx).toBe(-2);
  expect(snap.vertical).toBe(300);
});
it('selects whole groups, duplicates with distinct group identity, and undoes grouping', () => {
  const adapter = setup();
  adapter.select(['a', 'b']);
  adapter.groupSelection();
  const original = adapter.history.document.items[0].groupId;
  adapter.select(['a']);
  expect(adapter.selectedIds).toEqual(['a', 'b']);
  adapter.duplicateSelection();
  const copies = adapter.history.document.items.filter((value) =>
    adapter.selectedIds.includes(value.id),
  );
  expect(copies).toHaveLength(2);
  // copies sit directly above the topmost original, not on top of the whole board
  const order = adapter.history.document.items.map((value) => value.id);
  expect(order.indexOf(copies[0].id)).toBe(order.indexOf('b') + 1);
  expect(copies[0].groupId).toBe(copies[1].groupId);
  expect(copies[0].groupId).not.toBe(original);
  adapter.undo();
  expect(adapter.history.document.items).toHaveLength(3);
  adapter.undo();
  expect(adapter.history.document.items[0].groupId).toBeUndefined();
});
it('aligns a single item to its page, distributes selected items, and protects locked alignment', () => {
  const adapter = setup();
  adapter.select(['a']);
  adapter.alignSelection('right');
  expect(adapter.history.document.items[0].x).toBe(980);
  adapter.undo();
  adapter.select(['a', 'b', 'c']);
  adapter.distributeSelection('horizontal');
  expect(adapter.history.document.items[1].x).toBe(350);
  adapter.toggleLock();
  const before = adapter.history.document;
  adapter.alignSelection('left');
  expect(adapter.history.document).toBe(before);
});
it('aligns a group as a unit without collapsing its members', () => {
  const adapter = setup();
  adapter.select(['a', 'b']);
  adapter.groupSelection();
  adapter.alignSelection('left');
  expect(adapter.history.document.items[0].x).toBe(0);
  expect(adapter.history.document.items[1].x).toBe(200);
  expect(adapter.history.document.items[1].y - adapter.history.document.items[0].y).toBe(100);
});
it('keeps rotated groups inside the page and scales oversized groups without breaking their layout', () => {
  const members = [
    { ...item('a', -50, -40), groupId: 'g', rotation: 45 },
    { ...item('b', 1100, 1300), groupId: 'g', rotation: 45 },
  ];
  const constrained = constrainItems(members, { width: 1080, height: 1350 });
  const box = unionBounds(constrained.map(boundsOf));
  expect(box.x).toBeGreaterThanOrEqual(-0.001);
  expect(box.y).toBeGreaterThanOrEqual(-0.001);
  expect(box.x + box.width).toBeLessThanOrEqual(1080.001);
  expect(box.y + box.height).toBeLessThanOrEqual(1350.001);
  expect(constrained[0].groupId).toBe('g');
  expect(constrained[1].groupId).toBe('g');
});
it('constrains numeric edits, nudges, duplicate and page-size changes at the document boundary', () => {
  const adapter = setup();
  adapter.patchItems([{ id: 'a', patch: { x: -500, y: 2000 } }]);
  expect(adapter.history.document.items[0].x).toBe(0);
  expect(adapter.history.document.items[0].y).toBe(
    adapter.history.document.height - adapter.history.document.items[0].height,
  );
  adapter.select(['a']);
  adapter.duplicateSelection();
  const copy = adapter.history.document.items.find((value) => value.id === adapter.selectedIds[0])!;
  expect(copy.y).toBe(adapter.history.document.height - copy.height);
  adapter.commit({ ...adapter.history.document, width: 500, height: 500 });
  for (const value of adapter.history.document.items) {
    const box = boundsOf(value);
    expect(box.x + box.width).toBeLessThanOrEqual(500.001);
    expect(box.y + box.height).toBeLessThanOrEqual(500.001);
  }
});

it('enabling edge snapping preserves off-canvas artwork through unrelated edits and history', () => {
  const adapter = setup();
  adapter.setSnapToEdges(false);
  adapter.patchItems([{ id: 'a', patch: { x: -40 } }]);
  const before = adapter.history.document;
  const revision = adapter.history.revision;
  adapter.setSnapToEdges(true);
  expect(adapter.history.document).toBe(before);
  expect(adapter.history.revision).toBe(revision);
  adapter.patchItems([{ id: 'b', patch: { color: '#ff0000' } }]);
  expect(adapter.history.document.items[0].x).toBe(-40);
  adapter.undo();
  expect(adapter.history.document.items[0].x).toBe(-40);
  adapter.redo();
  expect(adapter.history.document.items[0].x).toBe(-40);
});
it('resizes text bounds without scaling its font or forcing the old height back', () => {
  const adapter = setup();
  adapter.patchItems([{ id: 'a', patch: { fontSize: 20 } }]);
  adapter.resizeObjectBounds('a', 160, 12);
  expect(adapter.history.document.items[0]).toMatchObject({
    width: 160,
    height: 12,
    fontSize: 20,
    fixedBounds: true,
  });
  adapter.patchItems([{ id: 'b', patch: { color: '#ff0000' } }]);
  expect(adapter.history.document.items[0].height).toBe(12);
  adapter.fitObjectBounds('a');
  expect(adapter.history.document.items[0].height).toBeGreaterThan(12);
  expect(adapter.history.document.items[0].fontSize).toBe(20);
});
it('resizes an artwork frame independently and restores it with fit bounds', () => {
  const adapter = setup();
  adapter.patchItems([{ id: 'a', patch: { kind: 'shape', shape: 'rectangle' } }]);
  adapter.resizeObjectBounds('a', 50, 40);
  expect(adapter.history.document.items[0]).toMatchObject({
    width: 50,
    height: 40,
    contentSize: { width: 100, height: 80 },
  });
  adapter.resizeObjectBounds('a', 200, 160);
  expect(adapter.history.document.items[0].contentSize).toEqual({ width: 100, height: 80 });
  adapter.fitObjectBounds('a');
  expect(adapter.history.document.items[0]).toMatchObject({
    width: 100,
    height: 80,
    contentSize: undefined,
  });
});

it('locked patches do not block other items and locked artwork cannot be deleted', () => {
  const adapter = setup();
  adapter.patchItems([{ id: 'a', patch: { locked: true } }]);
  adapter.patchItems([
    { id: 'a', patch: { x: 500, color: '#ff0000' } },
    { id: 'b', patch: { x: 400 } },
  ]);
  expect(adapter.history.document.items[0]).toMatchObject({ x: 100, locked: true });
  expect(adapter.history.document.items[0].color).not.toBe('#ff0000');
  expect(adapter.history.document.items[1].x).toBe(400);
  adapter.delete(['a', 'b']);
  expect(adapter.history.document.items.map((item) => item.id)).toEqual(['a', 'c']);
  adapter.patchItems([{ id: 'a', patch: { locked: false } }]);
  adapter.delete(['a']);
  expect(adapter.history.document.items.map((item) => item.id)).toEqual(['c']);
});
