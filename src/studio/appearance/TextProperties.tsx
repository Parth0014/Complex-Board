import { useRef, useState } from 'react';
import type { StudioAdapter } from '../../vision/contracts';
import type { EditableItem } from '../../vision/appearance/types';
import { editorFonts, canonicalFontId } from '../../vision/fonts';
import { formatRange, isRangeActive, type TextStyle } from '../../vision/text';
import { Button } from '../ui/Button';
import { CommittedNumber } from './CommittedNumber';

/** Existing typography/range commands; object appearance never edits character runs. */
export function TextProperties({
  adapter,
  item,
}: {
  adapter: StudioAdapter;
  item: Extract<EditableItem, { kind: 'text' }>;
}) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const [range, setRange] = useState({ start: 0, end: 0 });
  const patch = (value: Partial<typeof item>) => {
    const current = adapter.history.document.items.find((entry) => entry.id === item.id);
    if (current?.kind === 'text' && !current.locked && adapter.selectedIds.includes(item.id))
      adapter.patchItems([{ id: item.id, patch: value }]);
  };
  const format = (style: TextStyle) => {
    const current = adapter.history.document.items.find((entry) => entry.id === item.id);
    if (current?.kind !== 'text' || current.locked) return;
    const start = editor.current?.selectionStart ?? range.start;
    const end = editor.current?.selectionEnd ?? range.end;
    if (start === end) return;
    const next = { ...style };
    for (const [key, value] of Object.entries(style) as [keyof TextStyle, unknown][]) {
      if (
        typeof value === 'boolean' &&
        isRangeActive(current.textRuns || [], start, end, key, true)
      )
        Object.assign(next, { [key]: false });
      if (key === 'script' && isRangeActive(current.textRuns || [], start, end, key, value))
        next.script = 'normal';
    }
    patch({
      textRuns: formatRange(current.text || '', current.textRuns || [], start, end, next),
      curve: 0,
    });
  };
  return (
    <div className="gs-text-properties">
      <label>
        Content
        <textarea
          ref={editor}
          aria-label="Styled text"
          value={item.text || ''}
          onChange={(event) => patch({ text: event.target.value })}
          onSelect={(event) =>
            setRange({
              start: event.currentTarget.selectionStart,
              end: event.currentTarget.selectionEnd,
            })
          }
        />
      </label>
      <div className="gs-text-controls">
        <label>
          Font
          <select
            aria-label="Inspector font family"
            value={canonicalFontId(item.fontFamily)}
            onChange={(event) =>
              patch({ fontFamily: event.target.value as typeof item.fontFamily })
            }
          >
            {Object.entries(editorFonts).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <CommittedNumber
          label="Inspector text size"
          value={item.fontSize ?? 24}
          min={8}
          max={240}
          onCommit={(value) => patch({ fontSize: value })}
        />
      </div>
      <div className="gs-text-formatting" role="group" aria-label="Object text formatting">
        {(['bold', 'italic', 'underline', 'strike'] as const).map((key) => (
          <Button
            key={key}
            aria-label={`Object ${key}`}
            aria-pressed={!!item[key]}
            onClick={() => patch({ [key]: !item[key] })}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </Button>
        ))}
      </div>
      <label>
        Alignment
        <select
          aria-label="Inspector text alignment"
          value={item.align || 'left'}
          onChange={(event) => patch({ align: event.target.value as typeof item.align })}
        >
          {(['left', 'center', 'right', 'justify'] as const).map((align) => (
            <option key={align} value={align}>
              {align}
            </option>
          ))}
        </select>
      </label>
      <details className="gs-text-advanced">
        <summary>
          Character formatting{' '}
          <span>
            {range.end > range.start ? `${range.end - range.start} selected` : 'Select a range'}
          </span>
        </summary>
        <p className="gs-appearance-note">
          Select characters in Content. Range styles override object defaults.
        </p>
        <div className="gs-text-formatting">
          {(['bold', 'italic', 'underline'] as const).map((key) => (
            <Button
              key={key}
              disabled={range.start === range.end}
              aria-label={`${key.charAt(0).toUpperCase() + key.slice(1)} text range`}
              onClick={() => format({ [key]: true })}
            >
              {key}
            </Button>
          ))}
          <Button disabled={range.start === range.end} onClick={() => format({ script: 'super' })}>
            Superscript
          </Button>
          <Button disabled={range.start === range.end} onClick={() => format({ script: 'sub' })}>
            Subscript
          </Button>
        </div>
        <div className="gs-text-formatting" role="group" aria-label="Character color">
          {['#222222', '#d15b52', '#5988b5', '#9578b5'].map((color) => (
            <Button
              key={color}
              className="gs-creative-swatch"
              style={{ background: color }}
              aria-label={`Character color ${color}`}
              disabled={range.start === range.end}
              onClick={() => format({ color })}
            />
          ))}
        </div>
        <Button onClick={() => patch({ textRuns: undefined })}>Clear range formatting</Button>
      </details>
      <details className="gs-text-advanced">
        <summary>Advanced typography</summary>
        <CommittedNumber
          label="Font weight"
          value={item.fontWeight ?? 400}
          min={100}
          max={900}
          step={100}
          onCommit={(value) => patch({ fontWeight: value })}
        />
        <CommittedNumber
          label="Text curve"
          value={item.curve ?? 0}
          min={-400}
          max={400}
          onCommit={(value) => patch({ curve: value })}
        />
        {(['kerning', 'ligatures'] as const).map((key) => (
          <label key={key} className="gs-text-toggle">
            <input
              type="checkbox"
              checked={item[key] !== false}
              onChange={(event) => patch({ [key]: event.target.checked })}
            />
            {key}
          </label>
        ))}
        <div className="gs-text-formatting">
          <Button onClick={() => patch({ text: item.text?.toUpperCase() })}>UPPERCASE</Button>
          <Button onClick={() => patch({ text: item.text?.toLowerCase() })}>lowercase</Button>
        </div>
      </details>
    </div>
  );
}
