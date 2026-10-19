import { ImageFitPresets } from './ImageFitPresets';
import { ImageFilterPresets } from './ImageFilterPresets';
import { Slider } from './ui/Slider';
// Canvas formatting and layer controls.
import { errorMessage } from './errors';
import { appearanceValue, type AppearanceField } from '../vision/appearance/controls';
import { capabilities } from '../vision/appearance/capabilities';
import { Button, IconButton } from './ui/Button';
import { ColorPicker } from './ColorPicker';
import { svgColors, svgColorValue } from '../vision/svgColors';
import { useEffect, useId, useState, useRef, type ReactNode } from 'react';
import type { EditorAdapter } from '../vision/contracts';
import type { BoardItem } from '../vision/document';
import { canonicalFontId } from '../vision/fonts';
import { FontPicker } from './FontPicker';
import {
  BringFrontIcon,
  AlignIcon,
  FitIcon,
  AlignLeftIcon,
  AlignCenterHIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignMiddleIcon,
  AlignBottomIcon,
  CloseIcon,
  CropIcon,
  DropletIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  LayersIcon,
  LockIcon,
  PenIcon,
  SlidersIcon,
  TypeIcon,
  UndoIcon,
  UnlockIcon,
} from './icons';

export type EditorPanel = 'style' | 'layers' | null;

/** Secondary tools stay available without competing with the primary controls. */
function Sec({
  title,
  children,
  open = false,
  icon,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
  icon?: ReactNode;
}) {
  return (
    <details className="vs-properties-section" open={open}>
      <summary>
        <span className="object-inspector-section-title">
          {['Object bounds', 'Alignment', 'Position & rotation'].includes(title) && icon}
          {title === 'Object bounds' ? 'Size' : title}
        </span>
      </summary>
      <div className="vs-properties-section__body">{children}</div>
    </details>
  );
}
function BoundsInput({
  value,
  label,
  disabled,
  onCommit,
  onCancel,
}: {
  value: number;
  label: string;
  disabled: boolean;
  onCommit(value: number): void;
  onCancel(): void;
}) {
  const [draft, setDraft] = useState(String(Math.round(value)));
  const focused = useRef(false);
  const cancelled = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(Math.round(value)));
  }, [value]);
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(String(Math.round(value)));
      return;
    }
    const next = Number(draft);
    if (draft.trim() && Number.isFinite(next)) {
      const clamped = Math.max(10, Math.min(10000, Math.round(next)));
      if (clamped !== Math.round(value)) onCommit(clamped);
      setDraft(String(clamped));
    } else setDraft(String(Math.round(value)));
  };
  return (
    <span className="vs-input-unit">
      <input
        className="vs-input"
        aria-label={label}
        type="number"
        min="10"
        max="10000"
        disabled={disabled}
        value={draft}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(event) => {
          const raw = event.target.value;
          const parsed = Number(raw);
          const next = Math.round(parsed);
          setDraft(raw && Number.isFinite(parsed) ? String(next) : raw);
          if (
            raw.trim() &&
            Number.isFinite(parsed) &&
            next >= 10 &&
            next <= 10000 &&
            (value === undefined || next !== Math.round(value))
          )
            onCommit(next);
        }}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            cancelled.current = true;
            onCancel();
            event.stopPropagation();
            setDraft(String(Math.round(value)));
            focused.current = false;
            event.currentTarget.blur();
          }
        }}
      />
      <span className="vs-input-unit__suffix" aria-hidden="true">
        px
      </span>
    </span>
  );
}

/** Valid numeric edits update immediately; empty drafts never change the canvas. */
function CommitNumber({
  label,
  value,
  min,
  max,
  step,
  disabled,
  placeholder,
  onCommit,
  onCancel,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  placeholder?: string;
  onCommit: (value: number) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(Math.round(value)));
  const editing = useRef(false);
  const cancelled = useRef(false);
  useEffect(() => {
    if (!editing.current) setDraft(value === undefined ? '' : String(Math.round(value)));
  }, [value]);
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(value === undefined ? '' : String(Math.round(value)));
      return;
    }
    if (draft.trim() === '' || !Number.isFinite(Number(draft))) {
      setDraft(value === undefined ? '' : String(Math.round(value)));
      return;
    }
    const clamped = Math.min(max, Math.max(min, Math.round(Number(draft))));
    if (value === undefined || clamped !== Math.round(value)) onCommit(clamped);
    setDraft(String(clamped));
  };
  return (
    <input
      className="vs-input"
      aria-label={label}
      type="number"
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      value={draft}
      onFocus={() => {
        editing.current = true;
      }}
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
          (value === undefined || next !== Math.round(value))
        )
          onCommit(next);
      }}
      onBlur={() => {
        editing.current = false;
        commit();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          cancelled.current = true;
          onCancel();
          setDraft(value === undefined ? '' : String(Math.round(value)));
          event.stopPropagation();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
export function EditorFeatures({
  adapter,
  panel,
  setPanel,
  inline = false,
}: {
  adapter: EditorAdapter;
  panel: EditorPanel;
  inline?: boolean;
  setPanel: (panel: EditorPanel) => void;
}) {
  const [error, setError] = useState('');
  const [inspectorPage, setInspectorPage] = useState<'edit' | 'layout'>('edit');
  const inspectorId = useId();
  const runMedia = async (action: () => Promise<void>) => {
    setError('');
    try {
      await action();
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  const item = adapter.history.document.items.find((item) => adapter.selectedIds.includes(item.id));
  const patch = (patch: Partial<BoardItem>) =>
    adapter.patchItems(adapter.selectedIds.map((id) => ({ id, patch })));
  const crop = adapter.cropDraft?.id === item?.id ? adapter.cropDraft?.crop : null;

  const layerDrag = (event: React.DragEvent, key: string, path: string[]) => {
    event.stopPropagation();
    event.dataTransfer.setData('application/x-studio-layer', JSON.stringify({ key, path }));
  };
  const layerDrop = (event: React.DragEvent, key: string, path: string[]) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const value = JSON.parse(event.dataTransfer.getData('application/x-studio-layer'));
      if (JSON.stringify(value.path) === JSON.stringify(path))
        adapter.reorderLayer(value.key, key, path);
    } catch {
      /* unrelated drop */
    }
  };
  const selected = adapter.history.document.items.filter((item) =>
    adapter.selectedIds.includes(item.id),
  );
  const allText = selected.every((entry) => entry.kind === 'text');
  const allAssets = selected.every((entry) => entry.kind === 'asset');
  const allDrawings = selected.every((entry) => entry.kind === 'drawing');
  const sharedFill = selected.every((entry) => entry.kind !== 'asset' && capabilities(entry)?.fill);
  const locked = selected.some((entry) => entry.locked);
  const sharedLayout = selected.some((entry) => entry.collageLayout);
  const selectionTitle =
    selected.length > 1
      ? `${selected.length} items`
      : item?.kind === 'text'
        ? 'Text'
        : item?.kind === 'asset'
          ? item.asset?.provider === 'curated-v1'
            ? 'Artwork'
            : 'Photo'
          : item?.kind === 'shape'
            ? 'Shape'
            : item?.kind === 'drawing'
              ? 'Drawing'
              : 'Style';
  const selectionMeta =
    selected.length > 1
      ? 'Edit shared properties or arrange the selection.'
      : item
        ? item.text || item.asset?.title || item.shape || 'Selected object'
        : 'Select an object on the board to see its properties.';
  type Field = keyof BoardItem | AppearanceField;
  const assetFields: Partial<Record<AppearanceField, keyof BoardItem>> = {
    'stroke.width': 'borderWidth',
    'stroke.color': 'borderColor',
    'stroke.style': 'borderStyle',
    'shadow.preset': 'shadow',
    'shadow.color': 'shadowColor',
    'shadow.opacity': 'shadowOpacity',
    'shadow.blur': 'shadowBlur',
    'shadow.offsetX': 'shadowOffsetX',
    'shadow.offsetY': 'shadowOffsetY',
    'silhouette.width': 'stickerWidth',
    'silhouette.color': 'stickerColor',
    opacity: 'opacity',
    effect: 'effect',
  };
  const isAppearance = (key: Field): key is AppearanceField =>
    key.includes('.') || ['opacity', 'effect', 'background'].includes(key);
  const read = (entry: BoardItem | undefined, key: Field): unknown => {
    if (!entry) return undefined;
    if (!isAppearance(key)) return entry[key];
    if (entry.kind !== 'asset') return appearanceValue(entry, key);
    const field = assetFields[key];
    if (!field) return undefined;
    if (entry[field] !== undefined) return entry[field];
    if (key === 'shadow.opacity') return 0.25;
    if (key === 'shadow.offsetX') return 3;
    if (key === 'shadow.offsetY') return 5;
    if (key === 'shadow.blur')
      return entry.shadow === 'soft' ? 20 : entry.shadow === 'medium' ? 10 : 0;
    return undefined;
  };
  const set = (key: Field, value: unknown) => {
    if (!isAppearance(key)) {
      patch({ [key]: value });
      return;
    }
    const ownGesture = !adapter.history.gestureActive;
    if (ownGesture) adapter.beginGesture();
    try {
      adapter.setAppearanceField(key, value);
      const assetField = assetFields[key];
      if (assetField)
        adapter.patchItems(
          selected
            .filter((entry) => entry.kind === 'asset')
            .map((entry) => ({
              id: entry.id,
              patch: {
                ...(key.startsWith('shadow.') &&
                key !== 'shadow.preset' &&
                (!entry.shadow || entry.shadow === 'none')
                  ? { shadow: 'soft' as const }
                  : {}),
                ...(key === 'shadow.preset'
                  ? {
                      shadowColor: undefined,
                      shadowOpacity: undefined,
                      shadowBlur: undefined,
                      shadowOffsetX: undefined,
                      shadowOffsetY: undefined,
                    }
                  : {}),
                [assetField]: value,
              },
            })),
        );
    } finally {
      if (ownGesture) adapter.endGesture();
    }
  };
  const mixed = (key: Field) => selected.some((other) => read(other, key) !== read(item, key));
  const number = (label: string, key: Field, min: number, max: number, step = 1) => {
    const scale = ['opacity', 'shadow.opacity', 'brightness', 'saturation'].includes(key) ? 100 : 1;
    const fallback = key === 'opacity' || key === 'lineHeight' ? 1 : key === 'fontWeight' ? 400 : 0;
    const value = mixed(key) ? undefined : Number(read(item, key) ?? fallback) * scale;
    return (
      <label className="vs-field">
        <span>{label}</span>
        <CommitNumber
          label={label}
          value={value}
          min={min * scale}
          max={max * scale}
          step={Math.max(1, step * scale)}
          placeholder={mixed(key) ? 'Mixed' : undefined}
          disabled={
            ['rotation', 'width', 'height', 'x', 'y'].includes(key) &&
            (sharedLayout || selected.some((entry) => entry.locked || entry.connector))
          }
          onCommit={(next) => set(key, next / scale)}
          onCancel={() => adapter.cancelGesture()}
        />
      </label>
    );
  };
  const color = (label: string, key: Field, fallback: string) => (
    <div className="vs-field">
      <span>
        {label}
        {mixed(key) && ' · Mixed'}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <ColorPicker
          label={label}
          value={String(read(item, key) || fallback)}
          onChange={(value) => set(key, value)}
        />
        <code style={{ fontSize: 'var(--gs-text-13)', color: 'var(--gs-text-secondary)' }}>
          {String(read(item, key) || fallback).toUpperCase()}
        </code>
      </span>
    </div>
  );

  const layerIcon = (entry: BoardItem) =>
    entry.asset && entry.asset.provider !== 'upload' ? (
      <img className="vs-layer__thumb" src={entry.asset.previewUrl} alt="" />
    ) : entry.kind === 'text' ? (
      <span className="vs-layer__thumb vs-layer__thumb--icon" aria-hidden="true">
        <TypeIcon />
      </span>
    ) : entry.kind === 'asset' ? (
      <span className="vs-layer__thumb vs-layer__thumb--icon" aria-hidden="true">
        <ImageIcon />
      </span>
    ) : (
      <span className="vs-layer__thumb vs-layer__thumb--icon" aria-hidden="true">
        <SlidersIcon />
      </span>
    );

  const groups = (path: string[], depth = 0): ReactNode => {
    const members = adapter.history.document.items.filter((item) =>
      path.every((id, index) => adapter.path(item)[index] === id),
    );
    const keys = [
      ...new Set([...members].reverse().map((item) => adapter.path(item)[depth] || item.id)),
    ];
    return keys.map((key) => {
      const children = members.filter((item) => (adapter.path(item)[depth] || item.id) === key),
        group = adapter.path(children[0]).length > depth;
      if (group)
        return (
          <details key={key} className="vs-layer-group layer-group">
            <summary
              draggable
              onDragStart={(event) => layerDrag(event, key, path)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => layerDrop(event, key, path)}
              onClick={() => {
                adapter.groupScope = path;
                adapter.select(children.map((item) => item.id));
              }}
            >
              <LayersIcon /> Group ({children.length})
            </summary>
            <div className="vs-layer-group__kids">{groups([...path, key], depth + 1)}</div>
          </details>
        );
      const entry = children[0];
      const label = entry.text || entry.asset?.title || entry.shape || 'Drawing';
      return (
        <div
          key={key}
          className={`vs-layer layer-row${adapter.selectedIds.includes(key) ? ' is-selected' : ''}`}
          draggable
          onDragStart={(event) => layerDrag(event, key, path)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => layerDrop(event, key, path)}
        >
          {layerIcon(entry)}
          <Button
            className="vs-layer__name"
            data-tip={`Select ${label}`}
            aria-pressed={adapter.selectedIds.includes(key)}
            onClick={() => {
              adapter.groupScope = adapter.path(entry);
              adapter.select([key]);
            }}
          >
            {label}
          </Button>
          <Button
            className={`vs-icon-btn${entry.hidden ? ' is-off' : ''}`}
            data-tip={entry.hidden ? `Show ${label}` : `Hide ${label}`}
            aria-label={`${entry.hidden ? 'Show' : 'Hide'} ${label}`}
            onClick={() => adapter.patchItems([{ id: key, patch: { hidden: !entry.hidden } }])}
          >
            {entry.hidden ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
          <Button
            className={`vs-icon-btn${entry.locked ? '' : ' is-off'}`}
            data-tip={entry.locked ? 'Unlock layer' : 'Lock layer'}
            aria-label={`${entry.locked ? 'Unlock' : 'Lock'} layer`}
            onClick={() => adapter.patchItems([{ id: key, patch: { locked: !entry.locked } }])}
          >
            {entry.locked ? <LockIcon /> : <UnlockIcon />}
          </Button>
        </div>
      );
    });
  };

  return (
    <div
      role="group"
      className={`vs-inspector object-inspector${inline ? ' vs-inspector--inline' : ''}${panel ? '' : ' is-collapsed'}`}
      aria-label="Object inspector"
      hidden={!panel}
    >
      <header className="object-inspector-header">
        <div>
          <h2>{panel === 'layers' ? 'Layers' : selectionTitle}</h2>
          <p>{selectionMeta}</p>
        </div>
        <IconButton aria-label="Close editor panel" onClick={() => setPanel(null)}>
          <CloseIcon />
        </IconButton>
      </header>
      <div className="object-inspector-tabs" role="tablist" aria-label="Object tools">
        {(['edit', 'layout', 'layers'] as const).map((id, index) => (
          <Button
            key={id}
            role="tab"
            id={`${inspectorId}-${id}`}
            aria-controls={`${inspectorId}-panel`}
            aria-selected={
              id === 'layers' ? panel === 'layers' : panel === 'style' && inspectorPage === id
            }
            tabIndex={
              (id === 'layers' ? panel === 'layers' : panel === 'style' && inspectorPage === id)
                ? 0
                : -1
            }
            onClick={() => {
              setPanel(id === 'layers' ? 'layers' : 'style');
              if (id !== 'layers') setInspectorPage(id);
            }}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const tabs = Array.from(
                event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                  '[role="tab"]',
                ),
              );
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? 2
                    : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
              tabs[next].click();
              tabs[next].focus();
            }}
          >
            {id === 'edit' ? 'Edit' : id === 'layout' ? 'Layout' : 'Layers'}
          </Button>
        ))}
      </div>
      <div
        className="vs-inspector__body object-inspector-body"
        id={`${inspectorId}-panel`}
        role="tabpanel"
        aria-labelledby={`${inspectorId}-${panel === 'layers' ? 'layers' : inspectorPage}`}
      >
        {error && (
          <p className="vs-alert vs-alert--error" role="alert">
            {error}
          </p>
        )}

        {panel === 'style' && locked && (
          <div className="object-inspector-notice" role="status">
            Unlock the selection to edit its properties.
            <Button
              size="sm"
              onClick={() =>
                adapter.patchItems(
                  selected.map((entry) => ({ id: entry.id, patch: { locked: false } })),
                )
              }
            >
              Unlock selection
            </Button>
          </div>
        )}
        {(panel ?? 'style') === 'layers' && (
          <>
            <Sec title="Layer stack" open icon={<LayersIcon />}>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--gs-text-13)',
                  color: 'var(--gs-text-secondary)',
                }}
              >
                Drag layers to reorder.
              </p>
              <div className="vs-layers">{groups([])}</div>
              <div
                style={{
                  fontSize: 'var(--gs-text-13)',
                  fontWeight: 600,
                  color: 'var(--gs-text-secondary)',
                  padding: '8px 10px',
                  background: 'var(--gs-surface-muted)',
                  borderRadius: 10,
                }}
              >
                Background
              </div>
            </Sec>
            <Sec title="Arrange" open icon={<BringFrontIcon />}>
              <div className="shape-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {(['forward', 'backward', 'front', 'back'] as const).map((position) => (
                  <Button
                    key={position}
                    disabled={!adapter.selectedIds.length}
                    onClick={() => adapter.arrangeSelection(position)}
                  >
                    {position[0].toUpperCase() + position.slice(1)}
                  </Button>
                ))}
              </div>
            </Sec>
            {adapter.groupScope.length > 0 && (
              <Button
                variant="secondary"
                style={{ justifyContent: 'center' }}
                onClick={() => adapter.exitGroup()}
              >
                <UndoIcon /> Exit group ({adapter.groupScope.length})
              </Button>
            )}
          </>
        )}

        {(panel ?? 'style') === 'style' &&
          (!item ? (
            <div className="vs-inspector__empty">
              <span className="vs-empty__icon" aria-hidden="true">
                <SlidersIcon />
              </span>
              <strong>Select an object</strong>
              <p>Choose an item on the canvas to edit it.</p>
            </div>
          ) : (
            <fieldset className="object-inspector-fields" disabled={locked}>
              {inspectorPage === 'layout' && (
                <Sec title="Alignment" open icon={<AlignIcon />}>
                  {' '}
                  <div
                    className="object-inspector-alignment"
                    role="group"
                    aria-label="Align selection"
                  >
                    {(
                      [
                        ['left', 'Left', AlignLeftIcon],
                        ['center', 'Horizontal center', AlignCenterHIcon],
                        ['right', 'Right', AlignRightIcon],
                        ['top', 'Top', AlignTopIcon],
                        ['middle', 'Vertical center', AlignMiddleIcon],
                        ['bottom', 'Bottom', AlignBottomIcon],
                      ] as const
                    ).map(([alignment, label, Icon]) => (
                      <Button
                        key={alignment}
                        disabled={sharedLayout || locked}
                        aria-label={`Align ${alignment}`}
                        data-tip={label}
                        onClick={() => adapter.alignSelection(alignment)}
                      >
                        <Icon />
                      </Button>
                    ))}
                  </div>
                </Sec>
              )}
              {inspectorPage === 'layout' && !item.connector && (
                <Sec title="Object bounds" open icon={<FitIcon />}>
                  <div className="vs-row-2">
                    {(['width', 'height'] as const).map((key) => (
                      <label className="vs-field" key={key}>
                        <span>{key === 'width' ? 'Width' : 'Height'}</span>
                        <BoundsInput
                          key={item.id + key}
                          label={`Bounds ${key}`}
                          onCancel={() => adapter.cancelGesture()}
                          disabled={!!item.locked || sharedLayout || selected.length !== 1}
                          value={item[key]}
                          onCommit={(value) =>
                            adapter.resizeObjectBounds(
                              item.id,
                              key === 'width' ? value : item.width,
                              key === 'height' ? value : item.height,
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    disabled={
                      item.locked ||
                      sharedLayout ||
                      selected.length !== 1 ||
                      (item.kind !== 'text' && !item.contentSize)
                    }
                    onClick={() => adapter.fitObjectBounds(item.id)}
                  >
                    Fit to content
                  </Button>
                </Sec>
              )}
              {inspectorPage === 'edit' && allText && item.kind === 'text' && (
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
                  <label className="vs-field">
                    <span>Font</span>
                    <FontPicker
                      value={canonicalFontId(item.fontFamily)}
                      disabled={locked}
                      onChange={(fontFamily) => patch({ fontFamily })}
                    />
                  </label>
                  {number('Text size', 'fontSize', 8, 240)}
                </Sec>
              )}
              {inspectorPage === 'edit' &&
                allAssets &&
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
                        disabled={!!item.asset?.frameSlot || sharedLayout}
                        onChange={(event) =>
                          patch({
                            frameShape: (event.target.value ||
                              undefined) as BoardItem['frameShape'],
                          })
                        }
                      >
                        <option value="">Rectangle</option>
                        {['circle', 'heart', 'triangle', 'hexagon', 'star', 'cloud'].map(
                          (shape) => (
                            <option key={shape}>{shape}</option>
                          ),
                        )}
                      </select>
                    </label>

                    <Sec title="Fit & crop" open icon={<CropIcon />}>
                      <ImageFitPresets adapter={adapter} item={item} />
                      {!crop ? (
                        <Button
                          variant="secondary"
                          style={{ justifyContent: 'center' }}
                          onClick={() => adapter.startImageCrop()}
                        >
                          <CropIcon /> Edit crop
                        </Button>
                      ) : (
                        <>
                          <p className="ai-tool-help">
                            {adapter.cropDraft?.base
                              ? 'Zoom and drag the photo inside its frame.'
                              : 'Drag the crop edges to choose the area. Drag inside to reposition.'}
                          </p>
                          <CropActions
                            adapter={adapter}
                            onCancel={() => adapter.cancelCrop()}
                            onApply={() => adapter.applyCrop()}
                          />
                        </>
                      )}
                      {item.crop && (
                        <Button
                          variant="secondary"
                          style={{ justifyContent: 'center' }}
                          onClick={() => patch({ crop: undefined })}
                        >
                          Reset crop
                        </Button>
                      )}
                    </Sec>

                    <Sec title="Filters" open icon={<SlidersIcon />}>
                      {' '}
                      <ImageFilterPresets
                        image={adapter.images.get(
                          item.rendition || (item.contentAsset || item.asset)?.assetUrl || '',
                        )}
                        value={item.filter}
                        onChange={patch}
                      />
                    </Sec>
                    {item.asset?.editable.colors &&
                      item.asset.assetUrl.startsWith('data:image/svg+xml,') && (
                        <Sec title="Graphic colors" icon={<DropletIcon />}>
                          {svgColors(item.asset.assetUrl).map((from) => (
                            <div className="vs-field" key={from}>
                              <span>
                                Replace <code>{from}</code>
                              </span>
                              <ColorPicker
                                label={`Replace color ${from}`}
                                value={item.colorOverrides?.[from] || svgColorValue(from)}
                                onChange={(value) =>
                                  void runMedia(() => adapter.recolorAsset(from, value))
                                }
                              />
                            </div>
                          ))}
                        </Sec>
                      )}
                  </Sec>
                )}{' '}
              {inspectorPage === 'edit' &&
                sharedFill &&
                item.kind !== 'asset' &&
                capabilities(item)?.fill && (
                  <Sec title={allText ? 'Color' : 'Fill'} open icon={<DropletIcon />}>
                    {color(
                      allText
                        ? 'Text color'
                        : selected.length === 1
                          ? 'Shape fill color'
                          : 'Fill color',
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
              {inspectorPage === 'edit' && allDrawings && item.kind === 'drawing' && (
                <Sec title="Stroke" open icon={<PenIcon />}>
                  {number('Pen width', 'stroke.width', 1, 50)}
                  {color('Stroke color', 'stroke.color', '#573575')}
                </Sec>
              )}
              {inspectorPage === 'edit' && (
                <>
                  {selected.some(
                    (entry) => read(entry, 'effect') && read(entry, 'effect') !== 'none',
                  ) && (
                    <Button size="sm" onClick={() => set('effect', 'none')}>
                      Clear saved effect
                    </Button>
                  )}
                  {selected.some((entry) => Number(read(entry, 'silhouette.width') || 0) > 0) && (
                    <Button size="sm" onClick={() => set('silhouette.width', 0)}>
                      Remove sticker edge
                    </Button>
                  )}
                  {allText && Number(read(item, 'stroke.width') || 0) > 0 && (
                    <Button size="sm" onClick={() => set('stroke.width', 0)}>
                      Remove text outline
                    </Button>
                  )}
                  <Sec title="Opacity" open>
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
                            [
                              'ArrowLeft',
                              'ArrowRight',
                              'ArrowUp',
                              'ArrowDown',
                              'Home',
                              'End',
                            ].includes(event.key) &&
                            !adapter.history.gestureActive
                          )
                            adapter.beginGesture();
                        }}
                        onKeyUp={() => adapter.endGesture()}
                        onBlur={() => adapter.endGesture()}
                        onChange={(event) => set('opacity', Number(event.target.value) / 100)}
                      />
                      {number('Opacity (%)', 'opacity', 0, 1)}
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
                          <select
                            className="vs-select"
                            aria-label="Stroke style"
                            value={String(read(item, 'stroke.style') || 'solid')}
                            onChange={(event) => set('stroke.style', event.target.value)}
                          >
                            {['solid', 'dashed', 'dotted'].map((id) => (
                              <option key={id}>{id}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </Sec>
                  )}
                </>
              )}
              {inspectorPage === 'layout' && item.connector && (
                <Sec title="Connector" open={false} icon={<SlidersIcon />}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'var(--gs-text-13)',
                      color: 'var(--gs-text-secondary)',
                    }}
                  >
                    This arrow follows its connected objects.
                  </p>
                  <Button
                    variant="secondary"
                    style={{ justifyContent: 'center' }}
                    onClick={() => patch({ connector: undefined })}
                  >
                    Detach connector
                  </Button>
                </Sec>
              )}
            </fieldset>
          ))}
      </div>
    </div>
  );
}
import { CropActions } from './CropActions';
