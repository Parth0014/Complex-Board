import { PALETTE } from '../palette';
import { Swatch } from '../ui/Swatch';
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
      {PALETTE.map((swatch) => (
        <Swatch
          key={swatch.hex}
          swatch={swatch}
          selected={value.toLowerCase() === swatch.hex}
          disabled={disabled}
          onClick={() => applyControl(adapter, id, target, swatch.hex)}
        />
      ))}
    </div>
  );
}
