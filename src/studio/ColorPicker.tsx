import { Slider } from './ui/Slider';
import { PALETTE, type PaletteSwatch } from './palette';
import { Swatch } from './ui/Swatch';
import { Button } from './ui/Button';
import { useEffect, useId, useRef, useState } from 'react';
import { Popover } from './ui/Popover';

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
  palette = PALETTE,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  palette?: readonly PaletteSwatch[];
}) {
  const errorId = `${useId()}-hex-error`;
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const [hexError, setHexError] = useState('');
  const [tone, setTone] = useState(() => fromHex(value));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHex(value);
    setHexError('');
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
          <div className="studio-color-swatches" role="group" aria-label="Quick colors">
            {palette.map((swatch) => (
              <Swatch
                key={swatch.hex}
                swatch={swatch}
                selected={value.toLowerCase() === swatch.hex}
                onClick={() => {
                  setTone(fromHex(swatch.hex));
                  onChange(swatch.hex);
                }}
              />
            ))}
          </div>
          <div
            className="studio-color-plane"
            tabIndex={0}
            role="group"
            aria-label={`${label} saturation and brightness`}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
              event.preventDefault();
              const step = event.shiftKey ? 0.1 : 0.01;
              change({
                ...tone,
                s: Math.max(
                  0,
                  Math.min(
                    1,
                    tone.s +
                      (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
                  ),
                ),
                v: Math.max(
                  0,
                  Math.min(
                    1,
                    tone.v +
                      (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0),
                  ),
                ),
              });
            }}
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
            <Slider
              spectrum
              aria-label={`${label} hue`}
              aria-valuetext={`${Math.round(tone.h)} degrees`}

              min="0"
              max="360"
              value={Math.round(tone.h)}
              onChange={(event) => change({ ...tone, h: Number(event.target.value) })}
            />
          </label>
          <label className="studio-color-hex">
            <span className="studio-color-hex-label">Hex</span>
            <span className="studio-color-current" style={{ backgroundColor: value }} />
            <input
              className="vs-input"
              aria-label={`${label} hex`}
              aria-invalid={hexError ? true : undefined}
              aria-describedby={hexError ? errorId : undefined}
              value={hex}
              maxLength={7}
              onChange={(event) => {
                const next = event.target.value;
                setHex(next);
                if (/^#[0-9a-f]{6}$/i.test(next)) {
                  setHexError('');
                  setTone(fromHex(next));
                  onChange(next);
                } else if (next.trim()) {
                  setHexError('Use a 6-digit hex like #7C5CD6.');
                } else {
                  setHexError('');
                }
              }}
              onBlur={() => {
                if (hexError) setHex(value);
                setHexError('');
              }}
            />
          </label>
          {hexError && (
            <p className="studio-color-hex-error" id={errorId} role="alert">
              {hexError}
            </p>
          )}
        </Popover>
      )}
    </div>
  );
}
