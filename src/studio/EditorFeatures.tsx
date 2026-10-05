import { useEffect, useState, useRef, type ReactNode } from 'react';
import type { EditorAdapter } from '../vision/contracts';
import type { BoardItem } from '../vision/document';
import { canonicalFontId, editorFonts } from '../vision/fonts';
import { curatedPackProvider } from '../assets/curatedPack';
import type { GratitudeAsset } from '../assets/contracts';
import { formatRange, type TextStyle } from '../vision/text';
import {
  BackwardIcon,
  BringFrontIcon,
  BoldIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  ContrastIcon,
  CropIcon,
  DropletIcon,
  DuplicateIcon,
  EyeIcon,
  EyeOffIcon,
  FlipHIcon,
  FlipVIcon,
  ForwardIcon,
  ImageIcon,
  ItalicIcon,
  LayersIcon,
  LockIcon,
  PasteIcon,
  PenIcon,
  RotateIcon,
  ScissorsIcon,
  SendBackIcon,
  SlidersIcon,
  SunIcon,
  TrashIcon,
  TypeIcon,
  UnderlineIcon,
  UndoIcon,
  UnlockIcon,
  WandIcon,
  ZapIcon,
} from './icons';

export type EditorPanel = 'style' | 'layers' | null;

/** Collapsible inspector section. */
function Sec({
  title,
  children,
  open = true,
  icon,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
  icon?: ReactNode;
}) {
  return (
    <details className="vs-sec" open={open}>
      <summary data-tip={`${title} settings`}>
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

export function EditorFeatures({
  adapter,
  panel,
  setPanel,
}: {
  adapter: EditorAdapter;
  panel: EditorPanel;
  setPanel: (panel: EditorPanel) => void;
}) {
  const [assets, setAssets] = useState<GratitudeAsset[]>([]),
    [error, setError] = useState('');
  const [mediaBusy, setMediaBusy] = useState(false);
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
  const patch = (patch: Partial<BoardItem>) =>
    adapter.patchItems(adapter.selectedIds.map((id) => ({ id, patch })));
  const crop = adapter.cropDraft?.id === item?.id ? adapter.cropDraft?.crop : null;
  const [textRange, setTextRange] = useState({ start: 0, end: 0 });
  const textEditor = useRef<HTMLTextAreaElement>(null);
  const formatText = (style: TextStyle) => {
    const start = textEditor.current?.selectionStart ?? textRange.start,
      end = textEditor.current?.selectionEnd ?? textRange.end;
    if (item?.kind === 'text' && end > start)
      adapter.patchItems([
        {
          id: item.id,
          patch: {
            textRuns: formatRange(item.text || '', item.textRuns || [], start, end, style),
            curve: 0,
          },
        },
      ]);
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
  const number = (label: string, key: keyof BoardItem, min: number, max: number, step = 1) => (
    <label className="vs-field">
      <span>{label}</span>
      <input
        className="vs-input"
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder={mixed(key) ? 'Mixed' : undefined}
        disabled={
          ['rotation', 'width', 'height'].includes(key) &&
          selected.some((item) => item.locked || item.connector)
        }
        value={
          mixed(key)
            ? ''
            : Number(
                item?.[key] ??
                  (key === 'lineHeight'
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
                              : 0),
              )
        }
        onChange={(event) => {
          if (event.target.value !== '')
            patch({ [key]: Math.max(min, Math.min(max, Number(event.target.value))) });
        }}
      />
    </label>
  );
  const color = (label: string, key: keyof BoardItem, fallback: string) => (
    <label className="vs-field">
      <span>
        {label}
        {mixed(key) && ' · Mixed'}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <input
          className="vs-color"
          aria-label={label}
          type="color"
          value={String(item?.[key] || fallback)}
          onChange={(event) => patch({ [key]: event.target.value })}
        />
        <code style={{ fontSize: 11.5, color: 'var(--vs-mute)' }}>
          {String(item?.[key] || fallback).toUpperCase()}
        </code>
      </span>
    </label>
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
          <button
            className="vs-layer__name"
            data-tip={`Select ${label}`}
            aria-pressed={adapter.selectedIds.includes(key)}
            onClick={() => {
              adapter.groupScope = adapter.path(entry);
              adapter.select([key]);
            }}
          >
            {label}
          </button>
          <button
            className={`vs-icon-btn${entry.hidden ? ' is-off' : ''}`}
            data-tip={entry.hidden ? `Show ${label}` : `Hide ${label}`}
            aria-label={`${entry.hidden ? 'Show' : 'Hide'} ${label}`}
            onClick={() => adapter.patchItems([{ id: key, patch: { hidden: !entry.hidden } }])}
          >
            {entry.hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button
            className={`vs-icon-btn${entry.locked ? '' : ' is-off'}`}
            data-tip={entry.locked ? 'Unlock layer' : 'Lock layer'}
            aria-label={`${entry.locked ? 'Unlock' : 'Lock'} layer`}
            onClick={() => adapter.patchItems([{ id: key, patch: { locked: !entry.locked } }])}
          >
            {entry.locked ? <LockIcon /> : <UnlockIcon />}
          </button>
        </div>
      );
    });
  };

  return (
    <aside className={`vs-inspector${panel ? '' : ' is-collapsed'}`} aria-label="Object inspector">
      <div className="vs-inspector__tabs">
        <div className="vs-segmented" role="toolbar" aria-label="Editor panels">
          {(['style', 'layers'] as const).map((id) => (
            <button
              key={id}
              data-tip={id === 'style' ? 'Style the selected object' : 'Arrange layers'}
              aria-pressed={(panel ?? 'style') === id}
              className={(panel ?? 'style') === id ? 'is-active' : ''}
              onClick={() => setPanel(id)}
            >
              {id === 'style' ? <SlidersIcon /> : <LayersIcon />}
              {id[0].toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="vs-inspector__body">
        <div className="vs-insp-head">
          <div>
            <span className="vs-eyebrow">{(panel ?? 'style') === 'style' ? 'Properties' : 'Board'}</span>
            <h3>{(panel ?? 'style') === 'style' ? selectionTitle : 'Layers'}</h3>
            <p>
              {(panel ?? 'style') === 'style'
                ? selectionMeta
                : 'Organize what is in front, behind, grouped or locked.'}
            </p>
          </div>
          <button
            className="vs-icon-btn"
            data-tip="Close panel"
            aria-label="Close editor panel"
            onClick={() => setPanel(null)}
          >
            <CloseIcon />
          </button>
        </div>

        {error && (
          <p className="vs-alert vs-alert--error" role="alert">
            {error}
          </p>
        )}

        {(panel ?? 'style') === 'layers' && (
            <>
              <Sec title="Layer stack" icon={<LayersIcon />}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--vs-ink-2)' }}>
                  Top layers appear first. Expand a group to edit its members. Drag a member or
                  group to reorder among its siblings.
                </p>
                <div className="vs-layers">{groups([])}</div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--vs-mute)',
                    padding: '8px 10px',
                    background: 'var(--vs-panel-2)',
                    borderRadius: 10,
                  }}
                >
                  Background
                </div>
              </Sec>
              <Sec title="Arrange" icon={<BringFrontIcon />}>
                <div className="shape-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  {(['forward', 'backward', 'front', 'back'] as const).map((position) => (
                    <button
                      key={position}
                      disabled={!adapter.selectedIds.length}
                      onClick={() => adapter.arrangeSelection(position)}
                    >
                      {position[0].toUpperCase() + position.slice(1)}
                    </button>
                  ))}
                </div>
              </Sec>
              {adapter.groupScope.length > 0 && (
                <button
                  className="vs-btn vs-btn--light"
                  style={{ justifyContent: 'center' }}
                  onClick={() => adapter.exitGroup()}
                >
                  <UndoIcon /> Exit group ({adapter.groupScope.length})
                </button>
              )}
            </>
          )}

          {(panel ?? 'style') === 'style' &&
            (!item ? (
              <div className="vs-inspector__empty">
                <span className="vs-empty__icon" aria-hidden="true">
                  <SlidersIcon />
                </span>
                <strong>Select something to refine it</strong>
                <p>
                  Style appears here when an object is selected. Layers stay one click away; AI
                  lives with creation tools on the left.
                </p>
              </div>
            ) : (
              <>
                <Sec title="Quick actions" icon={<ZapIcon />}>
                  <div className="vs-action-grid">
                    <button
                      className="vs-icon-btn"
                      data-tip="Copy (Ctrl+C)"
                      aria-label="Copy"
                      onClick={() => void adapter.copyToSystem()}
                    >
                      <DuplicateIcon />
                    </button>
                    <button
                      className="vs-icon-btn"
                      data-tip="Paste (Ctrl+V)"
                      aria-label="Paste"
                      onClick={() => void adapter.pasteFromSystem()}
                    >
                      <PasteIcon />
                    </button>
                    <button
                      className="vs-icon-btn"
                      data-tip="Bring forward (])"
                      aria-label="Forward"
                      onClick={() => adapter.arrangeSelection('forward')}
                    >
                      <ForwardIcon />
                    </button>
                    <button
                      className="vs-icon-btn"
                      data-tip="Send backward ([)"
                      aria-label="Backward"
                      onClick={() => adapter.arrangeSelection('backward')}
                    >
                      <BackwardIcon />
                    </button>
                    <button
                      className="vs-icon-btn"
                      data-tip="Bring to front (Ctrl+])"
                      aria-label="Front"
                      onClick={() => adapter.arrangeSelection('front')}
                    >
                      <BringFrontIcon />
                    </button>
                    <button
                      className="vs-icon-btn"
                      data-tip="Send to back (Ctrl+[)"
                      aria-label="Back"
                      onClick={() => adapter.arrangeSelection('back')}
                    >
                      <SendBackIcon />
                    </button>
                    <button
                      className="vs-icon-btn"
                      data-tip="Rotate 15° clockwise"
                      aria-label="Rotate 15°"
                      onClick={() => adapter.rotateSelection(15)}
                    >
                      <RotateIcon />
                    </button>
                  </div>
                  <div className="vs-row-2">
                    <button className="vs-btn vs-btn--light" style={{ justifyContent: 'center' }} onClick={() => adapter.copyStyle()}>
                      Copy style
                    </button>
                    <button
                      className="vs-btn vs-btn--light"
                      style={{ justifyContent: 'center' }}
                      disabled={!adapter.canPasteStyle}
                      onClick={() => adapter.pasteStyle()}
                    >
                      Apply style
                    </button>
                  </div>
                </Sec>

                <Sec title="Position & size" icon={<BringFrontIcon />}>
                  {adapter.selectedIds.length === 1 && (
                    <div className="vs-row-2">
                      <label className="vs-field">
                        <span>X</span>
                        <input
                          className="vs-input"
                          aria-label="Item X"
                          type="number"
                          disabled={item.locked}
                          value={Math.round(item.x)}
                          onChange={(event) =>
                            adapter.patchItems([
                              { id: item.id, patch: { x: Number(event.target.value) } },
                            ])
                          }
                        />
                      </label>
                      <label className="vs-field">
                        <span>Y</span>
                        <input
                          className="vs-input"
                          aria-label="Item Y"
                          type="number"
                          disabled={item.locked}
                          value={Math.round(item.y)}
                          onChange={(event) =>
                            adapter.patchItems([
                              { id: item.id, patch: { y: Number(event.target.value) } },
                            ])
                          }
                        />
                      </label>
                    </div>
                  )}
                  <div className="vs-row-3">
                    {number('Rotation°', 'rotation', -360, 360)}
                    {number('Width', 'width', 10, 5000)}
                    {number('Height', 'height', 10, 5000)}
                  </div>
                </Sec>

                {item.connector && (
                  <Sec title="Connector" icon={<SlidersIcon />}>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--vs-ink-2)' }}>
                      This arrow follows its connected objects.
                    </p>
                    <button
                      className="vs-btn vs-btn--light"
                      style={{ justifyContent: 'center' }}
                      onClick={() => patch({ connector: undefined })}
                    >
                      Detach connector
                    </button>
                  </Sec>
                )}

                {item.kind === 'text' && (
                  <Sec title="Text" icon={<TypeIcon />}>
                    <label className="vs-field">
                      <span>Content</span>
                      <textarea
                        className="vs-textarea"
                        ref={textEditor}
                        aria-label="Styled text"
                        value={item.text || ''}
                        onChange={(event) =>
                          patch({ text: event.target.value, textRuns: undefined })
                        }
                        onSelect={(event) =>
                          setTextRange({
                            start: event.currentTarget.selectionStart,
                            end: event.currentTarget.selectionEnd,
                          })
                        }
                      />
                    </label>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--vs-mute)' }}>
                      Select a range above, then apply formatting.
                    </p>
                    <div className="shape-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <button
                        data-tip="Bold range"
                        aria-label="Bold text range"
                        onClick={() => formatText({ bold: true })}
                      >
                        <BoldIcon /> Bold
                      </button>
                      <button
                        data-tip="Italic range"
                        aria-label="Italic text range"
                        onClick={() => formatText({ italic: true })}
                      >
                        <ItalicIcon /> Italic
                      </button>
                      <button
                        data-tip="Underline range"
                        aria-label="Underline text range"
                        onClick={() => formatText({ underline: true })}
                      >
                        <UnderlineIcon /> Under
                      </button>
                      <button
                        data-tip="Superscript"
                        aria-label="Superscript"
                        onClick={() => formatText({ script: 'super' })}
                      >
                        Super
                      </button>
                      <button
                        data-tip="Subscript"
                        aria-label="Subscript"
                        onClick={() => formatText({ script: 'sub' })}
                      >
                        Sub
                      </button>
                      <button
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
                      </button>
                    </div>
                    <button
                      className="vs-btn vs-btn--light"
                      style={{ justifyContent: 'center' }}
                      onClick={() => patch({ textRuns: undefined })}
                    >
                      Clear range formatting
                    </button>
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
                    {color('Text background', 'textBackground', '#fff3bd')}
                    <div className="vs-row-2">
                      <button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        onClick={() => patch({ textBackground: undefined })}
                      >
                        Clear background
                      </button>
                      <button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        aria-pressed={!!item.strike}
                        onClick={() => patch({ strike: !item.strike })}
                      >
                        Strikethrough
                      </button>
                      <button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        onClick={() => patch({ text: item.text?.toUpperCase() })}
                      >
                        UPPERCASE
                      </button>
                      <button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        onClick={() => patch({ text: item.text?.toLowerCase() })}
                      >
                        lowercase
                      </button>
                    </div>
                    <div className="vs-row-2">
                      {number('Font weight', 'fontWeight', 100, 900, 100)}
                      {number('Text curve', 'curve', -400, 400)}
                    </div>
                  </Sec>
                )}

                {(item.kind === 'shape' || item.kind === 'text') && (
                  <Sec title="Fill & gradient" icon={<DropletIcon />}>
                    {color('Fill', 'color', '#b48ce3')}
                    <div className="vs-row-2">
                      <label className="vs-field">
                        <span>Gradient</span>
                        <input
                          className="vs-color"
                          aria-label="Item gradient"
                          type="color"
                          value={item.gradient || '#fff3bd'}
                          onChange={(event) =>
                            patch({ gradient: event.target.value, fill: item.color || '#b48ce3' })
                          }
                        />
                      </label>
                      <label className="vs-field">
                        <span>Gradient type</span>
                        <select
                          className="vs-select"
                          aria-label="Item gradient type"
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
                    <button
                      className="vs-btn vs-btn--light"
                      style={{ justifyContent: 'center' }}
                      onClick={() => patch({ gradient: undefined })}
                    >
                      Remove gradient
                    </button>
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

                <Sec title="Quick styles" icon={<ZapIcon />}>
                  <div className="vs-quickstyles">
                    <button
                      data-tip="Apply Soft violet style"
                      onClick={() =>
                        patch({
                          color: '#573575',
                          borderColor: '#573575',
                          borderWidth: 2,
                          shadow: 'soft',
                          effect: 'none',
                          gradient: undefined,
                        })
                      }
                    >
                      <span className="vs-qdot" style={{ background: '#573575' }} />
                      Soft violet
                    </button>
                    <button
                      data-tip="Apply Golden glow style"
                      onClick={() =>
                        patch({
                          color: '#c89640',
                          borderColor: '#c89640',
                          borderWidth: 3,
                          shadow: 'none',
                          effect: 'glow',
                          gradient: undefined,
                        })
                      }
                    >
                      <span className="vs-qdot" style={{ background: '#c89640' }} />
                      Golden glow
                    </button>
                    <button
                      data-tip="Apply Ink style"
                      onClick={() =>
                        patch({
                          color: '#222222',
                          borderColor: '#222222',
                          borderWidth: 2,
                          shadow: 'hard',
                          effect: 'none',
                          gradient: undefined,
                        })
                      }
                    >
                      <span className="vs-qdot" style={{ background: '#222222' }} />
                      Ink
                    </button>
                  </div>
                </Sec>

                <Sec title="Appearance" icon={<SlidersIcon />}>
                  {color('Item color', 'color', '#573575')}
                  <div className="vs-row-2">
                    <label className="vs-field">
                      <span>Shadow preset</span>
                      <select
                        className="vs-select"
                        aria-label="Shadow preset"
                        value={item.shadow || 'none'}
                        onChange={(event) =>
                          patch({ shadow: event.target.value as BoardItem['shadow'] })
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
                  <div className="vs-row-2">
                    {color('Shadow color', 'shadowColor', '#000000')}
                    {number('Shadow opacity', 'shadowOpacity', 0, 1, 0.05)}
                  </div>
                  <div className="vs-row-3">
                    {number('Shadow blur', 'shadowBlur', 0, 100)}
                    {number('Shadow X', 'shadowOffsetX', -100, 100)}
                    {number('Shadow Y', 'shadowOffsetY', -100, 100)}
                  </div>
                  <div className="vs-row-2">
                    {number('Corner radius', 'radius', 0, 150)}
                    {number('Stroke width', 'borderWidth', 0, 30)}
                  </div>
                  {color('Stroke color', 'borderColor', '#33272b')}
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

                {item.kind === 'asset' && (
                  <Sec title="Image" icon={<ImageIcon />}>
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
                        {['circle', 'heart', 'triangle', 'hexagon', 'star', 'cloud'].map(
                          (shape) => (
                            <option key={shape}>{shape}</option>
                          ),
                        )}
                      </select>
                    </label>

                    <Sec title="AI tools & adjustments" icon={<WandIcon />}>
                      <div className="shape-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <button
                          data-tip="Remove the image background"
                          disabled={mediaBusy}
                          onClick={() => void runMedia(() => adapter.removeBackground())}
                        >
                          <ScissorsIcon /> Remove bg
                        </button>
                        <button
                          data-tip="Resample image at 2×"
                          disabled={mediaBusy}
                          onClick={() => void runMedia(() => adapter.upscaleImage())}
                        >
                          Resample 2×
                        </button>
                        <button
                          data-tip="AI upscale image at 2×"
                          disabled={mediaBusy}
                          onClick={() => void runMedia(() => adapter.upscaleAI())}
                        >
                          <WandIcon /> AI upscale 2×
                        </button>
                        <button
                          data-tip="Split into foreground and background layers"
                          disabled={mediaBusy}
                          onClick={() => void runMedia(() => adapter.splitImageLayers())}
                        >
                          Split foreground/background
                        </button>
                        <button
                          data-tip="Match colors from a second selected image"
                          disabled={mediaBusy || adapter.selectedIds.length !== 2}
                          onClick={() => void runMedia(() => adapter.matchImageStyle())}
                        >
                          Match reference colors
                        </button>
                        <button
                          data-tip="Reset all source edits"
                          onClick={() => patch({ rendition: undefined, colorOverrides: undefined })}
                        >
                          <UndoIcon /> Reset source edits
                        </button>
                      </div>
                      {mediaBusy && (
                        <p role="status" style={{ margin: 0, fontSize: 12.5 }}>
                          Processing image…
                        </p>
                      )}
                      <div className="vs-row-2">
                        {number('Brightness', 'brightness', -1, 1, 0.05)}
                        {number('Contrast', 'contrast', -100, 100)}
                        {number('Saturation', 'saturation', -2, 2, 0.1)}
                        {number('Blur', 'blur', 0, 30)}
                        {number('Temperature', 'warmth', -100, 100)}
                        {number('Tint', 'tint', -100, 100)}
                      </div>
                      <div className="shape-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <button
                          data-tip="Apply Mono filter"
                          onClick={() => patch({ filter: 'mono', saturation: 0, contrast: 10 })}
                        >
                          Mono
                        </button>
                        <button
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
                        </button>
                        <button
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
                        </button>
                        <button
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
                        </button>
                      </div>
                    </Sec>

                    {item.asset?.editable.colors &&
                      item.asset.assetUrl.startsWith('data:image/svg+xml,') && (
                        <Sec title="Graphic colors" icon={<DropletIcon />}>
                          {[
                            ...new Set(
                              [
                                ...decodeURIComponent(
                                  item.asset.assetUrl.slice('data:image/svg+xml,'.length),
                                ).matchAll(/(?:fill|stroke)="(#[0-9a-f]{6}|currentColor)"/gi),
                              ].map((match) => match[1].toLowerCase()),
                            ),
                          ].map((from) => (
                            <label className="vs-field" key={from}>
                              <span>
                                Replace <code>{from}</code>
                              </span>
                              <input
                                className="vs-color"
                                aria-label={`Replace color ${from}`}
                                type="color"
                                value={
                                  item.colorOverrides?.[from] ||
                                  (from === 'currentcolor' ? '#000000' : from)
                                }
                                disabled={mediaBusy}
                                onChange={(event) =>
                                  void runMedia(() =>
                                    adapter.recolorAsset(from, event.target.value),
                                  )
                                }
                              />
                            </label>
                          ))}
                        </Sec>
                      )}

                    <Sec title="Fit & crop" icon={<CropIcon />}>
                      <div className="shape-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <button data-tip="Fit image inside frame" onClick={() => adapter.setImageFit('fit')}>
                          Fit image
                        </button>
                        <button data-tip="Fill frame with image" onClick={() => adapter.setImageFit('fill')}>
                          Fill image
                        </button>
                        <button
                          data-tip="Hold to preview the original"
                          onMouseDown={() => adapter.previewOriginalImage(true)}
                          onMouseUp={() => adapter.previewOriginalImage(false)}
                          onMouseLeave={() => adapter.previewOriginalImage(false)}
                        >
                          Hold for original
                        </button>
                      </div>
                      {!crop ? (
                        <button
                          className="vs-btn vs-btn--light"
                          style={{ justifyContent: 'center' }}
                          onClick={() => adapter.startImageCrop()}
                        >
                          <CropIcon /> Edit crop
                        </button>
                      ) : (
                        <>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--vs-mute)' }}>
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
                            <button
                              className="vs-btn vs-btn--primary"
                              style={{ justifyContent: 'center' }}
                              onClick={() => adapter.applyCrop()}
                            >
                              <CheckIcon /> Apply crop
                            </button>
                            <button
                              className="vs-btn vs-btn--light"
                              style={{ justifyContent: 'center' }}
                              onClick={() => adapter.cancelCrop()}
                            >
                              Cancel crop
                            </button>
                          </div>
                        </>
                      )}
                      <button
                        className="vs-btn vs-btn--light"
                        style={{ justifyContent: 'center' }}
                        onClick={() => patch({ crop: undefined })}
                      >
                        Reset crop
                      </button>
                    </Sec>

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
                        <button
                          className="vs-btn vs-btn--light"
                          style={{ justifyContent: 'center' }}
                          disabled={!item.contentAsset}
                          onClick={() => adapter.detachFrameContent()}
                        >
                          Detach content
                        </button>
                      </Sec>
                    )}
                  </Sec>
                )}
              </>
            ))}
        </div>
    </aside>
  );
}
