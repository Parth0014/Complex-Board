import type { BoardItem } from '../../vision/document';
import type { InspectorTabProps } from './InspectorTabProps';
import { InspectorSection as Sec } from './InspectorSection';
import { Button, IconButton } from '../ui/Button';

import { Slider } from '../ui/Slider';
import { NumberField } from '../ui/NumberField';
import { ColorPicker } from '../ColorPicker';
import { FontPicker } from '../FontPicker';
import { capabilities } from '../../vision/appearance/capabilities';
import { svgColors, svgColorValue } from '../../vision/svgColors';
import {
  DIGITAL_CUTOUT_EDGE_WIDTH,
  DIGITAL_CUTOUT_EDGE_COLOR,
} from '../../vision/digitalCutoutEdge';
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikeIcon,
  ImageIcon,
  DropletIcon,
  PenIcon,
} from '../icons';
export function EditTab({
  adapter,
  item,
  selected,
  locked,
  sharedLayout,
  allText,
  allAssets,
  allDrawings,
  sharedFill,
  read,
  set,
  mixed,
  number,
  color,
  patch,
  runMedia,
}: InspectorTabProps) {
  const edgeCapable = selected.every(
    (entry) => entry.kind === 'asset' || (entry.kind === 'shape' && !!capabilities(entry)?.fill),
  );
  const edgeStyles = selected.map((entry) =>
    entry.paperEdge
      ? 'paper'
      : Number(read(entry, 'silhouette.width') || 0) > 0
        ? 'sticker'
        : 'none',
  );
  const edgeStyle = edgeStyles.every((style) => style === edgeStyles[0]) ? edgeStyles[0] : 'mixed';
  return (
    <>
      {' '}
      {allText && item.kind === 'text' && (
        <Sec title="Text" open>
          {selected.length === 1 && (
            <label className="vs-field">
              <span>Content</span>
              <textarea
                className="vs-textarea"
                aria-label="Styled text"
                value={item.text || ''}
                onChange={(event) => patch({ text: event.target.value })}
              />
            </label>
          )}
          <div className="vs-field inspector-font-field">
            <span>Font</span>
            <FontPicker
              value={item.fontFamily}
              disabled={locked}
              onChange={(fontFamily) => patch({ fontFamily })}
            />
          </div>
          <div className="inspector-text-size-color">
            {number('Text size', 'fontSize', 8, 240)}
            <div className="vs-field inspector-text-color">
              <span>Color</span>
              <ColorPicker
                label="Text color"
                showValue
                value={String(read(item, 'fill.color') || '#33272b')}
                onChange={(value) => set('fill.color', value)}
              />
            </div>
          </div>
          <div className="inspector-text-style" role="group" aria-label="Text style">
            {(
              [
                ['bold', 'Bold', BoldIcon],
                ['italic', 'Italic', ItalicIcon],
                ['underline', 'Underline', UnderlineIcon],
                ['strike', 'Strikethrough', StrikeIcon],
              ] as const
            ).map(([field, label, Icon]) => (
              <IconButton
                key={field}
                aria-label={label}
                aria-pressed={!!item[field]}
                onClick={() => patch({ [field]: !item[field] })}
              >
                <Icon />
              </IconButton>
            ))}
          </div>
          <label className="vs-field">
            <span>Alignment</span>
            <div
              className="inspector-choices inspector-text-alignment"
              role="group"
              aria-label="Text alignment"
            >
              {['left', 'center', 'right', 'justify'].map((value) => (
                <Button
                  key={value}
                  disabled={locked}
                  aria-pressed={(item.align || 'left') === value}
                  onClick={() => patch({ align: value as typeof item.align })}
                >
                  {value}
                </Button>
              ))}
            </div>
          </label>
        </Sec>
      )}
      {allAssets &&
        selected.length === 1 &&
        item.kind === 'asset' &&
        item.asset?.provider !== 'curated-v1' && (
          <Sec title="Image" open icon={<ImageIcon />}>
            <label className="vs-field">
              <span>Frame shape</span>
              <select
                className="vs-select"
                aria-label="Shape frame"
                value={item.frameShape || ''}
                disabled={locked || !!item.asset?.frameSlot || sharedLayout}
                onChange={(event) =>
                  patch({
                    frameShape: (event.target.value || undefined) as BoardItem['frameShape'],
                  })
                }
              >
                {['', 'circle', 'heart', 'triangle', 'hexagon', 'star', 'cloud'].map((value) => (
                  <option key={value} value={value}>
                    {value ? value[0].toUpperCase() + value.slice(1) : 'Rectangle'}
                  </option>
                ))}
              </select>
            </label>

            {item.asset?.editable.colors &&
              item.asset.assetUrl.startsWith('data:image/svg+xml,') && (
                <Sec title="Graphic colors" icon={<DropletIcon />}>
                  {svgColors(item.asset.assetUrl).map((from) => (
                    <div className="vs-field" key={from}>
                      <span>
                        Replace <code>{from}</code>
                      </span>
                      <ColorPicker
                        allowAlpha={false}
                        label={`Replace color ${from}`}
                        value={item.colorOverrides?.[from] || svgColorValue(from)}
                        onChange={(value) => void runMedia(() => adapter.recolorAsset(from, value))}
                      />
                    </div>
                  ))}
                </Sec>
              )}
          </Sec>
        )}{' '}
      {sharedFill && !allText && item.kind !== 'asset' && capabilities(item)?.fill && (
        <Sec title={allText ? 'Color' : 'Fill'} open icon={<DropletIcon />}>
          {color(
            allText ? 'Text color' : selected.length === 1 ? 'Shape fill color' : 'Fill color',
            'fill.color',
            '#b48ce3',
          )}
          {item.kind === 'shape' && (
            <>
              <label className="vs-check">
                <input
                  type="checkbox"
                  checked={!!read(item, 'fill.disabled')}
                  onChange={(event) => set('fill.disabled', event.target.checked)}
                />
                No fill (outline only)
              </label>
            </>
          )}
        </Sec>
      )}
      {allDrawings && item.kind === 'drawing' && (
        <Sec title="Stroke" open icon={<PenIcon />}>
          {number('Pen width', 'stroke.width', 1, 50)}
          {color('Stroke color', 'stroke.color', '#573575')}
        </Sec>
      )}
      {
        <>
          {edgeCapable && (
            <Sec title="Sticker edge" open>
              <label className="vs-field">
                <span>Edge style</span>
                <select
                  className="vs-select"
                  aria-label="Edge style"
                  value={edgeStyle}
                  disabled={locked}
                  onChange={(event) => {
                    adapter.beginGesture();
                    try {
                      const style = event.target.value;
                      adapter.finishTornOutline();
                      patch({
                        paperEdge: undefined,
                      });
                      set('silhouette.width', style === 'sticker' ? DIGITAL_CUTOUT_EDGE_WIDTH : 0);
                      if (style === 'sticker') set('silhouette.color', DIGITAL_CUTOUT_EDGE_COLOR);
                    } finally {
                      adapter.endGesture();
                    }
                  }}
                >
                  {edgeStyle === 'mixed' && (
                    <option value="mixed" disabled>
                      Mixed
                    </option>
                  )}
                  <option value="none">None</option>
                  <option value="sticker">Smooth white sticker</option>
                  {edgeStyle === 'paper' && (
                    <option value="paper" disabled>
                      Saved paper edge
                    </option>
                  )}
                </select>
              </label>
              {edgeStyle === 'sticker' && number('Sticker edge width', 'silhouette.width', 0, 30)}
            </Sec>
          )}
          {selected.some((entry) => read(entry, 'effect') && read(entry, 'effect') !== 'none') && (
            <Button size="sm" onClick={() => set('effect', 'none')}>
              Clear saved effect
            </Button>
          )}
          {!edgeCapable &&
            selected.some((entry) => Number(read(entry, 'silhouette.width') || 0) > 0) && (
              <Button size="sm" onClick={() => set('silhouette.width', 0)}>
                Remove sticker edge
              </Button>
            )}
          {allText && Number(read(item, 'stroke.width') || 0) > 0 && (
            <Button size="sm" onClick={() => set('stroke.width', 0)}>
              Remove text outline
            </Button>
          )}
          <Sec title="Opacity">
            <div className="object-inspector-range">
              <Slider
                aria-label="Opacity"
                aria-valuetext={
                  mixed('opacity')
                    ? 'Mixed'
                    : `${Math.round(Number(read(item, 'opacity') ?? 1) * 100)}%`
                }
                min={0}
                max={100}
                value={Math.round(Number(read(item, 'opacity') ?? 1) * 100)}
                onPointerDown={() => adapter.beginGesture()}
                onPointerUp={() => adapter.endGesture()}
                onPointerCancel={() => adapter.endGesture()}
                onKeyDown={(event) => {
                  if (
                    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
                      event.key,
                    ) &&
                    !adapter.history.gestureActive
                  )
                    adapter.beginGesture();
                }}
                onKeyUp={() => adapter.endGesture()}
                onBlur={() => adapter.endGesture()}
                onChange={(event) => set('opacity', Number(event.target.value) / 100)}
              />
              <NumberField
                label="Opacity (%)"
                unit="%"
                min={0}
                max={100}
                value={Math.round(Number(read(item, 'opacity') ?? 1) * 100)}
                disabled={locked}
                onBegin={() => adapter.beginGesture()}
                onEnd={() => adapter.endGesture()}
                onCancel={() => adapter.cancelGesture()}
                onCommit={(value) => set('opacity', value / 100)}
              />
            </div>
          </Sec>
          {!allDrawings && !allText && (
            <Sec
              title={
                item.kind === 'shape' && item.appearance?.kind === 'open-shape'
                  ? 'Stroke'
                  : 'Border'
              }
            >
              {number(
                item.appearance?.kind === 'open-shape' ? 'Stroke width' : 'Border width',
                'stroke.width',
                0,
                30,
              )}
              {color(
                item.appearance?.kind === 'open-shape' ? 'Stroke color' : 'Border color',
                'stroke.color',
                '#33272b',
              )}
              {item.appearance?.kind === 'open-shape' && (
                <label className="vs-field">
                  <span>Line style</span>
                  <div className="inspector-choices" role="group" aria-label="Stroke style">
                    {['solid', 'dashed', 'dotted'].map((value) => (
                      <Button
                        key={value}
                        disabled={locked}
                        aria-pressed={(read(item, 'stroke.style') || 'solid') === value}
                        onClick={() => set('stroke.style', value)}
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                </label>
              )}
            </Sec>
          )}
        </>
      }
    </>
  );
}
