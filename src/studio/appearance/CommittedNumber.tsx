import { useEffect, useRef, useState } from 'react';

/** Typography draft; the document is authoritative until a valid commit. */
export function CommittedNumber({
  label,
  value,
  min,
  max,
  step = 1,
  onCommit,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit(value: number): void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  const canceled = useRef(false);
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const parsed = Number(draft);
    if (canceled.current || !draft.trim() || !Number.isFinite(parsed)) {
      canceled.current = false;
      setDraft(String(value));
      return;
    }
    const next = Math.max(min, Math.min(max, Math.round(parsed / step) * step));
    if (next !== value) onCommit(next);
    setDraft(String(next));
  };
  return (
    <label className="gs-committed-number">
      <span>{label}</span>
      <input
        type="number"
        data-appearance-draft
        aria-label={label}
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            event.stopPropagation();
            canceled.current = true;
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
