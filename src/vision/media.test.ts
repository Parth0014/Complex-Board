import { expect, it } from 'vitest';
import {
  assertPhoto,
  MAX_PHOTO_BYTES,
  mediaAsset,
  referencedMedia,
  type MediaRecord,
} from './media';
import { newBoard } from './document';

const record: MediaRecord = {
  id: `upload:${'a'.repeat(64)}`,
  name: 'home.png',
  original: new Blob(['a'], { type: 'image/png' }),
  working: new Blob(['a'], { type: 'image/png' }),
  width: 100,
  height: 100,
  originalWidth: 100,
  originalHeight: 100,
};
it('collects shared photo references across pages, frame content and backgrounds', () => {
  const asset = mediaAsset(record),
    item = {
      id: 'one',
      kind: 'asset' as const,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      contentAsset: asset,
    };
  const board = {
    ...newBoard(),
    background: asset,
    items: [item],
    pages: [
      { id: 'page', width: 100, height: 100, color: '#ffffff', items: [{ ...item, id: 'two' }] },
    ],
    activePageId: 'page',
  };
  expect([...referencedMedia(board)]).toEqual([record.id]);
  expect(() =>
    referencedMedia({
      ...board,
      background: { ...asset, assetUrl: 'https://example.com/photo.png' },
    }),
  ).toThrow('reference');
});
it('rejects unsupported, empty and oversized photos', () => {
  expect(() => assertPhoto(new Blob(['a'], { type: 'image/svg+xml' }))).toThrow('PNG');
  expect(() => assertPhoto(new Blob([], { type: 'image/png' }))).toThrow('25 MB');
  expect(() =>
    assertPhoto(new Blob([new Uint8Array(MAX_PHOTO_BYTES + 1)], { type: 'image/png' })),
  ).toThrow('25 MB');
});
