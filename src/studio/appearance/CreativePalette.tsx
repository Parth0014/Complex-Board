import { STUDIO_PALETTE as colors } from '../palette';
import { Button } from '../ui/Button';
import type { StudioAdapter } from '../../vision/contracts';
import { applyControl, type ColorTarget } from './appearanceControls';

export function CreativePalette({
  adapter,
  id,
  target,
  value,
  label,
  disabled = false,
}: {
  adapter: StudioAdapter;
  id: string;
  target: ColorTarget;
  value: string;
  label: string;
  disabled?: boolean;
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
          disabled={disabled}
          onClick={() => applyControl(adapter, id, target, color)}
        />
      ))}
    </div>
  );
}
