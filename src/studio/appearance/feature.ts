import type { StudioAdapter } from '../../vision/contracts';
import type { ClosedShapeAppearance } from '../../vision/appearance/types';

/** Opt-in proof of concept. It changes UI only, never document or persistence versions. */
export const tweakpaneD1Enabled = import.meta.env.VITE_TWEAKPANE_D1 === '1';

export function selectedQuickShape(adapter: Pick<StudioAdapter, 'selectedIds' | 'history'>) {
  if (adapter.selectedIds.length !== 1) return undefined;
  const item = adapter.history.document.items.find((item) => item.id === adapter.selectedIds[0]);
  return item?.kind === 'shape' && item.appearance.kind === 'closed-shape'
    ? (item as typeof item & { appearance: ClosedShapeAppearance })
    : undefined;
}
