import { Slider } from './ui/Slider';
import { Popover } from './ui/Popover';
import { FontPicker } from './FontPicker';
import { primaryColor } from '../vision/appearance/capabilities';
import { Button, IconButton } from './ui/Button';
import { CropActions } from './CropActions';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { KonvaCanvasAdapter } from '../vision/canvas/KonvaCanvasAdapter';
import { ColorPicker } from './ColorPicker';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  SlidersIcon,
  ContrastIcon,
  ChevronDownIcon,
} from './icons';

type Props = {
  adapter: KonvaCanvasAdapter;
  onEditStyle: () => void;
  formattingTrigger: RefObject<HTMLButtonElement | null>;
  formattingOpen: boolean;
  onReplaceImage: () => void;
  replacingImage: boolean;
  appearanceInspector?: boolean;
};

function TextSize({
  value,
  disabled,
  onCommit,
  onCancel,
}: {
  value: number;
  disabled: boolean;
  onCommit: (value: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(String(Math.round(value)));
  const cancel = useRef(false);
  useEffect(() => setDraft(String(Math.round(value))), [value]);
  const commit = () => {
    if (cancel.current) {
      cancel.current = false;
      setDraft(String(Math.round(value)));
      return;
    }
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) {
      setDraft(String(Math.round(value)));
      return;
    }
    const clamped = Math.max(8, Math.min(240, Math.round(parsed)));
    if (clamped !== Math.round(value)) onCommit(clamped);
    setDraft(String(clamped));
  };
  return (
    <label className="vs-actionbar__size">
      <input
        type="number"
        aria-label="Text size in points"
        data-tip="Text size in points. Changes apply immediately."
        min={8}
        max={240}
        step={1}
        disabled={disabled}
        value={draft}
        onChange={(event) => {
          const raw = event.target.value;
          const parsed = Number(raw);
          const next = Math.round(parsed);
          setDraft(raw && Number.isFinite(parsed) ? String(next) : raw);
          if (
            raw.trim() &&
            Number.isFinite(parsed) &&
            next >= 8 &&
            next <= 240 &&
            next !== Math.round(value)
          ) {
            onCommit(next);
          }
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            cancel.current = true;
            onCancel();
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
  appearanceInspector = false,
}: Props) {
  const opacityTrigger = useRef<HTMLButtonElement>(null);
  const [opacityOpen, setOpacityOpen] = useState(false);
  const selection = adapter.getSelection();
  const selected = adapter.history.document.items.filter((entry) =>
    selection.ids.includes(entry.id),
  );
  const item = selected.length === 1 ? selected[0] : undefined;
  const anyLocked = selected.some((entry) => !!entry.locked);
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

  if (adapter.adjustingCollage)
    return (
      <div className="vs-actionbar vs-collage-toolbar">
        <span className="vs-collage-toolbar__label">Adjust layout</span>
        <span className="vs-collage-toolbar__hint">Drag a divider to share space</span>
        <Button variant="plain" onClick={() => adapter.resetCollageAdjustment()}>
          Reset layout
        </Button>
        <Button variant="primary" onClick={() => adapter.finishCollageAdjustment()}>
          Done
        </Button>
      </div>
    );

  if (adapter.cropDraft)
    return (
      <div className="vs-actionbar vs-actionbar--cropping">
        <CropActions
          adapter={adapter}
          onCancel={() => adapter.cancelCrop()}
          onApply={() => adapter.applyCrop()}
        />
      </div>
    );

  return (
    <div className="vs-actionbar">
      <span className="vs-actionbar__identity" aria-label={`Selected: ${type}`}>
        {type}
      </span>
      {adapter.canAdjustCollage && (
        <Button variant="plain" onClick={() => adapter.startCollageAdjustment()}>
          Adjust layout
        </Button>
      )}
      <span className="vs-actionbar__separator" aria-hidden="true" />
      {item?.kind === 'text' && (
        <>
          <FontPicker
            value={item.fontFamily}
            disabled={anyLocked}
            onChange={(fontFamily) => adapter.patchItems([{ id: item.id, patch: { fontFamily } }])}
          />
          <TextSize
            key={item.id}
            value={item.fontSize ?? 24}
            disabled={anyLocked}
            onCommit={(fontSize) => adapter.updateSelection({ fontSize })}
            onCancel={() => adapter.cancelGesture()}
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
          {item.scrapbookPhoto ||
          item.frameShape ||
          item.asset?.frameSlot ||
          item.imageFit === 'fill'
            ? 'Adjust photo'
            : 'Crop'}
        </Button>
      )}
      {item && item.kind !== 'text' && (
        <Button
          variant="plain"
          size="sm"
          className="vs-actionbar__button"
          disabled={anyLocked}
          data-tip="Flip horizontally"
          onClick={() => adapter.patchItems([{ id: item.id, patch: { flipX: !item.flipX } }])}
        >
          Flip
        </Button>
      )}
      {item?.kind === 'shape' && !anyLocked && !appearanceInspector && (
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
      {selected.length > 0 && (
        <Button
          ref={formattingTrigger}
          variant="plain"
          size="sm"
          aria-expanded={formattingOpen}
          className="vs-actionbar__button vs-actionbar__button--primary"
          disabledReason={anyLocked ? 'Unlock the selection to edit its appearance' : undefined}
          data-tip={
            anyLocked
              ? 'Unlock the selection to edit its appearance'
              : 'Open detailed properties; each control edits only its named property'
          }
          onClick={onEditStyle}
        >
          <SlidersIcon />{' '}
          {!item
            ? 'Properties'
            : item.kind === 'text'
              ? 'Formatting'
              : item.kind === 'asset'
                ? 'Image effects'
                : 'Appearance'}
        </Button>
      )}

      <div className="vs-actionbar__menu">
        <Button
          className="vs-actionbar__button"
          aria-label="Object transparency"
          ref={opacityTrigger}
          aria-expanded={opacityOpen}
          onClick={() => setOpacityOpen(!opacityOpen)}
        >
          <ContrastIcon /> {Math.round(selection.style.opacity ?? 100)}% <ChevronDownIcon />
        </Button>
        {opacityOpen && (
          <Popover
            anchor={opacityTrigger}
            onDismiss={() => setOpacityOpen(false)}
            className="vs-actionbar__popover vs-actionbar__popover--small"
            role="group"
            aria-label="Transparency"
          >
            <p>Object transparency</p>
            <div className="vs-actionbar__range">
              <Slider
                aria-label="Selection opacity"
                min={0}
                max={100}
                disabled={anyLocked}
                value={selection.style.opacity ?? 100}
                onPointerDown={() => adapter.beginGesture()}
                onPointerUp={() => adapter.endGesture()}
                onPointerCancel={() => adapter.endGesture()}
                onBlur={() => adapter.endGesture()}
                onChange={(event) =>
                  adapter.updateSelection({ opacity: Number(event.target.value) })
                }
              />
              <output>{Math.round(selection.style.opacity ?? 100)}%</output>
            </div>
          </Popover>
        )}
      </div>
    </div>
  );
}
