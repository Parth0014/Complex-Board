import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
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
  const owner = useRef<Window | null>(null);
  const pending = useRef<number | null>(null);
  const frame = useRef(0);
  const latest = useRef(onChange);
  useLayoutEffect(() => {
    latest.current = onChange;
  }, [onChange]);
  useEffect(
    () => () => {
      if (frame.current) owner.current?.cancelAnimationFrame(frame.current);
    },
    [],
  );
  const change = (next: number, input: HTMLInputElement) => {
    pending.current = next;
    const ownerWindow = input.ownerDocument.defaultView!;
    owner.current = ownerWindow;
    if (frame.current) return;
    frame.current = ownerWindow.requestAnimationFrame(() => {
      frame.current = 0;
      const value = pending.current;
      pending.current = null;
      if (value !== null) flushSync(() => latest.current(value));
    });
  };
  const immediate = (next: number) => {
    if (frame.current) owner.current?.cancelAnimationFrame(frame.current);
    frame.current = 0;
    pending.current = null;
    onChange(next);
  };
  return (
    <div className="vs-zoom">
      <IconButton
        className="vs-icon-btn"
        data-tip="Zoom out"
        aria-label="Zoom out"
        onClick={() => immediate(Math.max(min, value - step) / 100)}
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
          value={Math.round(value)}
          onChange={(event) => change(Number(event.target.value) / 100, event.currentTarget)}
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
        onClick={() => immediate(1)}
      >
        {Math.round(value)}%
      </Button>
      <IconButton
        className="vs-icon-btn"
        data-tip="Zoom in"
        aria-label="Zoom in"
        onClick={() => immediate(Math.min(max, value + step) / 100)}
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
