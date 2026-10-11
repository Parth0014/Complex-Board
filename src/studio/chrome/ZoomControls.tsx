import { IconButton } from '../ui/Button';
import { MinusIcon, PlusIcon, FitIcon } from '../icons';
export function ZoomControls({
  value,
  onChange,
  onFit,
  min = 10,
  max = 150,
  step = 10,
}: {
  value: number;
  onChange: (scale: number) => void;
  onFit: () => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="vs-zoom">
      <IconButton
        className="vs-icon-btn"
        data-tip="Zoom out"
        aria-label="Zoom out"
        onClick={() => onChange(Math.max(min, value - step) / 100)}
      >
        <MinusIcon />
      </IconButton>
      <input
        className="vs-range"
        aria-label="Zoom"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
      <span className="vs-zoom__pct">{value}%</span>
      <IconButton
        className="vs-icon-btn"
        data-tip="Zoom in"
        aria-label="Zoom in"
        onClick={() => onChange(Math.min(max, value + step) / 100)}
      >
        <PlusIcon />
      </IconButton>
      <IconButton
        className="vs-icon-btn"
        data-tip="Fit board to view"
        aria-label="Fit board to view"
        onClick={onFit}
      >
        <FitIcon />
      </IconButton>
    </div>
  );
}
