import { useCallback } from 'react';
import type { StudioAdapter } from '../../vision/contracts';
import { IconButton } from '../ui/Button';
import { CloseIcon } from '../icons';
import { TweakpaneHost } from './TweakpaneHost';
import { createShapePane } from './shapePane';
import './tweakpane.css';

export default function QuickShapeInspector({
  adapter,
  id,
  onClose,
}: {
  adapter: StudioAdapter;
  id: string;
  onClose(): void;
}) {
  const create = useCallback(
    (container: HTMLDivElement) => createShapePane(container, adapter, id),
    [adapter, id],
  );
  return (
    <section className="gs-shape-inspector" aria-label="Quick Shape inspector">
      <header>
        <div>
          <h3>Shape appearance</h3>
          <p>Fill, border and finishing touches</p>
        </div>
        <IconButton aria-label="Close shape inspector" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </header>
      <div className="gs-shape-inspector__body">
        <TweakpaneHost create={create} />
      </div>
    </section>
  );
}
