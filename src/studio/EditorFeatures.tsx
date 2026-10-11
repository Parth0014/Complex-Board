import { Button, IconButton } from './ui/Button';
import { ColorPicker } from './ColorPicker';
import { svgColors, svgColorValue } from '../vision/svgColors';
import { useEffect, useState, useRef, type ReactNode } from 'react';
import type { EditorAdapter } from '../vision/contracts';
import type { BoardItem } from '../vision/document';
import { canonicalFontId, editorFonts } from '../vision/fonts';
import { curatedPackProvider } from '../assets/curatedPack';
import type { GratitudeAsset } from '../assets/contracts';
import { formatRange, isRangeActive, type TextStyle } from '../vision/text';
import { useAIStatus } from './useAIStatus';
import {
  BringFrontIcon,
  BoldIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CropIcon,
  DropletIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  ItalicIcon,
  LayersIcon,
  LockIcon,
  PenIcon,
  ScissorsIcon,
  SlidersIcon,
  TypeIcon,
  UnderlineIcon,
  UndoIcon,
  UnlockIcon,
  WandIcon,
} from './icons';

export type EditorPanel = 'style' | 'layers' | null;

/** A disclosure only opens when clicked or activated with the keyboard. */
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
    <details className="vs-sec" open={open}>
      <summary>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {icon}
          {title}
        </span>
        <span className="vs-sec__chev" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </summary>
      <div className="vs-sec__body">{children}</div>
    </details>
  );
}
function BoundsInput({
  value,
  label,
  disabled,
  onCommit,
}: {
  value: number;
  label: string;
  disabled: boolean;
  onCommit(value: number): void;
}) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  const cancelled = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(String(value));
      return;
    }
    const next = Number(draft);
    if (draft.trim() && Number.isFinite(next)) {
      const clamped = Math.max(10, Math.min(10000, next));
      onCommit(clamped);
      setDraft(String(clamped));
    } else setDraft(String(value));
  };
  return (
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
      onChange={(event) => setDraft(event.target.value)}
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
          setDraft(String(value));
          focused.current = false;
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/** Numeric properties commit once on blur/Enter; temporary empty values do not change the canvas. */
function CommitNumber({
  label,
  value,
  min,
  max,
  step,
  disabled,
  placeholder,
  onCommit,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  placeholder?: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const editing = useRef(false);
  const cancelled = useRef(false);
  useEffect(() => {
    if (!editing.current) setDraft(value === undefined ? '' : String(value));
  }, [value]);
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(value === undefined ? '' : String(value));
      return;
    }
    if (draft.trim() === '' || !Number.isFinite(Number(draft))) {
      setDraft(value === undefined ? '' : String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, Number(draft)));
    if (value === undefined || clamped !== value) onCommit(clamped);
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
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        editing.current = false;
        commit();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          cancelled.current = true;
          setDraft(value === undefined ? '' : String(value));
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
  const [assets, setAssets] = useState<GratitudeAsset[]>([]),
    [error, setError] = useState('');
  const [mediaBusy, setMediaBusy] = useState(false);
  const ai = useAIStatus(adapter.ownerWindow);
  const runMedia = async (action: () => Promise<void>) => {
    setMediaBusy(true);
    setError('');
    try {
      await action();
    } catch (error) {
      setError(String(error));
    } finally {
      setMediaBusy(false);
    }
  };
  const item = adapter.history.document.items.find((item) => adapter.selectedIds.includes(item.id));
  const boardMedia = [
    ...new Map(
      [
        ...assets,
        ...adapter.history.document.items.flatMap((item) =>
          [item.asset, item.contentAsset].filter(
            (asset): asset is GratitudeAsset =>
              !!asset && (asset.provider === 'generated' || asset.provider === 'upload'),
          ),
        ),
      ].map((asset) => [asset.id, asset]),
    ).values(),
  ];
  const patch = (patch: Partial<BoardItem>) => {
    const shadowDetail = Object.keys(patch).some(
      (key) => key.startsWith('shadow') && key !== 'shadow',
    );
    adapter.patchItems(
      adapter.selectedIds.map((id) => {
        const target = adapter.history.document.items.find((item) => item.id === id);
        return {
          id,
          patch: {
            ...(shadowDetail && (!target?.shadow || target.shadow === 'none')
              ? { shadow: 'soft' as const }
              : {}),
            ...patch,
          },
        };
      }),
    );
  };
  const crop = adapter.cropDraft?.id === item?.id ? adapter.cropDraft?.crop : null;
  const [textRange, setTextRange] = useState({ start: 0, end: 0 });
  const textEditor = useRef<HTMLTextAreaElement>(null);
  const formatText = (style: TextStyle) => {
    const start = textEditor.current?.selectionStart ?? textRange.start,
      end = textEditor.current?.selectionEnd ?? textRange.end;
    if (item?.kind === 'text' && end > start) {
      const runs = item.textRuns || [];
      const patchStyle: TextStyle = { ...style };
      for (const [key, val] of Object.entries(style) as Array<[keyof TextStyle, unknown]>) {
        if (key === 'script') {
          if (isRangeActive(runs, start, end, 'script', val)) {
            patchStyle.script = 'normal';
          }
        } else if (typeof val === 'boolean') {
          if (isRangeActive(runs, start, end, key, true)) {
            (patchStyle as Record<string, unknown>)[key] = false;
          }
        }
      }
      adapter.patchItems([
        {
          id: item.id,
          patch: {
            textRuns: formatRange(item.text || '', runs, start, end, patchStyle),
            curve: 0,
          },
        },
      ]);
    }
  };
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
  useEffect(() => {
    if (panel !== 'style') return;
    let cancelled = false;
    void curatedPackProvider
      .search({ limit: 250 }, adapter.ownerWindow)
      .then((result) => {
        if (!cancelled) setAssets(result.items);
      })
      .catch((error) => {
        if (!cancelled) setError(String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, panel]);

  const selected = adapter.history.document.items.filter((item) =>
    adapter.selectedIds.includes(item.id),
  );
  const selectionTitle =
    selected.length > 1
      ? `${selected.length} items`
      : item?.kind === 'text'
        ? 'Text'
        : item?.kind === 'asset'
          ? 'Media'
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
  const mixed = (key: keyof BoardItem) => selected.some((other) => other[key] !== item?.[key]);
  const number = (label: string, key: keyof BoardItem, min: number, max: number, step = 1) => {
    const fallback =
      key === 'opacity'
        ? 1
        : key === 'lineHeight'
          ? 1
          : key === 'fontWeight'
            ? 400
            : key === 'shadowOpacity'
              ? 0.25
              : key === 'shadowOffsetX'
                ? 3
                : key === 'shadowOffsetY'
                  ? 5
                  : key === 'shadowBlur'
                    ? item?.shadow === 'soft'
                      ? 20
                      : item?.shadow === 'medium'
                        ? 10
                        : 0
                    : 0;
    const value = mixed(key)
      ? undefined
      : Number(item?.[key] ?? fallback) * (key === 'opacity' ? 100 : 1);
    return (
      <label className="vs-field">
        <span>{label}</span>
        <CommitNumber
          label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          placeholder={mixed(key) ? 'Mixed' : undefined}
          disabled={
            ['rotation', 'width', 'height'].includes(key) &&
            selected.some((entry) => entry.locked || entry.connector)
          }
          onCommit={(next) => patch({ [key]: next / (key === 'opacity' ? 100 : 1) })}
        />
      </label>
    );
  };
  const color = (label: string, key: keyof BoardItem, fallback: string) => (
    <div className="vs-field">
      <span>
        {label}
        {mixed(key) && ' · Mixed'}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <ColorPicker
          label={label}
          value={String(item?.[key] || fallback)}
          onChange={(value) => patch({ [key]: value })}
        />
        <code style={{ fontSize: 'var(--gs-text-13)', color: 'var(--gs-text-secondary)' }}>
          {String(item?.[key] || fallback).toUpperCase()}
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
    <aside
      className={`vs-inspector${inline ? ' vs-inspector--inline' : ''}${panel ? '' : ' is-collapsed'}`}
      aria-label="Object inspector"
      hidden={!panel}
    >
      <div className="vs-inspector__tabs">
        <div className="vs-segmented" role="toolbar" aria-label="Editor panels">
          {(['style', 'layers'] as const).map((id) => (
            <Button
              key={id}
              data-tip={id === 'style' ? 'Style the selected object' : 'Arrange layers'}
              aria-pressed={(panel ?? 'style') === id}
              className={(panel ?? 'style') === id ? 'is-active' : ''}
              onClick={() => setPanel(id)}
            >
              {id === 'style' ? <SlidersIcon /> : <LayersIcon />}
              {id[0].toUpperCase() + id.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="vs-inspector__body">
        <div className="vs-insp-head">
          <div>
            <span className="vs-eyebrow">
              {(panel ?? 'style') === 'style' ? 'Properties' : 'Board'}
            </span>
            <h3>{(panel ?? 'style') === 'style' ? selectionTitle : 'Layers'}</h3>
            <p>
              {(panel ?? 'style') === 'style'
                ? selectionMeta
                : 'Organize what is in front, behind, grouped or locked.'}
            </p>
          </div>
          <IconButton
            className="vs-icon-btn"
            data-tip="Close panel"
            aria-label="Close editor panel"
            onClick={() => setPanel(null)}
          >
            <CloseIcon />
          </IconButton>
        </div>

        {error && (
          <p className="vs-alert vs-alert--error" role="alert">
            {error}
          </p>
        )}

        {panel === 'style' && (
          <p
            className={`vs-style-tip${selected.some((entry) => entry.locked) ? ' vs-style-locked' : ''}`}
          >
            {selected.some((entry) => entry.locked)
              ? 'One or more selected objects are locked. Unlock them before editing.'
              : `Edit individual properties below. Changes apply to ${selected.length} selected ${selected.length === 1 ? 'object' : 'objects'}.`}
          </p>
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
                Top layers appear first. Expand a group to edit its members. Drag a member or group
                to reorder among its siblings.
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
            <Sec title="Arrange" icon={<BringFrontIcon />}>
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
                className="vs-btn vs-btn--light"
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
            <>
              {!item.connector && (
                <Sec title="Object bounds" icon={<SlidersIcon />}>
                  <p>
                    Resize the frame without scaling the content. Smaller bounds can clip content.
                  </p>
                  <div className="vs-row-2">
                    {(['width', 'height'] as const).map((key) => (
                      <label className="vs-field" key={key}>
                        <span>Bounds {key}</span>
                        <BoundsInput
                          key={item.id + key}
                          label={`Bounds ${key}`}
                          disabled={!!item.locked || selected.length !== 1}
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
                    className="vs-btn vs-btn--light"
                    disabled={
                      item.locked ||
                      selected.length !== 1 ||
                      (item.kind !== 'text' && !item.contentSize)
                    }
                    onClick={() => adapter.fitObjectBounds(item.id)}
                  >
                    Fit bounds to content
                  </Button>
                </Sec>
              )}
              {item.kind === 'text' && (
                <Sec title="Text" open icon={<TypeIcon />}>
                  <label className="vs-field">
                    <span>Content</span>
                    <textarea
                      className="vs-textarea"
                      ref={textEditor}
                      aria-label="Styled text"
                      value={item.text || ''}
                      onChange={(event) => patch({ text: event.target.value })}
                      onSelect={(event) =>
                        setTextRange({
                          start: event.currentTarget.selectionStart,
                          end: event.currentTarget.selectionEnd,
                        })
                      }
                    />
                  </label>
                  <label className="vs-field">
                    <span>Font</span>
                    <select
                      className="vs-select"
                      aria-label="Font"
                      value={canonicalFontId(item.fontFamily)}
                      onChange={(event) =>
                        patch({ fontFamily: event.target.value as BoardItem['fontFamily'] })
                      }
                    >
                      {Object.entries(editorFonts).map(([id, name]) => (
                        <option value={id} key={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="vs-row-2">
                    {number('Text size', 'fontSize', 8, 240)}
                    {color('Text color', 'color', '#222222')}
                  </div>
                  <Sec title="Advanced text" open={false}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 'var(--gs-text-13)',
                        color: 'var(--gs-text-secondary)',
                      }}
                    >
                      Select a range above, then apply formatting.
                    </p>
                    <div className="shape-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <Button
                        data-tip="Bold range"
                        aria-label="Bold text range"
                        onClick={() => formatText({ bold: true })}
                      >
                        <BoldIcon /> Bold
                      </Button>
                      <Button
                        data-tip="Italic range"
                        aria-label="Italic text range"
                        onClick={() => formatText({ italic: true })}
                      >
                        <ItalicIcon /> Italic
                      </Button>
                      <Button
                        data-tip="Underline range"
                        aria-label="Underline text range"
                        onClick={() => formatText({ underline: true })}
                      >
                        <UnderlineIcon /> Under
                      </Button>
                      <Button
                        data-tip="Superscript"
                        aria-label="Superscript"
                        onClick={() => formatText({ script: 'super' })}
                      >
                        Super
                      </Button>
                      <Button
                        data-tip="Subscript"
                        aria-label="Subscript"
                        onClick={() => formatText({ script: 'sub' })}
                      >
                        Sub
                      </Button>
                      <Button
                        data-tip="Clear range formatting"
                        onClick={() =>
                          formatText({
                            bold: false,
                            italic: false,
                            underline: false,
                            strike: false,
                            script: 'normal',
                          })
                        }
                      >
                        Normal
                      </Button>
                    </div>
                    <Button
                      className="vs-btn vs-btn--light"
                      style={{ justifyContent: 'center' }}
                      onClick={() => patch({ textRuns: undefined })}
                    >
                      Clear range formatting
                    </Button>
                    <div className="vs-row-2">
                      <label className="vs-check">
                        <input
                          type="checkbox"
                          checked={item.kerning !== false}
                          onChange={(event) => patch({ kerning: event.target.checked })}
                        />
                        Kerning
                      </label>
                      <label className="vs-check">
                        <input
                          type="checkbox"
                          checked={item.ligatures !== false}
                          onChange={(event) => patch({ ligatures: event.target.checked })}
                        />
                        Ligatures
                      </label>
                    </div>
                    {color('Text background', 'textBackground', '#fff3bd')}
                    <div className="vs-row-2">
                      <Button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        onClick={() => patch({ textBackground: undefined })}
                      >
                        Clear background
                      </Button>
                      <Button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        aria-pressed={!!item.strike}
                        onClick={() => patch({ strike: !item.strike })}
                      >
                        Strikethrough
                      </Button>
                      <Button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        onClick={() => patch({ text: item.text?.toUpperCase() })}
                      >
                        UPPERCASE
                      </Button>
                      <Button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        onClick={() => patch({ text: item.text?.toLowerCase() })}
                      >
                        lowercase
                      </Button>
                    </div>
                    <div className="vs-row-2">
                      {number('Font weight', 'fontWeight', 100, 900, 100)}
                      {number('Text curve', 'curve', -400, 400)}
                    </div>
                  </Sec>
                </Sec>
              )}
              {item.kind === 'asset' && item.asset?.provider !== 'curated-v1' && (
                <Sec title="Image" open icon={<ImageIcon />}>
                  <label className="vs-field">
                    <span>Replace media</span>
                    <select
                      className="vs-select"
                      aria-label="Replace media"
                      value={item.asset?.id || ''}
                      onChange={(event) =>
                        void runMedia(async () => {
                          await adapter.replaceAsset(event.target.value);
                        })
                      }
                    >
                      {boardMedia.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="vs-field">
                    <span>Shape frame</span>
                    <select
                      className="vs-select"
                      aria-label="Shape frame"
                      value={item.frameShape || ''}
                      disabled={!!item.asset?.frameSlot}
                      onChange={(event) =>
                        patch({
                          frameShape: (event.target.value || undefined) as BoardItem['frameShape'],
                        })
                      }
                    >
                      <option value="">Rectangle</option>
                      {['circle', 'heart', 'triangle', 'hexagon', 'star', 'cloud'].map((shape) => (
                        <option key={shape}>{shape}</option>
                      ))}
                    </select>
                  </label>

                  <Sec title="Fit & crop" icon={<CropIcon />}>
                    <div className="shape-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <Button
                        data-tip="Fit image inside frame"
                        onClick={() => adapter.setImageFit('fit')}
                      >
                        Fit image
                      </Button>
                      <Button
                        data-tip="Fill frame with image"
                        onClick={() => adapter.setImageFit('fill')}
                      >
                        Fill image
                      </Button>
                      <Button
                        data-tip="Hold to preview the original"
                        onMouseDown={() => adapter.previewOriginalImage(true)}
                        onMouseUp={() => adapter.previewOriginalImage(false)}
                        onMouseLeave={() => adapter.previewOriginalImage(false)}
                      >
                        Hold for original
                      </Button>
                    </div>
                    {!crop ? (
                      <Button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        onClick={() => adapter.startImageCrop()}
                      >
                        <CropIcon /> Edit crop
                      </Button>
                    ) : (
                      <>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 'var(--gs-text-13)',
                            color: 'var(--gs-text-secondary)',
                          }}
                        >
                          Drag the selected content to reposition it. Source coordinates are
                          percentages. Apply commits one edit.
                        </p>
                        <div className="vs-row-2">
                          {(['x', 'y', 'width', 'height'] as const).map((key) => (
                            <label className="vs-field" key={key}>
                              <span style={{ textTransform: 'capitalize' }}>Crop {key}</span>
                              <input
                                className="vs-input"
                                aria-label={`Crop ${key}`}
                                type="number"
                                min={key === 'width' || key === 'height' ? 1 : 0}
                                max="100"
                                value={Math.round(crop[key] * 100)}
                                onChange={(event) => {
                                  const value = Math.max(
                                    key === 'width' || key === 'height' ? 0.01 : 0,
                                    Math.min(1, Number(event.target.value) / 100),
                                  );
                                  adapter.updateCropDraft({ ...crop, [key]: value });
                                }}
                              />
                            </label>
                          ))}
                        </div>
                        <div className="vs-row-2">
                          <Button
                            className="vs-btn vs-btn--primary"
                            style={{ justifyContent: 'center' }}
                            onClick={() => adapter.applyCrop()}
                          >
                            <CheckIcon /> Apply crop
                          </Button>
                          <Button
                            className="vs-btn vs-btn--light"
                            style={{ justifyContent: 'center' }}
                            onClick={() => adapter.cancelCrop()}
                          >
                            Cancel crop
                          </Button>
                        </div>
                      </>
                    )}
                    <Button
                      className="vs-btn vs-btn--light"
                      style={{ justifyContent: 'center' }}
                      onClick={() => patch({ crop: undefined })}
                    >
                      Reset crop
                    </Button>
                  </Sec>

                  <Sec title="Adjustments" icon={<SlidersIcon />}>
                    <div className="vs-row-2">
                      {number('Brightness', 'brightness', -1, 1, 0.05)}
                      {number('Contrast', 'contrast', -100, 100)}
                      {number('Saturation', 'saturation', -2, 2, 0.1)}
                      {number('Blur', 'blur', 0, 30)}
                      {number('Temperature', 'warmth', -100, 100)}
                      {number('Tint', 'tint', -100, 100)}
                    </div>
                    <div className="shape-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      <Button
                        data-tip="Apply Mono filter"
                        onClick={() => patch({ filter: 'mono', saturation: 0, contrast: 10 })}
                      >
                        Mono
                      </Button>
                      <Button
                        data-tip="Apply Dreamy filter"
                        onClick={() =>
                          patch({
                            filter: 'dreamy',
                            brightness: 0.1,
                            contrast: -15,
                            saturation: -0.3,
                          })
                        }
                      >
                        Dreamy
                      </Button>
                      <Button
                        data-tip="Apply Film filter"
                        onClick={() =>
                          patch({
                            filter: 'film',
                            brightness: -0.05,
                            contrast: 25,
                            saturation: -0.5,
                          })
                        }
                      >
                        Film
                      </Button>
                      <Button
                        data-tip="Reset to original"
                        onClick={() =>
                          patch({
                            filter: 'original',
                            brightness: 0,
                            contrast: 0,
                            saturation: 0,
                            blur: 0,
                            warmth: 0,
                            tint: 0,
                          })
                        }
                      >
                        Original
                      </Button>
                    </div>
                  </Sec>

                  <Sec title="AI tools" open={false} icon={<WandIcon />}>
                    <p className="ai-tool-help">
                      Remove the background to make a cutout. Resample enlarges locally; AI upscale
                      adds detail using your configured service. Each change can be undone.
                    </p>
                    {(ai.error || !ai.status?.backgroundConfigured) && (
                      <div className="ai-status" role="status">
                        {ai.checking
                          ? 'Checking image toolsâ€¦'
                          : ai.error ||
                            'Background removal needs rembg. Start rembg s, set REMBG_URL in .env, and restart the AI server.'}
                        <Button
                          className="panel-secondary-action"
                          disabled={ai.checking}
                          onClick={() => void ai.refresh()}
                        >
                          Check connection
                        </Button>
                      </div>
                    )}
                    <div className="shape-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      <Button
                        data-tip={
                          ai.status?.backgroundConfigured
                            ? 'Create a transparent cutout; keep the original for Undo'
                            : 'Set up the background removal service first'
                        }

                        disabled={mediaBusy || ai.checking || !ai.status?.backgroundConfigured}
                        onClick={() => void runMedia(() => adapter.removeBackground())}
                      >
                        <ScissorsIcon /> Remove bg
                      </Button>
                      <Button
                        data-tip="Resample image at 2Ã—"
                        disabled={mediaBusy}
                        onClick={() => void runMedia(() => adapter.upscaleImage())}
                      >
                        Resample 2Ã—
                      </Button>
                      <Button
                        data-tip="Add image detail using the configured AI upscaler"

                        disabled={mediaBusy || !ai.status?.upscaleConfigured}
                        onClick={() => void runMedia(() => adapter.upscaleAI())}
                      >
                        <WandIcon /> AI upscale 2Ã—
                      </Button>
                      <Button
                        data-tip="Split into foreground and background layers"
                        disabled={
                          mediaBusy || !ai.status?.backgroundConfigured || !ai.status?.configured
                        }
                        onClick={() => void runMedia(() => adapter.splitImageLayers())}
                      >
                        Split foreground/background
                      </Button>
                      <Button
                        data-tip="Match colors from a second selected image"
                        disabled={mediaBusy || adapter.selectedIds.length !== 2}
                        onClick={() => void runMedia(() => adapter.matchImageStyle())}
                      >
                        Match reference colors
                      </Button>
                      <Button
                        data-tip="Reset all source edits"
                        onClick={() => patch({ rendition: undefined, colorOverrides: undefined })}
                      >
                        <UndoIcon /> Reset source edits
                      </Button>
                    </div>
                    {mediaBusy && (
                      <p role="status" style={{ margin: 0, fontSize: 'var(--gs-text-13)' }}>
                        Processing imageâ€¦
                      </p>
                    )}
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

                  {item.asset?.frameSlot && (
                    <Sec title="Frame content" icon={<ImageIcon />}>
                      <label className="vs-field">
                        <span>Content</span>
                        <select
                          className="vs-select"
                          aria-label="Frame content"
                          value={item.contentAsset?.id || ''}
                          onChange={(event) => {
                            if (event.target.value)
                              void adapter
                                .attachFrameContent(event.target.value)
                                .catch((error) => setError(String(error)));
                          }}
                        >
                          <option value="">Choose image or graphic</option>
                          {boardMedia
                            .filter((asset) => !asset.frameSlot)
                            .map((asset) => (
                              <option value={asset.id} key={asset.id}>
                                {asset.title}
                              </option>
                            ))}
                        </select>
                      </label>
                      <Button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        disabled={!item.contentAsset}
                        onClick={() => adapter.detachFrameContent()}
                      >
                        Detach content
                      </Button>
                    </Sec>
                  )}
                </Sec>
              )}{' '}
              {(item.kind === 'shape' || item.kind === 'text') && (
                <Sec
                  title={item.kind === 'text' ? 'Text fill & gradient' : 'Shape fill & gradient'}
                  open
                  icon={<DropletIcon />}
                >
                  {color(
                    item.kind === 'text' ? 'Text color' : 'Shape fill color',
                    'color',
                    '#b48ce3',
                  )}
                  <div className="vs-row-2">
                    <div className="vs-field">
                      <span>Gradient</span>
                      <ColorPicker
                        label="Item gradient"
                        value={item.gradient || '#fff3bd'}
                        onChange={(value) => patch({ gradient: value, noFill: false })}
                      />
                    </div>
                    <label className="vs-field">
                      <span>Gradient type</span>
                      <select
                        className="vs-select"
                        aria-label="Item gradient type"
                        disabled={!item.gradient || item.locked}
                        value={item.gradientType || 'linear'}
                        onChange={(event) =>
                          patch({ gradientType: event.target.value as 'linear' | 'radial' })
                        }
                      >
                        <option>linear</option>
                        <option>radial</option>
                      </select>
                    </label>
                  </div>
                  <Button
                    className="vs-btn vs-btn--light"
                    style={{ justifyContent: 'center' }}
                    disabled={!item.gradient || item.locked}
                    onClick={() => patch({ gradient: undefined })}
                  >
                    Remove gradient
                  </Button>
                  {item.kind === 'shape' && (
                    <>
                      <label className="vs-check">
                        <input
                          type="checkbox"
                          checked={!!item.noFill}
                          onChange={(event) => patch({ noFill: event.target.checked })}
                        />
                        No fill (outline only)
                      </label>
                      {['rectangle', 'circle', 'triangle', 'heart', 'cloud', 'star'].includes(
                        item.shape || '',
                      ) && (
                        <label className="vs-field">
                          <span>Convert shape to frame</span>
                          <select
                            className="vs-select"
                            aria-label="Convert shape to frame"
                            value={''}
                            onChange={(event) => {
                              if (event.target.value)
                                void runMedia(async () => {
                                  await adapter.attachFrameContent(event.target.value);
                                });
                            }}
                          >
                            <option value={''}>Choose image or graphic</option>
                            {boardMedia
                              .filter((asset) => !asset.frameSlot)
                              .map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                  {asset.title}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                    </>
                  )}
                </Sec>
              )}
              {item.kind === 'drawing' && (
                <Sec title="Pen" icon={<PenIcon />}>
                  {number('Pen width', 'strokeWidth', 1, 50)}
                </Sec>
              )}
              <Sec title="Appearance" open icon={<SlidersIcon />}>
                <label className="vs-check">
                  <input
                    type="checkbox"
                    aria-label="Sticker outline"
                    checked={!!item.stickerWidth}
                    onChange={(event) =>
                      patch({
                        stickerWidth: event.target.checked ? 8 : 0,
                        stickerColor: item.stickerColor || '#ffffff',
                      })
                    }
                  />
                  Sticker outline
                </label>
                {!!item.stickerWidth && (
                  <>
                    {number('Outline thickness', 'stickerWidth', 1, 30)}
                    {color('Outline color', 'stickerColor', '#ffffff')}
                  </>
                )}
                {item.kind === 'drawing' && color('Stroke color', 'color', '#573575')}
                {number('Opacity (%)', 'opacity', 0, 100)}
                <div className="vs-row-2">
                  {(item.kind === 'asset' ||
                    (item.kind === 'shape' && item.shape === 'rectangle') ||
                    (item.kind === 'text' && item.textBackground)) &&
                    number('Corner radius', 'radius', 0, 150)}
                  {number('Border width', 'borderWidth', 0, 30)}
                </div>
                {color('Border color', 'borderColor', '#33272b')}
                <div className="vs-row-2">
                  <label className="vs-field">
                    <span>Shadow preset</span>
                    <select
                      className="vs-select"
                      aria-label="Shadow preset"
                      value={item.shadow || 'none'}
                      onChange={(event) =>
                        patch({
                          shadow: event.target.value as BoardItem['shadow'],
                          shadowColor: undefined,
                          shadowOpacity: undefined,
                          shadowBlur: undefined,
                          shadowOffsetX: undefined,
                          shadowOffsetY: undefined,
                        })
                      }
                    >
                      {['none', 'soft', 'medium', 'hard'].map((id) => (
                        <option key={id}>{id}</option>
                      ))}
                    </select>
                  </label>
                  <label className="vs-field">
                    <span>Stroke style</span>
                    <select
                      className="vs-select"
                      aria-label="Stroke style"
                      value={item.borderStyle || 'solid'}
                      onChange={(event) =>
                        patch({ borderStyle: event.target.value as BoardItem['borderStyle'] })
                      }
                    >
                      {['solid', 'dashed', 'dotted'].map((id) => (
                        <option key={id}>{id}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <Sec title="Shadow details" open={false}>
                  <div className="vs-row-2">
                    {color('Shadow color', 'shadowColor', '#000000')}
                    {number('Shadow opacity', 'shadowOpacity', 0, 1, 0.05)}
                  </div>
                  <div className="vs-row-3">
                    {number('Shadow blur', 'shadowBlur', 0, 100)}
                    {number('Shadow X', 'shadowOffsetX', -100, 100)}
                    {number('Shadow Y', 'shadowOffsetY', -100, 100)}
                  </div>
                </Sec>
                <label className="vs-field">
                  <span>Effect</span>
                  <select
                    className="vs-select"
                    aria-label="Effect"
                    value={item.effect || 'none'}
                    onChange={(event) =>
                      patch({ effect: event.target.value as BoardItem['effect'] })
                    }
                  >
                    {(item.kind === 'text'
                      ? ['none', 'glow', 'echo', 'outline', 'glitch']
                      : item.kind === 'asset'
                        ? ['none', 'glow', 'glitch']
                        : ['none', 'glow', 'outline']
                    ).map((id) => (
                      <option key={id}>{id}</option>
                    ))}
                  </select>
                </label>
              </Sec>
              {item.connector && (
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
                    className="vs-btn vs-btn--light"
                    style={{ justifyContent: 'center' }}
                    onClick={() => patch({ connector: undefined })}
                  >
                    Detach connector
                  </Button>
                </Sec>
              )}
            </>
          ))}
      </div>
    </aside>
  );
}
