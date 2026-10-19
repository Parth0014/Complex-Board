import { expect, it, vi } from 'vitest';
import type { GratitudeAsset } from '../../assets/contracts';
import { KonvaCanvasAdapter } from './KonvaCanvasAdapter';

const photo: GratitudeAsset = {
  id: 'unsplash:test',
  provider: 'unsplash',
  type: 'photo',
  title: 'Test photo',
  tags: [],
  assetUrl: 'https://images.unsplash.com/test',
  previewUrl: 'https://images.unsplash.com/test',
  license: { tier: 'A', id: 'unsplash', label: 'Unsplash', attributionRequired: true },
  editable: { crop: true },
};
function setup(frame = false) {
  const adapter = new KonvaCanvasAdapter({
    crypto: { randomUUID: () => 'test-id' },
  } as unknown as Window & typeof globalThis);
  Object.defineProperty(adapter, 'decode', { value: vi.fn(async () => {}) });
  adapter.history.commit({
    ...adapter.history.document,
    items: [
      {
        id: 'target',
        kind: 'asset',
        x: 25,
        y: 40,
        width: 200,
        height: 300,
        rotation: 15,
        opacity: 0.8,
        asset: { ...photo, id: 'old', frameSlot: frame },
        templatePlaceholder: true,
        scrapbookPhoto: {
          width: 200,
          height: 300,
          style: 'raw',
          colors: [],
          clip: [0, 0, 100, 0, 100, 100],
        },
      },
    ],
  });
  return adapter;
}
it.each([false, true])(
  'replaces only photo content, preserves frame geometry, and undoes once (frame=%s)',
  async (frame) => {
    const adapter = setup(frame);
    const before = adapter.history.document;
    await adapter.replaceImageAsset('target', photo);
    const item = adapter.history.document.items[0];
    expect(adapter.history.document.items).toHaveLength(1);
    expect(item).toMatchObject({
      id: 'target',
      x: 25,
      y: 40,
      width: 200,
      height: 300,
      rotation: 15,
      opacity: 0.8,
      templatePlaceholder: false,
      scrapbookPhoto: before.items[0].scrapbookPhoto,
    });
    expect(frame ? item.contentAsset?.id : item.asset?.id).toBe(photo.id);
    if (frame) expect(item.asset).toEqual(before.items[0].asset);
    adapter.history.undo();
    expect(adapter.history.document).toEqual(before);
  },
);
it('rejects a stale or locked replacement without adding an object', async () => {
  const adapter = setup();
  adapter.history.commit({
    ...adapter.history.document,
    items: adapter.history.document.items.map((item) => ({ ...item, locked: true })),
  });
  const before = adapter.history.document;
  await expect(adapter.replaceImageAsset('target', photo)).rejects.toThrow('no longer available');
  await expect(adapter.replaceImageAsset('missing', photo)).rejects.toThrow('no longer available');
  expect(adapter.history.document).toBe(before);
});
