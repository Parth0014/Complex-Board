import { Button, IconButton } from '../ui/Button';
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
      <div className="gs-zoom-track">
        <input
          className="vs-range"
          aria-label="Zoom"
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value) / 100)}
        />
        <span
          className="gs-zoom-notch"
          aria-hidden="true"
          style={{ left: `${((100 - min) / (max - min)) * 100}%` }}
        />
      </div>
      <Button
        className="vs-zoom__pct"
        aria-label="Reset zoom to 100%"
        data-tip="Reset zoom to 100%"
        onClick={() => onChange(1)}
      >
        {value}%
      </Button>
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
