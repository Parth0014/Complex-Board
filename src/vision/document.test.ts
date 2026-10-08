import { describe, it, expect, vi } from 'vitest';
import { DocumentHistory } from './document';
import { KonvaCanvasAdapter } from './canvas/KonvaCanvasAdapter';
import { LEGACY_VISION_TEMPLATES as VISION_TEMPLATES } from './templates';
import { curatedPackProvider } from '../assets/curatedPack';
import type { GratitudeAsset } from '../assets/contracts';
const testAsset: GratitudeAsset = {
  id: 'test:image',
  provider: 'curated-v1',
  type: 'sticker',
  title: 'Test image',
  tags: [],
  previewUrl: 'data:image/png;base64,AA==',
  assetUrl: 'data:image/png;base64,AA==',
  license: { tier: 'A', id: 'test', label: 'Test fixture', attributionRequired: false },
  editable: {},
};

describe('document history', () => {
  it('coalesces input previews into one undo command and cancels without losing redo', () => {
    const history = new DocumentHistory(),
      original = history.document;
    history.beginGesture();
    history.commit({ ...original, title: 'Draft 1' });
    history.commit({ ...original, title: 'Draft 2' });
    history.endGesture();
    history.undo();
    expect(history.document).toBe(original);
    history.redo();
    expect(history.document.title).toBe('Draft 2');
    history.undo();
    history.beginGesture();
    history.commit({ ...original, title: 'Cancelled' });
    history.cancelGesture();
    expect(history.document).toBe(original);
    expect(history.canRedo).toBe(true);
  });
  it('undoes and redoes an entire document command', () => {
    const history = new DocumentHistory();
    const original = history.document;
    history.commit({ ...original, title: 'A new chapter', width: 1920, height: 1080 });
    history.undo();
    expect(history.document).toEqual(original);
    history.redo();
    expect(history.document.title).toBe('A new chapter');
    expect(history.document.width).toBe(1920);
  });
  it('invalidates pending async work on undo and clears redo on new edits', () => {
    const history = new DocumentHistory();
    history.commit({ ...history.document, title: 'First' });
    const pendingRevision = history.revision;
    history.undo();
    expect(history.revision).toBeGreaterThan(pendingRevision);
    history.commit({ ...history.document, title: 'Second' });
    expect(history.canRedo).toBe(false);
  });
});

function environment() {
  const pending: Array<{ onload: () => void }> = [];
  class FakeImage {
    onload = () => {};
    onerror = () => {};
    set src(_value: string) {
      pending.push(this);
    }
  }
  const ownerWindow = {
    Image: FakeImage,
    crypto: { randomUUID: () => `item-${Math.random()}` },
  } as unknown as Window & typeof globalThis;
  return { adapter: new KonvaCanvasAdapter(ownerWindow), ownerWindow, pending };
}

describe('adapter commands', () => {
  it('drops an image insertion completed after undo', async () => {
    const { adapter, pending } = environment();
    adapter.createTextPreset({
      id: 'a',
      label: 'a',
      sample: 'Keep me',
      category: 'minimal',
      fontFamily: 'helvetica',
      fontSize: 40,
      color: '#33272b',
    });
    vi.spyOn(curatedPackProvider, 'resolve').mockResolvedValueOnce(testAsset);
    const operation = adapter.insertAsset(testAsset);
    // Attach a rejection handler immediately so the assertion cannot become an
    // unhandled promise if the loader timing changes between Vitest versions.
    const outcome = operation.then(
      () => ({ ok: true as const }),
      (error: unknown) => ({ ok: false as const, error }),
    );
    // Curated assets are lazy-loaded through a dynamic import. Waiting for the
    // actual decode request is deterministic; assuming one microtask is not.
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    adapter.undo();
    pending[0].onload();
    const result = await outcome;
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(Error);
    if (!result.ok) expect((result.error as Error).message).toContain('board changed');
    expect(adapter.history.document.items).toHaveLength(0);
  });
  it('applies each template atomically without accumulating headings', () => {
    const { adapter } = environment();
    adapter.applyTemplate(VISION_TEMPLATES[0]);
    adapter.applyTemplate(VISION_TEMPLATES[1]);
    expect(
      adapter.history.document.items.filter((item) => item.slotId === 'template-heading'),
    ).toHaveLength(1);
    expect(adapter.history.document.items.filter((item) => item.templatePlaceholder)).toHaveLength(
      VISION_TEMPLATES[1].layout.slots.length,
    );
    expect(adapter.history.document.title).toBe(VISION_TEMPLATES[1].title);
    adapter.undo();
    expect(adapter.history.document.title).toBe(VISION_TEMPLATES[0].title);
  });
  it('duplicates with new identity and preserves the background during deletion', () => {
    const { adapter } = environment();
    adapter.applyTemplate(VISION_TEMPLATES[0]);
    // An interior text item tests the ordinary offset without edge clamping.
    adapter.activateTool('text');
    const item = adapter.history.document.items.at(-1)!;
    const before = adapter.history.document.items.length;
    const color = adapter.history.document.color;
    adapter.select([item.id]);
    adapter.duplicateSelection();
    const copy = adapter.history.document.items.at(-1)!;
    expect(copy.id).not.toBe(item.id);
    expect(copy.x).toBe(item.x + 24);
    adapter.clearBoard();
    expect(adapter.history.document.items).toHaveLength(0);
    expect(adapter.history.document.color).toBe(color);
    adapter.undo();
    expect(adapter.history.document.items).toHaveLength(before + 1);
  });
  it('rejects assets outside the uploaded pack', async () => {
    const { adapter } = environment();
    await expect(adapter.insertAsset({ ...testAsset, provider: 'pexels' })).rejects.toThrow(
      'uploaded curated',
    );
  });
});
