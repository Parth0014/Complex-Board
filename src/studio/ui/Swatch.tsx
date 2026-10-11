import { Button } from './Button';
import { CheckIcon } from '../icons';
import type { PaletteSwatch } from '../palette';

export function Swatch({
  swatch,
  selected,
  onClick,
  disabled = false,
}: {
  swatch: PaletteSwatch;
  selected: boolean;
  onClick(): void;
  disabled?: boolean;
}) {
  const rgb = swatch.hex
    .slice(1)
    .match(/../g)!
    .map((value) => parseInt(value, 16));
  const dark = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 < 150;
  return (
    <Button
      className="gs-swatch"
      aria-label={swatch.name}
      data-tip={swatch.name}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      style={{ background: swatch.hex, color: dark ? 'var(--gs-on-accent)' : 'var(--gs-text)' }}
    >
      {selected && <CheckIcon />}
    </Button>
  );
}
