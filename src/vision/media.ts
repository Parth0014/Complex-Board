import type { GratitudeAsset } from '../assets/contracts';
import type { BoardDocument } from './document';
import { openBoardStore } from './storage';

export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
const types = new Set(['image/png', 'image/jpeg', 'image/webp']);
export interface MediaRecord {
  id: string;
  name: string;
  original: Blob;
  working: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}
export interface PortableMedia extends Omit<MediaRecord, 'original' | 'working'> {
  original: string;
  working: string;
}
export function assertPhoto(blob: Blob): void {
  if (!types.has(blob.type)) throw new Error('Choose a PNG, JPEG or WebP photo.');
  if (!blob.size || blob.size > MAX_PHOTO_BYTES)
    throw new Error('Each photo must be between 1 byte and 25 MB.');
}
export function referencedMedia(board: BoardDocument): Set<string> {
  const ids = new Set<string>();
  const visit = (page: Pick<BoardDocument, 'items' | 'background'>) => {
    for (const asset of [
      page.background,
      ...page.items.flatMap((item) => [item.asset, item.contentAsset]),
    ]) {
      if (asset?.provider === 'upload') {
        if (
          !asset.mediaId ||
          !/^upload:[a-f0-9]{64}$/.test(asset.mediaId) ||
          asset.id !== asset.mediaId ||
          asset.assetUrl !== `media:${asset.mediaId}`
        )
          throw new Error('Invalid uploaded photo reference.');
        ids.add(asset.mediaId);
      }
    }
  };
  visit(board);
  board.pages?.forEach(visit);
  return ids;
}
export async function loadMedia(
  ownerWindow: Window & typeof globalThis,
  id: string,
): Promise<MediaRecord> {
  const db = await openBoardStore(ownerWindow);
  try {
    const record = await new Promise<MediaRecord | undefined>((resolve, reject) => {
      const request = db.transaction('media', 'readonly').objectStore('media').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!record) throw new Error('This photo is missing. Restore a backup that includes it.');
    return record;
  } finally {
    db.close();
  }
}
export async function saveMedia(
  ownerWindow: Window & typeof globalThis,
  records: MediaRecord[],
): Promise<void> {
  const db = await openBoardStore(ownerWindow);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite'),
        store = tx.objectStore('media');
      for (const record of new Map(records.map((record) => [record.id, record])).values()) {
        const request = store.get(record.id);
        request.onsuccess = () => {
          if (!request.result) store.add(record);
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
async function photoId(ownerWindow: Window & typeof globalThis, original: Blob): Promise<string> {
  const digest = await ownerWindow.crypto.subtle.digest('SHA-256', await original.arrayBuffer());
  return `upload:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}
export async function preparePhoto(
  ownerWindow: Window & typeof globalThis,
  file: File,
): Promise<MediaRecord> {
  assertPhoto(file);
  const bitmap = await ownerWindow.createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 50_000_000 ||
      Math.max(bitmap.width, bitmap.height) > 16000
    )
      throw new Error('Photo dimensions are too large (maximum 50 megapixels).');
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = ownerWindow.document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Photo processing is unavailable in this browser.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const working = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Unable to prepare photo.'))),
        'image/png',
      ),
    );
    assertPhoto(working);
    return {
      id: await photoId(ownerWindow, file),
      name: file.name.slice(0, 200),
      original: file,
      working,
      width: canvas.width,
      height: canvas.height,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}
export function mediaAsset(record: MediaRecord): GratitudeAsset {
  return {
    id: record.id,
    mediaId: record.id,
    provider: 'upload',
    type: 'photo',
    title: record.name,
    tags: [],
    previewUrl: `media:${record.id}`,
    assetUrl: `media:${record.id}`,
    mimeType: record.working.type,
    width: record.width,
    height: record.height,
    license: {
      tier: 'E',
      id: 'user-upload',
      label: 'Your photo — rights remain with its owner',
      attributionRequired: false,
    },
    editable: { crop: true, filters: true },
  };
}
function dataUrl(ownerWindow: Window & typeof globalThis, blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new ownerWindow.FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
export async function portableMedia(
  ownerWindow: Window & typeof globalThis,
  board: BoardDocument,
): Promise<PortableMedia[]> {
  const result: PortableMedia[] = [];
  let size = 0;
  for (const id of referencedMedia(board)) {
    const record = await loadMedia(ownerWindow, id);
    size += record.original.size + record.working.size;
    if (size > MAX_BACKUP_BYTES)
      throw new Error('Photo backup exceeds 100 MB. Use fewer or smaller photos.');
    result.push({
      ...record,
      original: await dataUrl(ownerWindow, record.original),
      working: await dataUrl(ownerWindow, record.working),
    });
  }
  return result;
}
function parseBlob(ownerWindow: Window & typeof globalThis, value: unknown): Blob {
  if (typeof value !== 'string' || value.length > MAX_PHOTO_BYTES * 1.34 + 100)
    throw new Error('Invalid photo in backup.');
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new Error('Invalid photo encoding in backup.');
  const binary = ownerWindow.atob(match[2]);
  const blob = new ownerWindow.Blob(
    [Uint8Array.from(binary, (character) => character.charCodeAt(0))],
    { type: match[1] },
  );
  assertPhoto(blob);
  return blob;
}
export async function parsePortableMedia(
  ownerWindow: Window & typeof globalThis,
  value: unknown,
  board: BoardDocument,
): Promise<MediaRecord[]> {
  const needed = referencedMedia(board);
  if (value === undefined) {
    if (needed.size) throw new Error('Backup is missing its photos.');
    return [];
  }
  if (!Array.isArray(value) || value.length > 200 || value.length !== needed.size)
    throw new Error('Invalid photo list in backup.');
  const result: MediaRecord[] = [],
    seen = new Set<string>();
  let size = 0;
  for (const entry of value) {
    if (
      !entry ||
      typeof entry.id !== 'string' ||
      !needed.has(entry.id) ||
      seen.has(entry.id) ||
      typeof entry.name !== 'string' ||
      entry.name.length > 200
    )
      throw new Error('Invalid photo identity in backup.');
    seen.add(entry.id);
    const original = parseBlob(ownerWindow, entry.original),
      working = parseBlob(ownerWindow, entry.working);
    size += original.size + working.size;
    if (size > MAX_BACKUP_BYTES) throw new Error('Photo backup exceeds 100 MB.');
    if ((await photoId(ownerWindow, original)) !== entry.id)
      throw new Error('Photo checksum does not match its identity.');
    const source = await ownerWindow.createImageBitmap(original, {
      imageOrientation: 'from-image',
    });
    let preview: ImageBitmap | undefined;
    try {
      preview = await ownerWindow.createImageBitmap(working);
      if (
        source.width * source.height > 50_000_000 ||
        Math.max(source.width, source.height) > 16000 ||
        Math.max(preview.width, preview.height) > 2560 ||
        entry.width !== preview.width ||
        entry.height !== preview.height ||
        entry.originalWidth !== source.width ||
        entry.originalHeight !== source.height
      )
        throw new Error('Invalid photo dimensions in backup.');
      result.push({
        id: entry.id,
        name: entry.name,
        original,
        working,
        width: preview.width,
        height: preview.height,
        originalWidth: source.width,
        originalHeight: source.height,
      });
    } finally {
      source.close();
      preview?.close();
    }
  }
  return result;
}
