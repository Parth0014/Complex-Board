import type { StudioAdapter } from '../../vision/contracts';
import type { RefObject } from 'react';
import { selectedAppearance } from './feature';
import { AppearanceSurface } from './AppearanceSurface';

export default function UnifiedInspector({
  adapter,
  onClose,
  trigger,
}: {
  adapter: StudioAdapter;
  onClose(): void;
  trigger: RefObject<HTMLButtonElement | null>;
}) {
  const item = selectedAppearance(adapter);
  if (!item) return null;
  return (
    <AppearanceSurface
      title={
        item.kind === 'text'
          ? 'Text'
          : item.kind === 'drawing'
            ? 'Drawing'
            : item.appearance.kind === 'open-shape'
              ? 'Line & arrow'
              : 'Shape'
      }
      ownerWindow={adapter.ownerWindow}
      onClose={onClose}
      trigger={trigger}
    >
      <div className="gs-appearance-body">
        <p>Choose a property to refine your selection.</p>
      </div>
    </AppearanceSurface>
  );
}
