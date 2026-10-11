import type { StudioAdapter } from '../../vision/contracts';
import type { AppearanceChange } from '../../vision/appearance/update';
import { selectedQuickShape } from './feature';

/** Transient gesture ownership only. The document/history remain entirely in the adapter. */
export class TweakpaneSession {
  private owned = false;
  private disposed = false;
  private interrupted = false;
  private applying = false;
  private document: StudioAdapter['history']['document'];
  private unsubscribe: () => void;

  constructor(
    private adapter: StudioAdapter,
    readonly id: string,
    private refresh: () => void,
    private selected: typeof import('./feature').selectedAppearance = selectedQuickShape,
  ) {
    this.document = adapter.history.document;
    this.unsubscribe = adapter.subscribe(() => {
      if (this.disposed) return;
      const current = this.selected(adapter);
      const external = !this.applying && this.document !== adapter.history.document;
      this.document = adapter.history.document;
      if (current?.id !== id || current.locked || (external && this.owned)) {
        this.interrupted = true;
        this.finish();
      }
      this.refresh();
    });
  }

  begin() {
    const current = this.selected(this.adapter);
    if (this.disposed || current?.id !== this.id || current.locked) return;
    this.interrupted = false;
    if (!this.owned) {
      // Never merge an inspector adjustment into another interaction's gesture.
      if (this.adapter.history.gestureActive) this.adapter.endGesture();
      this.adapter.beginGesture();
      this.owned = true;
    }
  }

  change(change: AppearanceChange, last: boolean, interacting: boolean) {
    const current = this.selected(this.adapter);
    if (this.disposed || this.interrupted || current?.id !== this.id || current.locked) return;
    if (!this.owned) this.begin();
    this.applying = true;
    try {
      this.adapter.changeAppearance(change, [this.id]);
    } finally {
      this.applying = false;
      if (last && !interacting) this.finish();
    }
  }

  finish(cancel = false) {
    if (!this.owned) return;
    this.owned = false;
    // External undo/redo may already have closed the gesture.
    if (!this.adapter.history.gestureActive) return;
    if (cancel) this.adapter.cancelGesture();
    else this.adapter.endGesture();
  }

  interrupt(cancel = false) {
    this.interrupted = true;
    this.finish(cancel);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.finish();
  }
}
