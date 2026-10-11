import type { CanonicalItem, CanonicalDocument, CanonicalPage } from './appearance/types';
export type BoardItem = CanonicalItem;
export type BoardDocument = CanonicalDocument;
export type BoardPage = CanonicalPage;
export const newBoard = (): BoardDocument => ({
  version: 3,
  title: 'My beautiful life',
  width: 1080,
  height: 1080,
  color: '#fffaf6',
  items: [],
});

/** Every user command is one immutable document snapshot. Selection is transient. */
export class DocumentHistory {
  document = newBoard();
  revision = 0;
  private past: BoardDocument[] = [];
  private future: BoardDocument[] = [];
  private gestureStart?: BoardDocument;
  get gestureActive() {
    return !!this.gestureStart;
  }
  beginGesture() {
    if (!this.gestureStart) this.gestureStart = this.document;
  }
  endGesture() {
    if (!this.gestureStart) return;
    const start = this.gestureStart;
    this.gestureStart = undefined;
    if (start !== this.document) {
      this.past = [...this.past.slice(-99), start];
      this.future = [];
    }
  }
  cancelGesture() {
    if (!this.gestureStart) return;
    this.document = this.gestureStart;
    this.gestureStart = undefined;
    this.revision++;
  }
  get canUndo() {
    return this.past.length > 0 || (!!this.gestureStart && this.gestureStart !== this.document);
  }
  get canRedo() {
    return this.future.length > 0;
  }
  commit(next: BoardDocument) {
    if (!this.gestureStart) this.past = [...this.past.slice(-99), this.document];
    this.document = next;
    if (!this.gestureStart) this.future = [];
    this.revision++;
  }
  undo() {
    this.endGesture();
    const previous = this.past.pop();
    if (!previous) return;
    this.future.push(this.document);
    this.document = previous;
    this.revision++;
  }
  redo() {
    this.endGesture();
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.document);
    this.document = next;
    this.revision++;
  }
}
