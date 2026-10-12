import { useRef, useState, type RefObject } from 'react';
import type { StudioAdapter } from '../../vision/contracts';
import { capabilities, primaryColor } from '../../vision/appearance/capabilities';
import { editorFonts, canonicalFontId } from '../../vision/fonts';
import { Button, IconButton } from '../ui/Button';
import { Popover } from '../ui/Popover';
import { BoldIcon, ItalicIcon, UnderlineIcon, SlidersIcon, CloseIcon } from '../icons';
import { applyControl, type InspectorArea } from './appearanceControls';
import { selectedAppearance } from './feature';
import { TechnicalControls } from './TechnicalControls';
import { CreativePalette } from './CreativePalette';
import { CommittedNumber } from './CommittedNumber';
import './hybrid.css';

/** Contextual presentation of the same canonical commands used by the dock/sheet. */
export default function HybridQuickBar({
  adapter,
  onAppearance,
  trigger,
  open,
}: {
  adapter: StudioAdapter;
  onAppearance(): void;
  trigger: RefObject<HTMLButtonElement | null>;
  open: boolean;
}) {
  const item = selectedAppearance(adapter);
  const [menu, setMenu] = useState<'color' | 'stroke' | 'opacity' | null>(null);
  const colorTrigger = useRef<HTMLButtonElement>(null);
  const strokeTrigger = useRef<HTMLButtonElement>(null);
  const opacityTrigger = useRef<HTMLButtonElement>(null);
  if (!item) return null;
  const a = item.appearance,
    cap = capabilities(item)!;
  const fill = 'fill' in a ? a.fill : undefined;
  const colorLabel =
    item.kind === 'text' ? 'Text color' : cap.fill ? 'Shape fill color' : 'Stroke color';
  const colorTarget = cap.fill ? ('fill.color' as const) : ('stroke.color' as const);
  const patchText = (patch: Partial<typeof item>) => {
    const current = selectedAppearance(adapter);
    if (current?.id === item.id && current.kind === 'text' && !current.locked)
      adapter.patchItems([{ id: item.id, patch }]);
  };
  const anchor =
    menu === 'color' ? colorTrigger : menu === 'stroke' ? strokeTrigger : opacityTrigger;
  const area: InspectorArea = menu === 'stroke' ? 'stroke' : 'color';
  return (
    <div
      className="gs-hybrid-quickbar"
      aria-label={`${item.kind} quick formatting`}
      onKeyDown={(event) => {
        if ((event.target as Element).closest('[data-gesture-owner]')) return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          event.stopPropagation();
          adapter.endGesture();
          event.shiftKey ? adapter.redo() : adapter.undo();
        }
        if (event.key === 'Escape') {
          event.stopPropagation();
          setMenu(null);
        }
      }}
    >
      {item.kind === 'text' && (
        <>
          <select
            aria-label="Font family"
            value={canonicalFontId(item.fontFamily)}
            disabled={!!item.locked}
            onChange={(event) =>
              patchText({ fontFamily: event.target.value as typeof item.fontFamily })
            }
          >
            {Object.entries(editorFonts).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <CommittedNumber
            label="Text size in points"
            value={item.fontSize ?? 24}
            min={8}
            max={240}
            disabled={!!item.locked}
            onCommit={(fontSize) => patchText({ fontSize })}
          />
          {(
            [
              { key: 'bold', Icon: BoldIcon },
              { key: 'italic', Icon: ItalicIcon },
              { key: 'underline', Icon: UnderlineIcon },
            ] as const
          ).map(({ key, Icon }) => (
            <IconButton
              key={key}
              aria-label={key.charAt(0).toUpperCase() + key.slice(1)}
              aria-pressed={!!item[key]}
              disabled={!!item.locked}
              onClick={() => patchText({ [key]: !item[key] })}
            >
              <Icon />
            </IconButton>
          ))}
        </>
      )}
      <Button
        ref={colorTrigger}
        className="gs-quick-color"
        aria-label={colorLabel}
        aria-expanded={menu === 'color'}
        aria-haspopup="dialog"
        data-tip={colorLabel}
        disabled={!!item.locked}
        onClick={() => setMenu(menu === 'color' ? null : 'color')}
      >
        <span style={{ background: primaryColor(a) }} />
      </Button>
      {fill && item.kind === 'shape' && (
        <select
          aria-label="Quick fill type"
          value={fill.paint.kind}
          disabled={!!item.locked}
          onChange={(event) => applyControl(adapter, item.id, 'fillMode', event.target.value)}
        >
          <option value="solid">Solid</option>
          <option value="linear">Linear</option>
          <option value="radial">Radial</option>
        </select>
      )}
      {item.kind === 'text' ? (
        <select
          aria-label="Text alignment"
          value={item.align || 'left'}
          disabled={!!item.locked}
          onChange={(event) => patchText({ align: event.target.value as typeof item.align })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      ) : (
        <>
          <Button
            ref={strokeTrigger}
            aria-haspopup="dialog"
            aria-expanded={menu === 'stroke'}
            disabled={!!item.locked}
            onClick={() => setMenu(menu === 'stroke' ? null : 'stroke')}
            aria-label={cap.fill ? 'Quick border' : 'Quick stroke width'}
            data-tip={cap.fill ? 'Border color, width and style' : 'Stroke width and style'}
          >
            {cap.fill ? 'Border' : `Width ${a.stroke.width}`}
          </Button>
          {a.kind === 'open-shape' && (
            <select
              aria-label="Quick stroke style"
              value={a.stroke.style}
              disabled={!!item.locked}
              onChange={(event) =>
                applyControl(adapter, item.id, 'stroke.style', event.target.value)
              }
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          )}
          {(item.kind === 'drawing' || cap.fill) && (
            <Button
              ref={opacityTrigger}
              aria-label="Quick opacity"
              aria-expanded={menu === 'opacity'}
              aria-haspopup="dialog"
              data-tip="Opacity"
              disabled={!!item.locked}
              onClick={() => setMenu(menu === 'opacity' ? null : 'opacity')}
            >
              {Math.round(a.opacity * 100)}%
            </Button>
          )}
        </>
      )}
      <span className="gs-quick-divider" aria-hidden="true" />
      <Button
        ref={trigger}
        aria-label="Appearance"
        className="gs-quick-more"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-tip="More appearance options"
        disabled={!!item.locked}
        onClick={() => {
          setMenu(null);
          onAppearance();
        }}
      >
        <SlidersIcon />
        <span>Appearance</span>
      </Button>
      {menu && (
        <Popover
          anchor={anchor}
          onDismiss={() => setMenu(null)}
          focusOnOpen
          className="gs-quick-popover"
          role="dialog"
          aria-label="Quick appearance control"
        >
          <header>
            <strong>
              {menu === 'color'
                ? colorLabel
                : menu === 'stroke'
                  ? cap.fill
                    ? 'Border'
                    : 'Stroke'
                  : 'Opacity'}
            </strong>
            <IconButton
              aria-label="Close quick appearance control"
              onClick={() => {
                setMenu(null);
                anchor.current?.focus();
              }}
            >
              <CloseIcon />
            </IconButton>
          </header>
          {menu === 'color' && fill && !fill.enabled && (
            <Button onClick={() => applyControl(adapter, item.id, 'fillEnabled', true)}>
              Enable fill
            </Button>
          )}
          {menu === 'color' && (
            <CreativePalette
              adapter={adapter}
              id={item.id}
              target={colorTarget}
              value={primaryColor(a)}
              label={colorLabel}
              disabled={!!fill && !fill.enabled}
            />
          )}
          <TechnicalControls
            key={`${item.id}:${menu}`}
            adapter={adapter}
            id={item.id}
            area={area}
            only={menu === 'color' ? colorTarget : menu === 'opacity' ? 'opacity' : undefined}
          />
        </Popover>
      )}
    </div>
  );
}
