import { Button } from '../ui/Button';
import type { StudioAdapter } from '../../vision/contracts';
import { applyControl, type ColorTarget } from './appearanceControls';

const colors = [
  '#ffffff',
  '#222222',
  '#d15b52',
  '#d7a64c',
  '#7a9c77',
  '#5988b5',
  '#9578b5',
  '#e8b5bf',
];
export function CreativePalette({
  adapter,
  id,
  target,
  value,
  label,
}: {
  adapter: StudioAdapter;
  id: string;
  target: ColorTarget;
  value: string;
  label: string;
}) {
  return (
    <div className="gs-creative-palette" role="group" aria-label={`${label} palette`}>
      {colors.map((color) => (
        <Button
          key={color}
          className="gs-creative-swatch"
          style={{ background: color }}
          aria-label={`${label}: ${color}`}
          aria-pressed={value.toLowerCase() === color}
          onClick={() => applyControl(adapter, id, target, color)}
        />
      ))}
    </div>
  );
}
