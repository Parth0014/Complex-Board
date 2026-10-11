import { Button } from './ui/Button';
import { useEffect, useRef, useState } from 'react';
import { Popover } from './ui/Popover';

const SWATCHES = [
  '#ffffff',
  '#222222',
  '#d15b52',
  '#d7a64c',
  '#7a9c77',
  '#5988b5',
  '#9578b5',
  '#e8b5bf',
];

function hsv(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

function fromHex(value: string) {
  const rgb = [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const max = Math.max(...rgb),
    min = Math.min(...rgb),
    d = max - min;
  const hue = !d
    ? 0
    : max === rgb[0]
      ? ((rgb[1] - rgb[2]) / d + 6) % 6
      : max === rgb[1]
        ? (rgb[2] - rgb[0]) / d + 2
        : (rgb[0] - rgb[1]) / d + 4;
  return { h: hue * 60, s: max ? d / max : 0, v: max };
}

export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const [tone, setTone] = useState(() => fromHex(value));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHex(value);
  }, [value]);

  const change = (next: typeof tone) => {
    setTone(next);
    onChange(hsv(next.h, next.s, next.v));
  };

  return (
    <div className="studio-color-picker" ref={root}>
      <Button
        type="button"
        ref={trigger}
        className="vs-color studio-color-trigger"
        style={{ background: value }}
        aria-label={label}
        aria-expanded={open}
        data-tip={`${label}: ${value.toUpperCase()}`}
        onClick={(event) => {
          event.stopPropagation();
          if (!open) setTone(fromHex(value));
          setOpen((prev) => !prev);
        }}
      />
      {open && (
        <Popover
          anchor={trigger}
          onDismiss={() => setOpen(false)}
          focusOnOpen
          className="studio-color-popover"
          role="group"
          aria-label={`${label} picker`}
        >
          <div className="studio-color-heading">
            <span>{label}</span>
            <Button
              type="button"
              aria-label="Close color picker"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <span aria-hidden="true">&#215;</span>
            </Button>
          </div>
          <div className="studio-color-swatches">
            {SWATCHES.map((color) => (
              <Button
                key={color}
                type="button"
                style={{ background: color }}
                aria-label={`Use ${color}`}
                onClick={() => {
                  setTone(fromHex(color));
                  onChange(color);
                }}
              />
            ))}
          </div>
          <div
            className="studio-color-plane"
            style={{ backgroundColor: hsv(tone.h, 1, 1) }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              const bounds = event.currentTarget.getBoundingClientRect();
              change({
                ...tone,
                s: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
                v: 1 - Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
              });
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              change({
                ...tone,
                s: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
                v: 1 - Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
              });
            }}
          >
            <span style={{ left: `${tone.s * 100}%`, top: `${(1 - tone.v) * 100}%` }} />
          </div>
          <label className="vs-field studio-color-spectrum">
            <input
              aria-label={`${label} hue`}
              type="range"
              min="0"
              max="360"
              value={tone.h}
              onChange={(event) => change({ ...tone, h: Number(event.target.value) })}
            />
          </label>
          <label className="studio-color-hex">
            <span className="studio-color-current" style={{ backgroundColor: value }} />
            <input
              className="vs-input"
              aria-label={`${label} hex`}
              value={hex}
              maxLength={7}
              onChange={(event) => {
                const next = event.target.value;
                setHex(next);
                if (/^#[0-9a-f]{6}$/i.test(next)) {
                  setTone(fromHex(next));
                  onChange(next);
                }
              }}
              onBlur={() => setHex(value)}
            />
          </label>
        </Popover>
      )}
    </div>
  );
}
