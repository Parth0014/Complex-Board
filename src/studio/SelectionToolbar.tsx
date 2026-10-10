import { editorFonts } from '../vision/fonts';
import { useEffect, useRef, useState } from 'react';
import type { KonvaCanvasAdapter } from '../vision/canvas/KonvaCanvasAdapter';
import { ColorPicker } from './ColorPicker';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ChevronDownIcon,
  ContrastIcon,
  SlidersIcon,
} from './icons';

type Props = {
  adapter: KonvaCanvasAdapter;
  onEditStyle: () => void;
  onReplaceImage: () => void;
  replacingImage: boolean;
};

function TextSize({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const cancel = useRef(false);
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    if (cancel.current) {
      cancel.current = false;
      setDraft(String(value));
      return;
    }
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(8, Math.min(240, Math.round(parsed)));
    if (clamped !== value) onCommit(clamped);
    setDraft(String(clamped));
  };
  return (
    <label className="vs-actionbar__size">
      
      <input
        type="number"
        aria-label="Text size in points"
        title="Text size in points. Press Enter to apply."
        min={8}
        max={240}
        step={1}
        disabled={disabled}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            cancel.current = true;
            event.stopPropagation();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function SelectionToolbar({ adapter, onEditStyle, onReplaceImage, replacingImage }: Props) {
  const selection = adapter.getSelection();
  const selected = adapter.history.document.items.filter((entry) =>
    selection.ids.includes(entry.id),
  );
  const item = selected.length === 1 ? selected[0] : undefined;
  const anyLocked = selected.some((entry) => !!entry.locked);
  const mixedOpacity = selected.some((entry) => entry.opacity !== selected[0]?.opacity);
  const opacity = Math.round((selected[0]?.opacity ?? 1) * 100);
  const [menu, setMenu] = useState<'opacity' | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const doc = adapter.ownerWindow.document;
    const outside = (event: PointerEvent) => {
      if (
        !root.current?.contains(event.target as Node) &&
        !(event.target as HTMLElement)?.closest?.('.studio-color-popover')
      )
        setMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    doc.addEventListener('pointerdown', outside);
    doc.addEventListener('keydown', escape);
    return () => {
      doc.removeEventListener('pointerdown', outside);
      doc.removeEventListener('keydown', escape);
    };
  }, [adapter]);
  if (!selected.length) return null;
  const type =
    selected.length > 1
      ? `${selected.length} objects`
      : item?.kind === 'text'
        ? 'Text'
        : item?.kind === 'shape'
          ? 'Shape'
          : item?.kind === 'asset'
            ? 'Image / graphic'
            : 'Drawing';

  return (
    <div className="vs-actionbar" ref={root}>
      <span className="vs-actionbar__identity" aria-label={`Selected: ${type}`}>
        {type}
      </span>
      <span className="vs-actionbar__separator" aria-hidden="true" />
      {item?.kind === 'text' && (
        <>
          <select
            className="vs-actionbar__font"
            aria-label="Font family"
            value={item.fontFamily || 'assistant'}
            disabled={anyLocked}
            onChange={(event) =>
              adapter.patchItems([
                {
                  id: item.id,
                  patch: { fontFamily: event.target.value as typeof item.fontFamily },
                },
              ])
            }
          >
            {Object.entries(editorFonts).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <TextSize
            key={item.id}
            value={item.fontSize ?? 24}
            disabled={anyLocked}
            onCommit={(fontSize) => adapter.updateSelection({ fontSize })}
          />
          {!anyLocked && (
            <div className="vs-actionbar__color" title="Change only the selected text color">
              
              <ColorPicker
                label="Text color"
                value={item.color || '#33272b'}
                onChange={(value) => adapter.patchItems([{ id: item.id, patch: { color: value } }])}
              />
            </div>
          )}
          <button
            className={`vs-actionbar__button vs-actionbar__format${item.bold ? ' is-active' : ''}`}
            aria-label="Bold"
            title="Bold selected text"
            aria-pressed={!!item.bold}
            disabled={anyLocked}
            onClick={() => adapter.patchItems([{ id: item.id, patch: { bold: !item.bold } }])}
          >
            <BoldIcon />
          </button>
          <button
            className={`vs-actionbar__button vs-actionbar__format${item.italic ? ' is-active' : ''}`}
            aria-label="Italic"
            title="Italicize selected text"
            aria-pressed={!!item.italic}
            disabled={anyLocked}
            onClick={() => adapter.patchItems([{ id: item.id, patch: { italic: !item.italic } }])}
          >
            <ItalicIcon />
          </button>
          <button
            className={`vs-actionbar__button vs-actionbar__format${item.underline ? ' is-active' : ''}`}
            aria-label="Underline"
            title="Underline selected text"
            aria-pressed={!!item.underline}
            disabled={anyLocked}
            onClick={() =>
              adapter.patchItems([{ id: item.id, patch: { underline: !item.underline } }])
            }
          >
            <UnderlineIcon />
          </button>
          <span className="vs-actionbar__separator" aria-hidden="true" />
        </>
      )}
      {item?.kind === 'text' && (
        <select
          className="vs-actionbar__font"
          aria-label="Text alignment"
          value={item.align || 'left'}
          disabled={anyLocked}
          onChange={(event) =>
            adapter.patchItems([
              { id: item.id, patch: { align: event.target.value as typeof item.align } },
            ])
          }
        >
          <option value="left">Align left</option>
          <option value="center">Center</option>
          <option value="right">Align right</option>
          <option value="justify">Justify</option>
        </select>
      )}
      {item?.kind === 'drawing' && !anyLocked && (
        <div className="vs-actionbar__color">
          <span>Stroke</span>
          <ColorPicker
            label="Drawing color"
            value={item.color || '#49375e'}
            onChange={(color) => adapter.patchItems([{ id: item.id, patch: { color } }])}
          />
        </div>
      )}
      {item?.kind === 'asset' && item.asset?.provider !== 'curated-v1' && (
        <button
          className="vs-actionbar__button"
          disabled={anyLocked}
          onClick={() => adapter.startImageCrop()}
        >
          Crop
        </button>
      )}
      {item && (
        <button
          className="vs-actionbar__button"
          disabled={anyLocked}
          onClick={() => adapter.patchItems([{ id: item.id, patch: { flipX: !item.flipX } }])}
        >
          Flip
        </button>
      )}
      {item?.kind === 'shape' && !anyLocked && (
        <div
          className="vs-actionbar__color"
          title="Set a solid fill color. Replaces any gradient fill."
        >
          <span>Solid fill</span>
          <ColorPicker
            label="Shape solid fill"
            value={item.color || item.fill || '#b48ce3'}
            onChange={(color) =>
              adapter.patchItems([
                { id: item.id, patch: { color, gradient: undefined, noFill: false } },
              ])
            }
          />
        </div>
      )}
      {item?.kind === 'asset' && item.asset?.provider !== 'curated-v1' && (
        <button
          className="vs-actionbar__button"
          disabled={anyLocked || replacingImage || !!adapter.cropDraft || !!adapter.originalPreview}
          onClick={onReplaceImage}
        >
          {replacingImage ? 'Replacing…' : 'Replace image'}
        </button>
      )}
      {item && (
        <button
          className="vs-actionbar__button vs-actionbar__button--primary"
          disabled={anyLocked}
          title={
            anyLocked
              ? 'Unlock the selection to edit its appearance'
              : 'Open detailed properties; each control edits only its named property'
          }
          onClick={onEditStyle}
        >
          <SlidersIcon />{' '}
          {item.kind === 'text'
            ? 'Formatting'
            : item.kind === 'asset'
              ? 'Image effects'
              : 'Appearance'}
        </button>
      )}
      <div className="vs-actionbar__menu">
        <button
          className="vs-actionbar__button"
          aria-haspopup="true"
          aria-expanded={menu === 'opacity'}
          onClick={() => setMenu((current) => (current === 'opacity' ? null : 'opacity'))}
        >
          <ContrastIcon /> {mixedOpacity ? 'Mixed' : `${opacity}%`}{' '}
          <ChevronDownIcon />
        </button>
        {menu === 'opacity' && (
          <div
            className="vs-actionbar__popover vs-actionbar__popover--small"
            role="group"
            aria-label="Opacity"
          >
            <p>
              {mixedOpacity
                ? 'Mixed opacity · moving the slider sets all selected objects'
                : 'Object opacity'}
            </p>
            <div className="vs-actionbar__range">
              <input
                aria-label="Set opacity for all selected objects"
                type="range"
                min="0"
                max="100"
                disabled={anyLocked}
                value={opacity}
                onPointerDown={() => adapter.beginGesture()}
                onPointerUp={() => adapter.endGesture()}
                onPointerCancel={() => adapter.endGesture()}
                onChange={(event) =>
                  adapter.updateSelection({ opacity: Number(event.target.value) })
                }
              />
              <output>{mixedOpacity ? 'Mixed' : `${opacity}%`}</output>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
