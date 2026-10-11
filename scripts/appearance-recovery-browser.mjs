/** Offline rollback boundary only. Never imported by the editor or used for dual writes. */
export function recoverLegacyBackup(input) {
  const board = structuredClone(input);
  if (board.version !== 3 || !Array.isArray(board.items))
    throw new Error('Expected a canonical version 3 backup. Keep the original file.');
  const convert = (item) => {
    if (item.kind === 'asset') return item;
    const { appearance: a, ...data } = item;
    if (!a || a.version !== 1) throw new Error(`Invalid appearance: ${item.id}`);
    const open = a.kind === 'drawing' || a.kind === 'open-shape';
    const fixed =
      item.kind === 'shape' &&
      ((item.vectorPath && item.vectorBox) ||
        ['triangle', 'star', 'burst', 'heart', 'cloud', 'blob'].includes(item.shape));
    if (
      a.stroke.scaling !== (fixed ? 'fixed' : 'transform') ||
      a.stroke.cap !== (open ? 'round' : 'butt') ||
      a.stroke.join !== (open || item.kind === 'text' ? 'round' : 'miter')
    )
      throw new Error(
        `Legacy renderer cannot represent stroke semantics on ${item.id}. Retain the v3 backup.`,
      );
    if (open && a.stroke.width === 0)
      throw new Error(`Legacy open paths cannot represent zero stroke width on ${item.id}.`);
    if (a.kind === 'open-shape' && a.shadow.enabled)
      throw new Error(`Legacy line/arrow cannot render shadows on ${item.id}.`);
    const paint = a.fill?.paint;
    if (paint?.kind !== 'solid' && item.textRuns?.some((run) => run.color !== undefined))
      throw new Error(
        `Legacy rich-text gradients ignore character colors on ${item.id}. Retain the v3 backup.`,
      );
    return {
      ...data,
      opacity: a.opacity,
      effect: a.effect,
      color: paint ? (paint.kind === 'solid' ? paint.color : paint.stops[0]) : a.stroke.color,
      ...(paint
        ? {
            noFill: !a.fill.enabled,
            ...(paint.kind === 'solid'
              ? {}
              : { gradient: paint.stops[1], gradientType: paint.kind }),
          }
        : {}),
      ...(item.kind === 'text' ? { textBackground: a.background || undefined } : {}),
      borderWidth: a.stroke.width,
      borderColor: a.stroke.color,
      borderStyle: a.stroke.style,
      ...(a.kind === 'drawing' ? { strokeWidth: a.stroke.width } : {}),
      shadow: a.shadow.enabled ? 'soft' : 'none',
      shadowColor: a.shadow.color,
      shadowOpacity: a.shadow.opacity,
      shadowBlur: a.shadow.blur,
      shadowOffsetX: a.shadow.offsetX,
      shadowOffsetY: a.shadow.offsetY,
      stickerWidth: a.silhouette.width,
      stickerColor: a.silhouette.color,
    };
  };
  board.items = board.items.map(convert);
  if (board.pages)
    board.pages = board.pages.map((page) => ({ ...page, items: page.items.map(convert) }));
  board.version = 2;
  return board;
}

/** Explicit operator recovery only; not imported by the app. Media storage is untouched. */
export async function rollbackBoardStore() {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('gratitude-studio-v1', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    const store = db.transaction('boards', 'readonly').objectStore('boards');
    const read = (request) =>
      new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const [keys, values] = await Promise.all([read(store.getAllKeys()), read(store.getAll())]);
    // Validate every conversion before changing any record. Unsupported semantics
    // abort the entire rollback; no silent rasterizing, flattening or data loss.
    const changes = values.flatMap((value, index) =>
      value.version === 3
        ? [{ key: keys[index], before: value, after: recoverLegacyBackup(value) }]
        : [],
    );
    const filename = 'appearance-storage-before-rollback.json';
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { version: 1, records: keys.map((key, index) => ({ key, document: values[index] })) },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    await new Promise((resolve, reject) => {
      const tx = db.transaction('boards', 'readwrite'),
        store = tx.objectStore('boards');
      for (const { key, before, after } of changes) {
        const request = store.get(key);
        request.onsuccess = () => {
          if (JSON.stringify(request.result) !== JSON.stringify(before)) {
            tx.abort();
            return;
          }
          store.put(after, key);
        };
      }
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error || new Error('Board changed during rollback. No conversions committed.'));
    });
    return { converted: changes.length, snapshot: filename };
  } finally {
    db.close();
  }
}
