import type { BoardDocument } from './document';

export function openBoardStore(ownerWindow: Window & typeof globalThis): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = ownerWindow.indexedDB.open('gratitude-studio-v1', 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('boards'))
        request.result.createObjectStore('boards');
      if (!request.result.objectStoreNames.contains('media'))
        request.result.createObjectStore('media', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadBoard(ownerWindow: Window & typeof globalThis): Promise<unknown> {
  const db = await openBoardStore(ownerWindow);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('boards', 'readonly'),
        request = tx.objectStore('boards').get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export async function saveBoard(
  ownerWindow: Window & typeof globalThis,
  document: BoardDocument,
): Promise<void> {
  const db = await openBoardStore(ownerWindow);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('boards', 'readwrite');
      tx.objectStore('boards').put(document, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export function validateBoard(value: unknown): BoardDocument {
  const board = value as BoardDocument;
  if (
    !board ||
    ![1, 2].includes((value as { version: number }).version) ||
    typeof board.title !== 'string' ||
    !Number.isFinite(board.width) ||
    board.width < 100 ||
    board.width > 10000 ||
    !Number.isFinite(board.height) ||
    board.height < 100 ||
    board.height > 10000 ||
    !/^#[\da-f]{6}$/i.test(board.color) ||
    !Array.isArray(board.items) ||
    board.items.length > 2000
  )
    throw new Error('Invalid board backup.');
  const ids = new Set<string>(),
    parents = new Map<string, string>();
  if (board.pages) {
    if (
      !Array.isArray(board.pages) ||
      board.pages.length > 30 ||
      !board.pages.length ||
      new Set(board.pages.map((page) => page.id)).size !== board.pages.length ||
      !board.pages.some((page) => page.id === board.activePageId)
    )
      throw new Error('Invalid pages.');
    for (const page of board.pages) {
      if (typeof page.id !== 'string') throw new Error('Invalid page.');
      validateBoard({ ...page, title: board.title, version: 2, pages: undefined });
    }
  }
  for (const item of board.items) {
    if (
      !item ||
      typeof item.id !== 'string' ||
      ids.has(item.id) ||
      !['text', 'asset', 'shape', 'drawing'].includes(item.kind) ||
      ![item.x, item.y, item.width, item.height, item.rotation, item.opacity].every(
        Number.isFinite,
      ) ||
      item.width <= 0 ||
      item.height <= 0 ||
      item.width > 10000 ||
      item.height > 10000 ||
      Math.abs(item.x) > 100000 ||
      Math.abs(item.y) > 100000 ||
      item.opacity < 0 ||
      item.opacity > 1
    )
      throw new Error('Invalid item geometry in backup.');
    if (
      item.contentSize &&
      (![item.contentSize.width, item.contentSize.height].every(Number.isFinite) ||
        item.contentSize.width <= 0 ||
        item.contentSize.height <= 0 ||
        item.contentSize.width > 10000 ||
        item.contentSize.height > 10000)
    )
      throw new Error('Invalid content dimensions.');
    ids.add(item.id);
    if (
      item.textRuns &&
      (!Array.isArray(item.textRuns) ||
        item.textRuns.length > 5000 ||
        item.textRuns.some(
          (run) =>
            !Number.isInteger(run.start) ||
            !Number.isInteger(run.end) ||
            run.start < 0 ||
            run.end <= run.start ||
            run.end > (item.text?.length || 0) ||
            (run.script && !['normal', 'super', 'sub'].includes(run.script)),
        ))
    )
      throw new Error('Invalid text formatting.');
    if (
      item.frameShape &&
      !['circle', 'heart', 'triangle', 'hexagon', 'star', 'cloud'].includes(item.frameShape)
    )
      throw new Error('Invalid shape frame.');
    if (
      item.groupPath &&
      (!Array.isArray(item.groupPath) ||
        item.groupPath.length > 20 ||
        item.groupPath.some((id) => typeof id !== 'string') ||
        new Set(item.groupPath).size !== item.groupPath.length)
    )
      throw new Error('Invalid group hierarchy.');
    const path = item.groupPath || (item.groupId ? [item.groupId] : []);
    for (let index = 0; index < path.length; index++) {
      const parent = path.slice(0, index).join('/');
      if (parents.has(path[index]) && parents.get(path[index]) !== parent)
        throw new Error('Group has multiple parents.');
      parents.set(path[index], parent);
    }
    for (const key of [
      'fontSize',
      'letterSpacing',
      'lineHeight',
      'radius',
      'borderWidth',
      'stickerWidth',
      'brightness',
      'contrast',
      'saturation',
      'blur',
      'strokeWidth',
      'curve',
      'fontWeight',
      'warmth',
      'tint',
      'shadowOpacity',
      'shadowBlur',
      'shadowOffsetX',
      'shadowOffsetY',
    ] as const) {
      if (item[key] !== undefined && (!Number.isFinite(item[key]) || Math.abs(item[key]!) > 10000))
        throw new Error('Invalid style measurement.');
    }
    if (
      item.crop &&
      (![item.crop.x, item.crop.y, item.crop.width, item.crop.height].every(Number.isFinite) ||
        item.crop.x < 0 ||
        item.crop.y < 0 ||
        item.crop.width <= 0 ||
        item.crop.height <= 0 ||
        item.crop.x + item.crop.width > 1.0001 ||
        item.crop.y + item.crop.height > 1.0001)
    )
      throw new Error('Invalid crop.');
    if (
      item.points &&
      (!Array.isArray(item.points) ||
        item.points.length > 100000 ||
        !item.points.every(Number.isFinite))
    )
      throw new Error('Invalid drawing.');
  }
  for (const item of board.items)
    if (
      item.connector &&
      (item.kind !== 'shape' ||
        item.shape !== 'arrow' ||
        !ids.has(item.connector.from) ||
        !ids.has(item.connector.to) ||
        item.connector.from === item.id ||
        item.connector.to === item.id ||
        item.connector.from === item.connector.to)
    )
      throw new Error('Invalid connector binding.');
  return { ...structuredClone(board), version: 2 };
}
