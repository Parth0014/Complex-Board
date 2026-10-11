import { useCallback } from 'react';
import type { StudioAdapter } from '../../vision/contracts';
import { TweakpaneHost } from './TweakpaneHost';
import { createBindingPane } from './bindingPane';
import { selectedAppearance } from './feature';
import {
  controlChange,
  controlValues,
  technicalControls,
  type InspectorArea,
} from './appearanceControls';
import './tweakpane.css';

export function TechnicalControls({
  adapter,
  id,
  area,
  only,
}: {
  adapter: StudioAdapter;
  id: string;
  area: InspectorArea;
  only?: string;
}) {
  const create = useCallback(
    (container: HTMLDivElement) => {
      const item = selectedAppearance(adapter);
      if (!item || item.id !== id) throw new Error('Selected object changed.');
      const controls = technicalControls(item, area).filter(
        (control) => !only || control.key === only,
      );
      return createBindingPane(container, adapter, id, {
        selected: selectedAppearance,
        values: controlValues,
        command: controlChange,
        controls,
      });
    },
    [adapter, id, area, only],
  );
  return <TweakpaneHost create={create} />;
}
