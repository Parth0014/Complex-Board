import type { BoardDocument } from '../../vision/document';
const cache = new WeakMap<BoardDocument, Promise<string>>();
const waiting: Array<() => void> = [];
let active = 0;
async function slot() {
  if (active >= 2) await new Promise<void>((resolve) => waiting.push(resolve));
  else active++;
}
function release() {
  const next = waiting.shift();
  if (next) next();
  else active--;
}
/** Share in-flight work and bound simultaneous offscreen canvases. */
export function renderThumbnail(document: BoardDocument) {
  const existing = cache.get(document);
  if (existing) return existing;
  const promise = (async () => {
    await slot();
    try {
      const { KonvaCanvasAdapter } = await import('../../vision/canvas/KonvaCanvasAdapter');
      return await new KonvaCanvasAdapter(window).previewSavedDocument(document);
    } finally {
      release();
    }
  })().catch((error) => {
    cache.delete(document);
    throw error;
  });
  cache.set(document, promise);
  return promise;
}
