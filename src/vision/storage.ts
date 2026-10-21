import { migrateDocument } from './appearance/migration';
import { appearancePersistenceEnabled, LEGACY_RECOVERY_PREFIX } from './appearance/activation';
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
export async function loadBoard(
  ownerWindow: Window & typeof globalThis,
  key = 'current',
): Promise<unknown> {
  const db = await openBoardStore(ownerWindow);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('boards', 'readonly'),
        request = tx.objectStore('boards').get(key);
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
  key = 'current',
): Promise<void> {
  if (!appearancePersistenceEnabled()) return;
  const canonical = migrateDocument(document);
  const db = await openBoardStore(ownerWindow);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        'boards',
        appearancePersistenceEnabled() ? 'readwrite' : 'readonly',
      );
      const store = tx.objectStore('boards');
      const previous = store.get(key);
      previous.onsuccess = () => {
        // Capture the untouched legacy value before its first canonical write.
        // Both writes share a transaction: recovery failure aborts activation.
        const repairedV3 =
          previous.result?.version === 3 &&
          JSON.stringify(migrateDocument(previous.result)) !== JSON.stringify(previous.result);
        if (previous.result && ([1, 2].includes(previous.result.version) || repairedV3)) {
          const recoveryKey = LEGACY_RECOVERY_PREFIX + (repairedV3 ? 'mixed-v3:' : '') + key;
          const recovery = store.get(recoveryKey);
          recovery.onsuccess = () => {
            if (!recovery.result) store.put(previous.result, recoveryKey);
            store.put({ ...canonical, updatedAt: Date.now() }, key);
          };
        } else store.put({ ...canonical, updatedAt: Date.now() }, key);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export const validateBoard = migrateDocument;

/** Delete only the selected live record; recovery snapshots and shared media remain intact. */
export async function deleteBoard(
  ownerWindow: Window & typeof globalThis,
  key: string,
): Promise<void> {
  const db = await openBoardStore(ownerWindow);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('boards', 'readwrite');
      tx.objectStore('boards').delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function listBoards(
  ownerWindow: Window & typeof globalThis,
  scope: 'boards' | 'template-drafts' = 'boards',
): Promise<{ id: string; document: BoardDocument }[]> {
  const db = await openBoardStore(ownerWindow);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        'boards',
        appearancePersistenceEnabled() ? 'readwrite' : 'readonly',
      );
      const store = tx.objectStore('boards');
      const result: { id: string; document: BoardDocument }[] = [];
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (
          String(cursor.key).startsWith('template-draft:') !== (scope === 'template-drafts') ||
          String(cursor.key).startsWith(LEGACY_RECOVERY_PREFIX) ||
          String(cursor.key).startsWith('trash:')
        ) {
          cursor.continue();
          return;
        }
        let board: BoardDocument;
        try {
          board = validateBoard(cursor.value);
        } catch (error) {
          // Preserve the actual validation failure instead of losing it behind
          // IndexedDB's generic abort. Abort also rolls back any page extraction.
          reject(
            new Error(
              'Saved board ' +
                String(cursor.key) +
                ': ' +
                (error instanceof Error ? error.message : 'Invalid saved document.'),
            ),
          );
          tx.abort();
          return;
        }
        if (board.pages?.length && appearancePersistenceEnabled()) {
          const legacyValue = structuredClone(cursor.value);
          const legacyKey = String(cursor.key);
          const recovery = store.get(LEGACY_RECOVERY_PREFIX + legacyKey);
          recovery.onsuccess = () => {
            if (!recovery.result && [1, 2].includes(legacyValue.version))
              store.put(legacyValue, LEGACY_RECOVERY_PREFIX + legacyKey);
          };
          board.pages.forEach((page, index) => {
            const id = String(cursor.key) + '-page-' + page.id;
            const document = {
              ...board,
              ...page,
              title: board.title + ' · ' + (index + 1),
              pages: undefined,
              activePageId: undefined,
            };
            store.put(document, id);
          });
          cursor.delete();
        } else result.push({ id: String(cursor.key), document: board });
        cursor.continue();
      };
      tx.oncomplete = () =>
        resolve(result.sort((a, b) => (b.document.updatedAt || 0) - (a.document.updatedAt || 0)));
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Atomic, recoverable deletion; shared photo records stay untouched. */
export async function trashBoard(owner: Window & typeof globalThis, id: string, restore = false) {
  const db = await openBoardStore(owner);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('boards', 'readwrite'),
        store = tx.objectStore('boards');
      const from = restore ? 'trash:' + id : id,
        to = restore ? id : 'trash:' + id;
      const request = store.get(from);
      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error('This board is no longer available.'));
          tx.abort();
          return;
        }
        const target = store.get(to);
        target.onsuccess = () => {
          if (target.result) {
            reject(new Error('A board with this ID already exists. Refresh your boards.'));
            tx.abort();
            return;
          }
          store.put(request.result, to);
          store.delete(from);
        };
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('The board could not be moved.'));
    });
  } finally {
    db.close();
  }
}
