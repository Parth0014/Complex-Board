import type { StudioAdapter } from '../../vision/contracts';
import type { ClosedShapeAppearance } from '../../vision/appearance/types';

/** Isolated prototypes. Production Editor uses the shared toolbar and Edit/Layout/Layers dock. */
export const tweakpaneD1Enabled = import.meta.env.VITE_TWEAKPANE_D1 === '1';
export const tweakpaneD2Enabled = import.meta.env.VITE_TWEAKPANE_D2 === '1';

export function selectedAppearance(adapter: Pick<StudioAdapter, 'selectedIds' | 'history'>) {
  if (adapter.selectedIds.length !== 1) return undefined;
  const item = adapter.history.document.items.find((item) => item.id === adapter.selectedIds[0]);
  return item && item.kind !== 'asset' ? item : undefined;
}

export function selectedQuickShape(adapter: Pick<StudioAdapter, 'selectedIds' | 'history'>) {
  if (adapter.selectedIds.length !== 1) return undefined;
  const item = adapter.history.document.items.find((item) => item.id === adapter.selectedIds[0]);
  return item?.kind === 'shape' && item.appearance.kind === 'closed-shape'
    ? (item as typeof item & { appearance: ClosedShapeAppearance })
    : undefined;
}
