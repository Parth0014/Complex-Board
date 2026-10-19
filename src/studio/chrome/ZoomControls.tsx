import { Slider } from '../ui/Slider';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Button, IconButton } from '../ui/Button';
import { MinusIcon, PlusIcon, FitIcon } from '../icons';
export function ZoomControls({
  value,
  onChange,
  onFit,
  min = 10,
  max = 400,
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
  const dragging = useRef(false);
  const currentScale = useRef(value / 100);
  useLayoutEffect(() => {
    currentScale.current = value / 100;
  }, [value]);
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
    let previousTime = ownerWindow.performance.now();
    const tick = (time: number) => {
      const target = pending.current;
      if (target === null) {
        frame.current = 0;
        return;
      }
      const elapsed = Math.min(64, Math.max(1, time - previousTime));
      previousTime = time;
      const distance = target - currentScale.current;
      const next =
        Math.abs(distance) < 0.0001
          ? target
          : currentScale.current + distance * (1 - Math.exp(-elapsed / 35));
      currentScale.current = next;
      flushSync(() => latest.current(next));
      if (next === target) {
        pending.current = null;
        frame.current = 0;
      } else frame.current = ownerWindow.requestAnimationFrame(tick);
    };
    frame.current = ownerWindow.requestAnimationFrame(tick);
  };
  const immediate = (next: number) => {
    if (frame.current) owner.current?.cancelAnimationFrame(frame.current);
    frame.current = 0;
    pending.current = null;
    currentScale.current = next;
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
        <Slider
          className="vs-range"
          aria-label="Zoom"
          aria-valuetext={`${Math.round(value)}%`}
          min={min}
          max={max}
          step="any"
          value={value}
          onPointerDown={() => (dragging.current = true)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          onKeyDown={(event) => {
            dragging.current = false;
            const keys: Record<string, number> = {
              ArrowRight: value + 1,
              ArrowUp: value + 1,
              ArrowLeft: value - 1,
              ArrowDown: value - 1,
              PageUp: value + 10,
              PageDown: value - 10,
              Home: min,
              End: max,
            };
            if (event.key in keys) {
              event.preventDefault();
              immediate(Math.max(min, Math.min(max, keys[event.key])) / 100);
            }
          }}
          onChange={(event) => {
            const next = Number(event.target.value);
            const snapped = dragging.current && Math.abs(next - 100) <= 3 ? 100 : next;
            change(snapped / 100, event.currentTarget);
          }}
        />
        <div className="gs-zoom-markers" aria-hidden="true">
          <span
            className="gs-zoom-notch"
            style={{ left: `${((100 - min) / (max - min)) * 100}%` }}
          />
        </div>
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
        onClick={() => {
          if (frame.current) owner.current?.cancelAnimationFrame(frame.current);
          frame.current = 0;
          pending.current = null;
          onFit();
        }}
      >
        <FitIcon />
      </IconButton>
    </div>
  );
}
