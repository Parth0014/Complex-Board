import { Slider } from './ui/Slider';
import { type PaletteSwatch } from './palette';
import { Button } from './ui/Button';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Popover } from './ui/Popover';
import { CloseIcon } from './icons';

function normalizeHex(value: string) {
  const raw = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(raw)) return '#' + [...raw].map((c) => c + c).join('');
  return /^[\da-f]{6}([\da-f]{2})?$/i.test(raw) ? '#' + raw : null;
}

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
  value = normalizeHex(value) || '#333333';
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
  allowAlpha = true,
  showValue = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  palette?: readonly PaletteSwatch[];
  allowAlpha?: boolean;
  showValue?: boolean;
}) {
  const errorId = `${useId()}-hex-error`;
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const [hexError, setHexError] = useState('');
  const [tone, setTone] = useState(() => fromHex(value));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [canSample, setCanSample] = useState(false);
  useEffect(
    () =>
      setCanSample(
        Boolean(
          root.current?.ownerDocument.defaultView &&
          'EyeDropper' in root.current.ownerDocument.defaultView,
        ),
      ),
    [],
  );

  useEffect(() => {
    setHex(value);
    setHexError('');
  }, [value]);

  const change = (next: typeof tone) => {
    setTone(next);
    onChange(hsv(next.h, next.s, next.v) + (value.length === 9 ? value.slice(7) : ''));
  };
  const close = () => {
    setOpen(false);
  };

  return (
    <div className="studio-color-picker" ref={root}>
      <Button
        type="button"
        ref={trigger}
        className={`vs-color studio-color-trigger${showValue ? ' studio-color-trigger--value' : ''}`}
        style={showValue ? undefined : { background: value }}
        aria-label={label}
        aria-expanded={open}
        data-tip={`${label}: ${value.toUpperCase()}`}
        onClick={(event) => {
          event.stopPropagation();
          if (!open) {
            setTone(fromHex(value));
            setOpen(true);
          } else close();
        }}
      >
        {showValue && (
          <>
            <span
              className="studio-color-trigger__chip"
              style={{ background: value }}
              aria-hidden="true"
            />
            <span>{value.toUpperCase()}</span>
          </>
        )}
      </Button>
      {open && (
        <Popover
          anchor={trigger}
          onDismiss={close}
          focusOnOpen
          className="studio-color-popover studio-color-compact"
          role="group"
          aria-label={`${label} picker`}
        >
          <div className="studio-color-heading">
            <span>{label}</span>
            <Button
              type="button"
              aria-label="Close color picker"
              onClick={() => {
                close();
                trigger.current?.focus();
              }}
            >
              <CloseIcon />
            </Button>
          </div>
          <div
            className="studio-color-plane"
            role="group"
            tabIndex={0}
            aria-label={`${label} saturation and brightness`}
            data-tip="Arrow keys adjust saturation and brightness"
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
              event.preventDefault();
              event.stopPropagation();
              const amount = event.shiftKey ? 0.1 : 0.01;
              change({
                ...tone,
                s: Math.max(
                  0,
                  Math.min(
                    1,
                    tone.s +
                      (event.key === 'ArrowRight'
                        ? amount
                        : event.key === 'ArrowLeft'
                          ? -amount
                          : 0),
                  ),
                ),
                v: Math.max(
                  0,
                  Math.min(
                    1,
                    tone.v +
                      (event.key === 'ArrowUp' ? amount : event.key === 'ArrowDown' ? -amount : 0),
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
          <div
            className="studio-color-tracks"
            style={{ '--picker-color': value.slice(0, 7) } as CSSProperties}
          >
            {
              <Button
                variant="primary"
                className="studio-color-eyedropper"
                aria-label="Pick color from screen"
                data-tip={
                  canSample
                    ? 'Pick color from screen'
                    : 'Screen sampling is unavailable in this browser'
                }
                disabled={!canSample}
                onClick={async () => {
                  const owner = root.current!.ownerDocument.defaultView! as unknown as Window & {
                    EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> };
                  };
                  try {
                    const result = await new owner.EyeDropper().open();
                    setTone(fromHex(result.sRGBHex));
                    onChange(result.sRGBHex);
                  } catch (error) {
                    if (!(error instanceof Error && error.name === 'AbortError'))
                      setHexError('Could not sample this color. Try the hex field.');
                  }
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="m14 5 5 5M4 20l4-1 11-11a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
                </svg>
              </Button>
            }
            <div className="studio-color-track-pair">
              {' '}
              <label className="vs-field studio-color-spectrum">
                <span>Hue</span>
                <Slider
                  spectrum
                  aria-label={`${label} hue`}
                  aria-valuetext={`${Math.round(tone.h)} degrees`}

                  min="0"
                  max="360"
                  value={Math.round(tone.h)}
                  onChange={(event) => change({ ...tone, h: Number(event.target.value) })}
                />
                <output>
                  {Math.round(tone.h)}
                  {'\u00b0'}
                </output>
              </label>
              {allowAlpha && (
                <label className="vs-field studio-color-alpha">
                  <span>Opacity</span>
                  <Slider
                    aria-label={`${label} color opacity`}
                    min={0}
                    max={100}
                    value={
                      value.length === 9
                        ? Math.round((parseInt(value.slice(7), 16) / 255) * 100)
                        : 100
                    }
                    onChange={(e) => {
                      const alpha = Math.round((Number(e.target.value) / 100) * 255);
                      onChange(
                        (normalizeHex(value) || hsv(tone.h, tone.s, tone.v)).slice(0, 7) +
                          (alpha === 255 ? '' : alpha.toString(16).padStart(2, '0')),
                      );
                    }}
                  />
                  <output>
                    {value.length === 9
                      ? Math.round((parseInt(value.slice(7), 16) / 255) * 100)
                      : 100}
                    %
                  </output>
                </label>
              )}
            </div>
          </div>
          <div className="studio-color-values">
            <label className="studio-color-hex">
              <span className="studio-color-hex-label">Hex</span>
              <span className="studio-color-current" style={{ backgroundColor: value }} />
              <input
                className="vs-input"
                aria-label={`${label} hex`}
                aria-invalid={hexError ? true : undefined}
                aria-describedby={hexError ? errorId : undefined}
                value={hex}
                maxLength={9}
                onChange={(event) => {
                  const next = event.target.value;
                  setHex(next);
                  const normalized = normalizeHex(next);
                  if (normalized && (allowAlpha || normalized.length === 7)) {
                    setHexError('');
                    // Keep shorthand as a draft so typing a six-digit value
                    // does not expand its first three digits mid-keystroke.
                    if (next.trim().replace(/^#/, '').length !== 3) {
                      setTone(fromHex(normalized));
                      onChange(normalized);
                    }
                  } else if (next.trim()) {
                    setHexError(
                      allowAlpha
                        ? 'Use 3, 6 or 8 hex digits, with or without #.'
                        : 'Use 3 or 6 hex digits, with or without #.',
                    );
                  } else {
                    setHexError('');
                  }
                }}
                onBlur={() => {
                  const normalized = normalizeHex(hex);
                  if (normalized && (allowAlpha || normalized.length === 7)) {
                    setHex(normalized);
                    setTone(fromHex(normalized));
                    if (normalized.toLowerCase() !== value.toLowerCase()) onChange(normalized);
                  } else setHex(value);
                  setHexError('');
                }}
              />
            </label>
            {(['R', 'G', 'B'] as const).map((channel, index) => {
              const normalized = normalizeHex(value) || '#333333';
              const component = parseInt(normalized.slice(1 + index * 2, 3 + index * 2), 16);
              return (
                <label className="studio-color-rgb" key={channel}>
                  <span>{channel}</span>
                  <input
                    className="vs-input"
                    type="number"
                    min={0}
                    max={255}
                    aria-label={`${label} ${channel}`}
                    key={component}
                    defaultValue={component}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur();
                    }}
                    onBlur={(event) => {
                      const raw = event.currentTarget.value;
                      if (!raw.trim() || !Number.isFinite(Number(raw))) {
                        event.currentTarget.value = String(component);
                        return;
                      }
                      const next = Math.max(0, Math.min(255, Math.round(Number(raw))));
                      const start = 1 + index * 2;
                      const color =
                        normalized.slice(0, start) +
                        next.toString(16).padStart(2, '0') +
                        normalized.slice(start + 2);
                      setTone(fromHex(color));
                      onChange(color);
                      event.currentTarget.value = String(next);
                    }}
                  />
                </label>
              );
            })}
          </div>
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
