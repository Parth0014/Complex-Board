import { beforeEach, expect, it, vi } from 'vitest';
import fixture from '../../../tests/fixtures/appearance-v2.json';
import multipage from '../../../tests/fixtures/appearance-multipage-v2.json';
import { KonvaCanvasAdapter } from '../canvas/KonvaCanvasAdapter';
import { listBoards, loadBoard, saveBoard, validateBoard } from '../storage';
import { migrateDocument } from './migration';

vi.mock('../storage', async (original) => ({
  ...(await original<typeof import('../storage')>()),
  loadBoard: vi.fn(),
  saveBoard: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../fonts', async (original) => ({
  ...(await original<typeof import('../fonts')>()),
  loadEditorFonts: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../media', async (original) => ({
  ...(await original<typeof import('../media')>()),
  saveMedia: vi.fn().mockResolvedValue(undefined),
}));

function adapter(clipboard = '') {
  let serial = 0;
  return new KonvaCanvasAdapter({
    crypto: { randomUUID: () => `new-${serial++}` },
    navigator: { clipboard: { readText: vi.fn().mockResolvedValue(clipboard) } },
  } as unknown as Window & typeof globalThis);
}
beforeEach(() => vi.clearAllMocks());

it('normal adapter initialization still reads and saves version 3, with lossless staged migration', async () => {
  vi.mocked(loadBoard).mockResolvedValue(structuredClone(fixture));
  const a = adapter();
  await a.initialize();
  expect(a.saveStatus).toBe('Saved');
  expect(a.history.document.version).toBe(3);
  expect(migrateDocument(a.history.document)).toMatchObject({
    version: 3,
    items: migrateDocument(fixture).items.map((item) => ({
      ...item,
      groupPath: [],
      groupId: undefined,
    })),
  });
  a.select(['solid']);
  a.changeAppearance({ property: 'opacity', value: 0.7 });
  await a.flushSave();
  expect(vi.mocked(saveBoard).mock.calls.at(-1)![1].version).toBe(3);
  expect('appearance' in a.history.document.items[0]).toBe(true);
});

it('backup restoration remains version 3 and preserves the canonical meaning of all styles', async () => {
  const a = adapter();
  await a.restore(JSON.stringify(fixture));
  const restored = migrateDocument(a.history.document);
  expect(restored.items.map((item) => (item.kind === 'asset' ? item : item.appearance))).toEqual(
    migrateDocument(fixture).items.map((item) => (item.kind === 'asset' ? item : item.appearance)),
  );
  expect(a.history.document.version).toBe(3);
  a.undo();
  expect(a.history.document.items).toHaveLength(0);
  a.redo();
  expect(migrateDocument(a.history.document)).toEqual(restored);
});

it('multipage restore preserves archived styles through the existing page extraction', async () => {
  const a = adapter();
  await a.restore(JSON.stringify(multipage));
  expect(a.history.document.items.map((item) => item.id)).toEqual(
    fixture.items.map((item) => item.id),
  );
  const archived = vi.mocked(saveBoard).mock.calls[0][1];
  expect(archived.version).toBe(3);
  expect(archived.items[0].id).toBe('archived');
  expect(migrateDocument(archived).items).toMatchObject(migrateDocument(multipage).pages![1].items);
});

it('system clipboard import retains appearance through validation and identity remapping', async () => {
  const a = adapter(
    JSON.stringify({
      type: 'gratitude-board-selection',
      version: 1,
      depth: 0,
      items: fixture.items,
    }),
  );
  await a.pasteFromSystem();
  expect(a.clipboardStatus).toBe('');
  expect(a.history.document.version).toBe(3);
  const canonical = migrateDocument(a.history.document);
  expect(canonical.items.map((item) => (item.kind === 'asset' ? item : item.appearance))).toEqual(
    migrateDocument(fixture).items.map((item) => (item.kind === 'asset' ? item : item.appearance)),
  );
  expect(canonical.items[0].id).not.toBe(fixture.items[0].id);
});

it('plain-text clipboard import retains the existing textbox creation and migration semantics', async () => {
  const a = adapter('A pasted dream');
  await a.pasteFromSystem();
  expect(a.history.document.items[0]).toMatchObject({
    kind: 'text',
    text: 'A pasted dream',
    appearance: { fill: { paint: { kind: 'solid', color: '#49375e' } } },
  });
  expect(migrateDocument(a.history.document).items[0]).toMatchObject({
    kind: 'text',
    appearance: { fill: { paint: { kind: 'solid', color: '#49375e' } } },
  });
});

it('internal clipboard and duplication preserve appearance and rich-text data without reclassification', () => {
  const a = adapter();
  a.commit(validateBoard(fixture));
  a.select(['rich']);
  a.copySelection();
  a.pasteSelection();
  const copied = a.history.document.items.at(-1)!;
  expect(copied.textRuns).toEqual(fixture.items.find((item) => item.id === 'rich')!.textRuns);
  const migrated = migrateDocument(a.history.document);
  const original = migrated.items.find((item) => item.id === 'rich')!;
  expect(migrated.items.at(-1)).toMatchObject({
    kind: original.kind,
    appearance: 'appearance' in original ? original.appearance : undefined,
  });
  a.duplicateSelection();
  expect(a.history.document.items).toHaveLength(fixture.items.length + 2);
  a.undo();
  expect(a.history.document.items).toHaveLength(fixture.items.length + 1);
});

it.each([false, true])(
  'home library loading preserves styles and reports invalid records (%s)',
  async (invalid) => {
    const written: unknown[] = [];
    const entries = [fixture, invalid ? { ...multipage, title: undefined } : multipage];
    const request: { result?: unknown; onsuccess?: () => void; onerror?: () => void } = {};
    let transaction: { oncomplete?: () => void };
    let index = 0;
    const next = () =>
      queueMicrotask(() => {
        request.result =
          index < entries.length
            ? {
                key: `board-${index}`,
                value: entries[index],
                delete() {},
                continue() {
                  index++;
                  next();
                },
              }
            : null;
        request.onsuccess?.();
        if (!request.result) transaction.oncomplete?.();
      });
    const db = {
      close() {},
      transaction() {
        transaction = {
          abort: vi.fn(),
          objectStore: () => ({
            openCursor() {
              next();
              return request;
            },
            get() {
              const lookup: { result: unknown; onsuccess?: () => void } = { result: undefined };
              queueMicrotask(() => lookup.onsuccess?.());
              return lookup;
            },
            put(value: unknown) {
              written.push(value);
            },
          }),
        } as typeof transaction;
        return transaction;
      },
    };
    const owner = {
      indexedDB: {
        open() {
          const opening: { result: unknown; onsuccess?: () => void } = { result: db };
          queueMicrotask(() => opening.onsuccess?.());
          return opening;
        },
      },
    } as unknown as Window & typeof globalThis;
    if (invalid) {
      await expect(listBoards(owner)).rejects.toThrow('Saved board board-1: Invalid board backup.');
      expect(
        (transaction! as typeof transaction & { abort: () => void }).abort,
      ).toHaveBeenCalledOnce();
      expect(written).toHaveLength(0);
      return;
    }
    const listed = await listBoards(owner);
    expect(listed).toHaveLength(1);
    expect(listed[0].document.version).toBe(3);
    expect(migrateDocument(listed[0].document)).toEqual(migrateDocument(fixture));
    expect(written).toHaveLength(3);
    expect(written[2]).toEqual(multipage);
    for (const [pageIndex, document] of written.slice(0, 2).entries())
      expect(migrateDocument(document).items).toEqual(
        migrateDocument(multipage).pages![pageIndex].items,
      );
  },
);
