import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

/**
 * Position the portal popover near the trigger button in viewport coordinates,
 * flipping or shifting to stay within the viewport bounds.
 */
function usePopoverPosition(
  triggerRef: React.RefObject<HTMLButtonElement | null>,
  popoverRef: React.RefObject<HTMLDivElement | null>,
  open: boolean,
) {
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const update = () => {
      const rect = trigger.getBoundingClientRect();
      const popH = popover.offsetHeight || 330;
      const popW = popover.offsetWidth || 260;
      const viewH = window.innerHeight;
      const viewW = window.innerWidth;

      // Vertical positioning
      let top = rect.bottom + 6;
      if (top + popH > viewH - 12) {
        top = Math.max(12, rect.top - popH - 6);
      }

      // Horizontal positioning (align right edges so it doesn't overflow panel)
      let left = rect.right - popW;
      if (left < 12) {
        left = Math.max(12, rect.left);
      }
      if (left + popW > viewW - 12) {
        left = viewW - popW - 12;
      }

      popover.style.top = `${Math.round(top)}px`;
      popover.style.left = `${Math.round(left)}px`;
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, triggerRef, popoverRef]);
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
  const popover = useRef<HTMLDivElement>(null);

  usePopoverPosition(trigger, popover, open);

  useEffect(() => {
    setHex(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const doc = root.current?.ownerDocument || document;

    const outside = (event: Event) => {
      const path = event.composedPath();
      if (
        (root.current && path.includes(root.current)) ||
        (popover.current && path.includes(popover.current))
      ) {
        return;
      }
      setOpen(false);
    };

    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    };

    doc.addEventListener('pointerdown', outside, true);
    doc.addEventListener('mousedown', outside, true);
    doc.addEventListener('keydown', escape, true);

    return () => {
      doc.removeEventListener('pointerdown', outside, true);
      doc.removeEventListener('mousedown', outside, true);
      doc.removeEventListener('keydown', escape, true);
    };
  }, [open]);

  const change = (next: typeof tone) => {
    setTone(next);
    onChange(hsv(next.h, next.s, next.v));
  };

  return (
    <div className="studio-color-picker" ref={root}>
      <button
        type="button"
        ref={trigger}
        className="vs-color studio-color-trigger"
        style={{ background: value }}
        aria-label={label}
        aria-expanded={open}
        title={`${label}: ${value.toUpperCase()}`}
        onClick={(event) => {
          event.stopPropagation();
          if (!open) setTone(fromHex(value));
          setOpen((prev) => !prev);
        }}
      />
      {open &&
        createPortal(
          <div
            className="studio-color-popover"
            ref={popover}
            role="group"
            aria-label={`${label} picker`}
          >
            <div className="studio-color-heading">
              <span>{label}</span>
              <button
                type="button"
                aria-label="Close color picker"
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                <span aria-hidden="true">&#215;</span>
              </button>
            </div>
            <div className="studio-color-swatches">
              {SWATCHES.map((color) => (
                <button
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
            <label className="vs-field">
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
          </div>,
          document.body,
        )}
    </div>
  );
}
