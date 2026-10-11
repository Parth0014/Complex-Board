import { itemOpacity } from '../vision/appearance/capabilities';
import { primaryColor } from '../vision/appearance/capabilities';
import { Popover } from './ui/Popover';
import { Button, IconButton } from './ui/Button';
import { editorFonts } from '../vision/fonts';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { KonvaCanvasAdapter } from '../vision/canvas/KonvaCanvasAdapter';
import { ColorPicker } from './ColorPicker';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  ChevronDownIcon,
  ContrastIcon,
  SlidersIcon,
} from './icons';

type Props = {
  adapter: KonvaCanvasAdapter;
  onEditStyle: () => void;
  formattingTrigger: RefObject<HTMLButtonElement | null>;
  formattingOpen: boolean;
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
        data-tip="Text size in points. Press Enter to apply."
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

export function SelectionToolbar({
  adapter,
  onEditStyle,
  formattingTrigger,
  formattingOpen,
  onReplaceImage,
  replacingImage,
}: Props) {
  const selection = adapter.getSelection();
  const selected = adapter.history.document.items.filter((entry) =>
    selection.ids.includes(entry.id),
  );
  const item = selected.length === 1 ? selected[0] : undefined;
  const anyLocked = selected.some((entry) => !!entry.locked);
  const mixedOpacity = selected.some(
    (entry) => itemOpacity(entry) !== (selected[0] ? itemOpacity(selected[0]) : 1),
  );
  const opacity = Math.round((selected[0] ? itemOpacity(selected[0]) : 1) * 100);
  const [menu, setMenu] = useState<'opacity' | null>(null);
  const opacityTrigger = useRef<HTMLButtonElement>(null);
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
    <div className="vs-actionbar">
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
            <div className="vs-actionbar__color" data-tip="Change only the selected text color">
              <ColorPicker
                label="Text color"
                value={primaryColor(item.appearance)}
                onChange={(value) => adapter.setAppearanceField('fill.color', value)}
              />
            </div>
          )}
          <IconButton
            className={`vs-actionbar__button vs-actionbar__format${item.bold ? ' is-active' : ''}`}
            aria-label="Bold"
            data-tip="Bold selected text"
            aria-pressed={!!item.bold}
            disabled={anyLocked}
            onClick={() => {
              const nextBold = !item.bold;
              adapter.patchItems([
                {
                  id: item.id,
                  patch: {
                    bold: nextBold,
                  },
                },
              ]);
            }}
          >
            <BoldIcon />
          </IconButton>
          <IconButton
            className={`vs-actionbar__button vs-actionbar__format${item.italic ? ' is-active' : ''}`}
            aria-label="Italic"
            data-tip="Italicize selected text"
            aria-pressed={!!item.italic}
            disabled={anyLocked}
            onClick={() => {
              const nextItalic = !item.italic;
              adapter.patchItems([
                {
                  id: item.id,
                  patch: {
                    italic: nextItalic,
                  },
                },
              ]);
            }}
          >
            <ItalicIcon />
          </IconButton>
          <IconButton
            className={`vs-actionbar__button vs-actionbar__format${item.underline ? ' is-active' : ''}`}
            aria-label="Underline"
            data-tip="Underline selected text"
            aria-pressed={!!item.underline}
            disabled={anyLocked}
            onClick={() => {
              const nextUnderline = !item.underline;
              adapter.patchItems([
                {
                  id: item.id,
                  patch: {
                    underline: nextUnderline,
                  },
                },
              ]);
            }}
          >
            <UnderlineIcon />
          </IconButton>
          <IconButton
            className={`vs-actionbar__button vs-actionbar__format${item.strike ? ' is-active' : ''}`}
            aria-label="Strikethrough"
            data-tip="Strikethrough selected text"
            aria-pressed={!!item.strike}
            disabled={anyLocked}
            onClick={() => {
              const nextStrike = !item.strike;
              adapter.patchItems([
                {
                  id: item.id,
                  patch: {
                    strike: nextStrike,
                  },
                },
              ]);
            }}
          >
            <StrikeIcon />
          </IconButton>
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
            value={primaryColor(item.appearance)}
            onChange={(color) => adapter.changeAppearance({ property: 'stroke', value: { color } })}
          />
        </div>
      )}
      {item?.kind === 'asset' && item.asset?.provider !== 'curated-v1' && (
        <Button
          className="vs-actionbar__button"
          disabled={anyLocked}
          onClick={() => adapter.startImageCrop()}
        >
          Crop
        </Button>
      )}
      {item && (
        <Button
          className="vs-actionbar__button"
          disabled={anyLocked}
          onClick={() => adapter.patchItems([{ id: item.id, patch: { flipX: !item.flipX } }])}
        >
          Flip
        </Button>
      )}
      {item?.kind === 'shape' && !anyLocked && (
        <div
          className="vs-actionbar__color"
          data-tip="Set a solid fill color. Replaces any gradient fill."
        >
          <span>{item.appearance.kind === 'open-shape' ? 'Stroke' : 'Solid fill'}</span>
          <ColorPicker
            label={
              item.appearance.kind === 'open-shape' ? 'Shape stroke color' : 'Shape solid fill'
            }
            value={primaryColor(item.appearance)}
            onChange={(color) =>
              'fill' in item.appearance
                ? adapter.changeAppearance({
                    property: 'fill',
                    value: { enabled: true, paint: { kind: 'solid', color } },
                  })
                : adapter.changeAppearance({ property: 'stroke', value: { color } })
            }
          />
        </div>
      )}
      {item?.kind === 'asset' && item.asset?.provider !== 'curated-v1' && (
        <Button
          className="vs-actionbar__button"
          disabled={anyLocked || replacingImage || !!adapter.cropDraft || !!adapter.originalPreview}
          onClick={onReplaceImage}
        >
          {replacingImage ? 'Replacing…' : 'Replace image'}
        </Button>
      )}
      {item && (
        <Button
          ref={formattingTrigger}
          aria-expanded={formattingOpen}
          aria-haspopup="dialog"
          className="vs-actionbar__button vs-actionbar__button--primary"
          disabled={anyLocked}
          data-tip={
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
        </Button>
      )}
      <div className="vs-actionbar__menu">
        <Button
          className="vs-actionbar__button"
          aria-haspopup="true"
          aria-label="Object opacity"
          ref={opacityTrigger}
          aria-expanded={menu === 'opacity'}
          onClick={() => setMenu((current) => (current === 'opacity' ? null : 'opacity'))}
        >
          <ContrastIcon /> {mixedOpacity ? 'Mixed' : `${opacity}%`} <ChevronDownIcon />
        </Button>
        {menu === 'opacity' && (
          <Popover
            anchor={opacityTrigger}
            onDismiss={() => setMenu(null)}
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
          </Popover>
        )}
      </div>
    </div>
  );
}
