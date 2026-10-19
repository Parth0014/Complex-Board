import { useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { MinusIcon, PlusIcon } from '../icons';
import { IconButton } from './Button';

type Props = Omit<
  ComponentProps<'input'>,
  'value' | 'onChange' | 'onFocus' | 'onBlur' | 'onKeyDown' | 'onPointerDown'
> & {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onCommit(value: number): void;
  onCancel?(): void;
  onBegin?(): void;
  onEnd?(): void;
};
/** Typing is a draft; arrows and step buttons preview one reversible gesture. */
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onCommit,
  onCancel,
  onBegin,
  onEnd,
  className = 'vs-input',
  ...props
}: Props) {
  const format = (n: number | undefined) => (n === undefined ? '' : String(Number(n.toFixed(4))));
  const [draft, setDraft] = useState(format(value));
  const [focused, setFocused] = useState(false);
  const cancelled = useRef(false);
  const initial = useRef(value);

  useLayoutEffect(() => {
    if (!focused) setDraft(format(value));
  }, [value, focused]);
  const clamp = (n: number) => Number(Math.max(min, Math.min(max, n)).toFixed(4));
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    if (!draft.trim() || !Number.isFinite(Number(draft))) {
      setDraft(format(value));
      return;
    }
    const next = clamp(Number(draft));
    if (next !== value) onCommit(next);
    setDraft(format(next));
  };
  return (
    <span className="gs-number-field" data-disabled={props.disabled || undefined}>
      <IconButton
        className="gs-number-field__step"
        aria-label={'Decrease ' + label}
        disabled={props.disabled || (value !== undefined && value <= min)}
        onClick={(event) => {
          const next = clamp((value ?? min) - step * (event.shiftKey ? 10 : 1));
          onBegin?.();
          setDraft(format(next));
          onCommit(next);
          onEnd?.();
        }}
      >
        <MinusIcon />
      </IconButton>
      <input
        {...props}
        className={className}
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onFocus={() => {
          setFocused(true);
          initial.current = value;
          cancelled.current = false;
          onBegin?.();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          setFocused(false);
          commit();
          onEnd?.();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            cancelled.current = true;
            onCancel?.();
            setDraft(format(initial.current));
            event.currentTarget.blur();
          } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const base =
              draft.trim() && Number.isFinite(Number(draft)) ? Number(draft) : (value ?? min);
            const next = clamp(
              base + (event.key === 'ArrowUp' ? 1 : -1) * step * (event.shiftKey ? 10 : 1),
            );
            setDraft(format(next));
            onCommit(next);
          }
        }}
      />
      {unit && (
        <span className="gs-number-field__unit" aria-hidden="true">
          {unit}
        </span>
      )}
      <IconButton
        className="gs-number-field__step"
        aria-label={'Increase ' + label}
        disabled={props.disabled || (value !== undefined && value >= max)}
        onClick={(event) => {
          const next = clamp((value ?? min) + step * (event.shiftKey ? 10 : 1));
          onBegin?.();
          setDraft(format(next));
          onCommit(next);
          onEnd?.();
        }}
      >
        <PlusIcon />
      </IconButton>
    </span>
  );
}
