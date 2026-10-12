import type { StudioAdapter } from '../../vision/contracts';
import { useEffect, useRef, useState } from 'react';

/** Valid whole-number edits render live and share one focus-session undo. */
export function CommittedNumber({
  label,
  adapter,
  value,
  min,
  max,
  step = 1,
  onCommit,
  disabled = false,
}: {
  label: string;
  adapter: Pick<StudioAdapter, 'beginGesture' | 'endGesture' | 'cancelGesture'>;
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit(value: number): void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(Math.round(value)));
  const canceled = useRef(false);
  useEffect(() => setDraft(String(Math.round(value))), [value]);
  const commit = () => {
    const parsed = Number(draft);
    if (canceled.current || !draft.trim() || !Number.isFinite(parsed)) {
      canceled.current = false;
      setDraft(String(Math.round(value)));
      return;
    }
    const next = Math.max(min, Math.min(max, Math.round(parsed)));
    if (next !== Math.round(value)) onCommit(next);
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
        step={Math.max(1, step)}
        disabled={disabled}
        onFocus={() => adapter.beginGesture()}
        onChange={(event) => {
          const raw = event.target.value;
          const parsed = Number(raw);
          const next = Math.round(parsed);
          setDraft(raw && Number.isFinite(parsed) ? String(next) : raw);
          if (
            raw.trim() &&
            Number.isFinite(parsed) &&
            next >= min &&
            next <= max &&
            next !== Math.round(value)
          )
            onCommit(next);
        }}
        onBlur={() => {
          commit();
          adapter.endGesture();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            event.stopPropagation();
            canceled.current = true;
            adapter.cancelGesture();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
