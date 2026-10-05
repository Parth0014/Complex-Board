import { useEffect, useState, useSyncExternalStore } from 'react';
import { KonvaCanvasAdapter } from './vision/canvas/KonvaCanvasAdapter';
import { KonvaStage } from './vision/canvas/KonvaStage';
import { StudioShell } from './studio/StudioShell';
import './studio/v5/v5-tokens.css';
import './studio/v5/v5-chrome.css';
import './studio/v5/v5-panels.css';
import { EditorFeatures, type EditorPanel } from './studio/EditorFeatures';
import type { StudioTab } from './studio/studioTypes';
import {
  AlignIcon,
  BackwardIcon,
  BoldIcon,
  ChevronDownIcon,
  DistributeHIcon,
  DistributeVIcon,
  DropletIcon,
  DuplicateIcon,
  EraserIcon,
  FitIcon,
  ForwardIcon,
  GroupIcon,
  HandIcon,
  HighlighterIcon,
  ItalicIcon,
  LockIcon,
  MarkerIcon,
  MinusIcon,
  PenIcon,
  PlusIcon,
  SelectIcon,
  SlidersIcon,
  TrashIcon,
  UnderlineIcon,
  UngroupIcon,
  UnlockIcon,
} from './studio/icons';

const DRAW_MODES = [
  { id: 'pen', label: 'pen', tip: 'Pen — freehand strokes', Icon: PenIcon },
  { id: 'marker', label: 'marker', tip: 'Marker — bold strokes', Icon: MarkerIcon },
  { id: 'highlighter', label: 'highlighter', tip: 'Highlighter — translucent marks', Icon: HighlighterIcon },
  { id: 'eraser', label: 'eraser', tip: 'Eraser — remove drawings', Icon: EraserIcon },
] as const;

function Editor({ adapter }: { adapter: KonvaCanvasAdapter }) {
  useSyncExternalStore(adapter.subscribe, adapter.getSnapshot);
  const [drawMode, setDrawMode] = useState('select');
  const [handTool, setHandTool] = useState(false);
  const [editorPanel, setEditorPanel] = useState<EditorPanel>(null);
  const [studioTab, setStudioTab] = useState<StudioTab | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [displayZoom, setDisplayZoom] = useState(40);
  const document = adapter.history.document;
  useEffect(() => {
    void adapter.initialize();
  }, [adapter]);
  const selection = adapter.getSelection();
  const item = document.items.find((item) => item.id === selection.ids[0]);
  const selectedItems = document.items.filter((item) => selection.ids.includes(item.id));
  const locked = selectedItems.some((item) => item.locked);
  const selectionKey = selection.ids.join('|');
  useEffect(() => {
    if (selection.count > 0 && editorPanel === null && studioTab === null) setEditorPanel('style');
    // Open properties when a new selection is made, but never interrupt Create/Layers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, studioTab]);
  const unitCount = new Set(selectedItems.map((item) => item.groupId || item.id)).size;
  useEffect(() => {
    const isEditorInput = (target: EventTarget | null) => {
      const node = target as HTMLElement;
      return /INPUT|TEXTAREA|SELECT/.test(node?.tagName) && !node.closest('[role="dialog"]');
    };
    const focusIn = (event: FocusEvent) => {
      if (isEditorInput(event.target)) adapter.beginGesture();
    };
    const focusOut = (event: FocusEvent) => {
      if (isEditorInput(event.target)) adapter.endGesture();
    };
    const release = (event: PointerEvent) => {
      if ((event.target as HTMLInputElement)?.type === 'range') adapter.endGesture();
    };
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[role="dialog"]')) return;
      if (event.key === 'Escape' && /INPUT|TEXTAREA/.test(target.tagName)) {
        adapter.cancelGesture();
        target.blur();
        return;
      }
      if (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        adapter.select(adapter.history.document.items.map((item) => item.id));
      } else if (command && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        event.shiftKey ? adapter.ungroupSelection() : adapter.groupSelection();
      } else if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? adapter.redo() : adapter.undo();
      } else if (command && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        void adapter.copyToSystem();
      } else if (command && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        void adapter.copyToSystem(true);
      } else if (command && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        void adapter.pasteFromSystem();
      } else if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        adapter.duplicateSelection();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (adapter.selectedIds.length) adapter.delete(adapter.selectedIds);
      } else if (event.key === 'Escape') {
        if (adapter.groupScope.length) adapter.exitGroup();
        else adapter.select([]);
      } else if (event.key === '[') adapter.arrangeSelection(command ? 'back' : 'backward');
      else if (event.key === ']') adapter.arrangeSelection(command ? 'front' : 'forward');
      else if (event.key.startsWith('Arrow') && adapter.selectedIds.length) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        if (
          adapter.history.document.items.some(
            (item) => adapter.selectedIds.includes(item.id) && item.locked,
          )
        )
          return;
        adapter.patchItems(
          adapter.history.document.items
            .filter((item) => adapter.selectedIds.includes(item.id))
            .map((item) => ({
              id: item.id,
              patch: {
                x:
                  item.x +
                  (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
                y:
                  item.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0),
              },
            })),
        );
      }
    };
    adapter.ownerWindow.document.addEventListener('keydown', key);
    adapter.ownerWindow.document.addEventListener('focusin', focusIn);
    adapter.ownerWindow.document.addEventListener('focusout', focusOut);
    adapter.ownerWindow.document.addEventListener('pointerup', release);
    return () => {
      adapter.ownerWindow.document.removeEventListener('keydown', key);
      adapter.ownerWindow.document.removeEventListener('focusin', focusIn);
      adapter.ownerWindow.document.removeEventListener('focusout', focusOut);
      adapter.ownerWindow.document.removeEventListener('pointerup', release);
    };
  }, [adapter]);

  const selectionType =
    selection.count === 1
      ? item?.kind === 'text'
        ? 'Text'
        : item?.kind === 'asset'
          ? 'Media'
          : item?.kind === 'shape'
            ? 'Shape'
            : item?.kind === 'drawing'
              ? 'Drawing'
              : 'Object'
      : `${selection.count} items`;

  return (
    <StudioShell adapter={adapter} tab={studioTab} setTab={setStudioTab}>
      <div className="vs-stage-fill">
        <nav className="vs-tools vs-dark" role="toolbar" aria-label="Canvas tools">
          <button
            className={`vs-icon-btn${drawMode === 'select' && !handTool ? ' is-active' : ''}`}
            data-tip="Select — move and resize objects (V)"
            aria-label="Select"
            aria-pressed={drawMode === 'select' && !handTool}
            onClick={() => {
              setHandTool(false);
              setDrawMode('select');
            }}
          >
            <SelectIcon />
          </button>
          <button
            className={`vs-icon-btn${handTool ? ' is-active' : ''}`}
            data-tip="Pan — drag the canvas (hold Space anytime)"
            aria-label="Hand tool"
            aria-pressed={handTool}
            onClick={() => {
              setHandTool(!handTool);
              setDrawMode('select');
            }}
          >
            <HandIcon />
          </button>
          <span className="vs-tools__divider" aria-hidden="true" />
          {DRAW_MODES.map(({ id, label, tip, Icon }) => (
            <button
              key={id}
              className={`vs-icon-btn${drawMode === id ? ' is-active' : ''}`}
              data-tip={tip}
              aria-label={label}
              aria-pressed={drawMode === id}
              onClick={() => {
                setHandTool(false);
                setDrawMode(id);
              }}
            >
              <Icon />
            </button>
          ))}
        </nav>

        {selection.count > 0 && (
          <div className="vs-sel vs-dark" role="toolbar" aria-label="Selection controls">
            <span className="vs-sel__chip">
              {selectionType}
              <small>{selection.count === 1 ? 'selected' : 'selected together'}</small>
            </span>
            <span className="vs-sel__divider" aria-hidden="true" />

            {selection.kind === 'text' && item && (
              <>
                <input
                  className="vs-sel__num"
                  style={{ width: 130 }}
                  aria-label="Text"
                  value={item.text || ''}
                  onChange={(event) =>
                    adapter.patchItems([{ id: item.id, patch: { text: event.target.value } }])
                  }
                />
                <input
                  className="vs-sel__num"
                  data-tip="Text size"
                  aria-label="Text size"
                  type="number"
                  min="8"
                  max="240"
                  value={item.fontSize}
                  onChange={(event) =>
                    adapter.updateSelection({
                      fontSize: Math.max(8, Math.min(240, Number(event.target.value))),
                    })
                  }
                />
                <input
                  className="vs-sel__color"
                  data-tip="Text color"
                  aria-label="Text color"
                  type="color"
                  value={item.color}
                  onChange={(event) => adapter.updateSelection({ strokeColor: event.target.value })}
                />
                <details className="vs-menu">
                  <summary className="vs-sel__menubtn">
                    Text style <ChevronDownIcon />
                  </summary>
                  <div className="vs-menu__pop">
                    <div className="vs-sel__fmtrow">
                      <button
                        className={`vs-sel__fmt${item.bold ? ' is-active' : ''}`}
                        data-tip="Bold"
                        aria-label="Bold"
                        aria-pressed={!!item.bold}
                        onClick={() =>
                          adapter.patchItems([{ id: item.id, patch: { bold: !item.bold } }])
                        }
                      >
                        <BoldIcon />
                      </button>
                      <button
                        className={`vs-sel__fmt${item.italic ? ' is-active' : ''}`}
                        data-tip="Italic"
                        aria-label="Italic"
                        aria-pressed={!!item.italic}
                        onClick={() =>
                          adapter.patchItems([{ id: item.id, patch: { italic: !item.italic } }])
                        }
                      >
                        <ItalicIcon />
                      </button>
                      <button
                        className={`vs-sel__fmt${item.underline ? ' is-active' : ''}`}
                        data-tip="Underline"
                        aria-label="Underline"
                        aria-pressed={!!item.underline}
                        onClick={() =>
                          adapter.patchItems([
                            { id: item.id, patch: { underline: !item.underline } },
                          ])
                        }
                      >
                        <UnderlineIcon />
                      </button>
                    </div>
                    <div className="vs-menu__divider" />
                    <label>
                      Align
                      <select
                        value={item.align || 'left'}
                        onChange={(event) =>
                          adapter.patchItems([
                            {
                              id: item.id,
                              patch: {
                                align: event.target.value as 'left' | 'center' | 'right' | 'justify',
                              },
                            },
                          ])
                        }
                      >
                        {['left', 'center', 'right', 'justify'].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Letter spacing
                      <input
                        type="number"
                        min="-5"
                        max="30"
                        value={item.letterSpacing || 0}
                        onChange={(event) =>
                          adapter.patchItems([
                            {
                              id: item.id,
                              patch: {
                                letterSpacing: Math.max(-5, Math.min(30, Number(event.target.value))),
                              },
                            },
                          ])
                        }
                      />
                    </label>
                    <label>
                      Line height
                      <input
                        type="number"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={item.lineHeight || 1}
                        onChange={(event) =>
                          adapter.patchItems([
                            {
                              id: item.id,
                              patch: {
                                lineHeight: Math.max(0.5, Math.min(3, Number(event.target.value))),
                              },
                            },
                          ])
                        }
                      />
                    </label>
                  </div>
                </details>
                <span className="vs-sel__divider" aria-hidden="true" />
              </>
            )}

            {selection.count === 1 && item?.kind === 'asset' && (
              <>
                <details className="vs-menu">
                  <summary className="vs-sel__menubtn">
                    Graphic style <ChevronDownIcon />
                  </summary>
                  <div className="vs-menu__pop">
                    <button
                      className="vs-menu__item"
                      aria-pressed={!!item.flipX}
                      onClick={() =>
                        adapter.patchItems([{ id: item.id, patch: { flipX: !item.flipX } }])
                      }
                    >
                      Flip horizontal
                    </button>
                    <button
                      className="vs-menu__item"
                      aria-pressed={!!item.flipY}
                      onClick={() =>
                        adapter.patchItems([{ id: item.id, patch: { flipY: !item.flipY } }])
                      }
                    >
                      Flip vertical
                    </button>
                    <div className="vs-menu__divider" />
                    <label>
                      Border width
                      <input
                        aria-label="Border width"
                        type="number"
                        min="0"
                        max="30"
                        value={item.borderWidth || 0}
                        onChange={(event) =>
                          adapter.patchItems([
                            {
                              id: item.id,
                              patch: {
                                borderWidth: Math.max(0, Math.min(30, Number(event.target.value))),
                              },
                            },
                          ])
                        }
                      />
                    </label>
                    <label>
                      Border color
                      <input
                        type="color"
                        value={item.borderColor || '#33272b'}
                        onChange={(event) =>
                          adapter.patchItems([
                            { id: item.id, patch: { borderColor: event.target.value } },
                          ])
                        }
                      />
                    </label>
                    <label>
                      Shadow
                      <select
                        aria-label="Shadow"
                        value={item.shadow || 'none'}
                        onChange={(event) =>
                          adapter.patchItems([
                            {
                              id: item.id,
                              patch: {
                                shadow: event.target.value as 'none' | 'soft' | 'medium' | 'hard',
                              },
                            },
                          ])
                        }
                      >
                        {['none', 'soft', 'medium', 'hard'].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </details>
                <span className="vs-sel__divider" aria-hidden="true" />
              </>
            )}

            <button
              className="vs-icon-btn"
              data-tip="Duplicate (Ctrl+D)"
              aria-label="Duplicate"
              onClick={() => adapter.duplicateSelection()}
            >
              <DuplicateIcon />
            </button>

            <details className="vs-menu">
              <summary
                className="vs-icon-btn"
                data-tip="Align and distribute"
                aria-label="Position"
              >
                <AlignIcon />
              </summary>
              <div className="vs-menu__pop">
                <p className="vs-menu__kicker">Align {unitCount === 1 ? 'to page' : 'selection'}</p>
                {(
                  [
                    ['left', 'Left'],
                    ['center', 'Center'],
                    ['right', 'Right'],
                    ['top', 'Top'],
                    ['middle', 'Middle'],
                    ['bottom', 'Bottom'],
                  ] as const
                ).map(([alignment, label]) => (
                  <button
                    key={alignment}
                    className="vs-menu__item"
                    disabled={locked}
                    onClick={() => adapter.alignSelection(alignment)}
                  >
                    {label}
                  </button>
                ))}
                <div className="vs-menu__divider" />
                <button
                  className="vs-menu__item"
                  disabled={unitCount < 3 || locked}
                  onClick={() => adapter.distributeSelection('horizontal')}
                >
                  <DistributeHIcon /> Space horizontally
                </button>
                <button
                  className="vs-menu__item"
                  disabled={unitCount < 3 || locked}
                  onClick={() => adapter.distributeSelection('vertical')}
                >
                  <DistributeVIcon /> Space vertically
                </button>
              </div>
            </details>

            <details className="vs-menu">
              <summary className="vs-icon-btn" data-tip="Opacity" aria-label="Opacity">
                <DropletIcon />
              </summary>
              <div className="vs-menu__pop">
                <label className="vs-sel__opacity">
                  <span>Opacity</span>
                  <input
                    className="vs-range"
                    aria-label="Opacity"
                    type="range"
                    min="0"
                    max="100"
                    value={selection.style.opacity || 0}
                    onChange={(event) =>
                      adapter.updateSelection({ opacity: Number(event.target.value) })
                    }
                  />
                  <output>{Math.round(selection.style.opacity || 0)}%</output>
                </label>
              </div>
            </details>

            <button
                className="vs-icon-btn"
                data-tip="Group selection (Ctrl+G)"
                aria-label="Group"
                disabled={locked || selection.count < 2}
                onClick={() => adapter.groupSelection()}
              >
                <GroupIcon />
              </button>
              <button
                className="vs-icon-btn"
                data-tip="Ungroup selection (Ctrl+Shift+G)"
                aria-label="Ungroup"
                disabled={locked || !selectedItems.some((selected) => selected.groupId)}
                onClick={() => adapter.ungroupSelection()}
              >
                <UngroupIcon />
              </button>

            <button
              className="vs-icon-btn"
              data-tip={selectedItems.every((selected) => selected.locked) ? 'Unlock' : 'Lock'}
              aria-label={selectedItems.every((selected) => selected.locked) ? 'Unlock' : 'Lock'}
              onClick={() => adapter.toggleLock()}
            >
              {selectedItems.every((selected) => selected.locked) ? <UnlockIcon /> : <LockIcon />}
            </button>

            <button
              className="vs-icon-btn is-danger"
              data-tip="Delete (Del)"
              aria-label="Delete"
              onClick={() => adapter.delete(adapter.selectedIds)}
            >
              <TrashIcon />
            </button>

            <span className="vs-sel__divider" aria-hidden="true" />
            <button
              className={`vs-sel__design${editorPanel === 'style' ? ' is-active' : ''}`}
              data-tip="Open full properties"
              aria-label="Open properties"
              aria-pressed={editorPanel === 'style'}
              onClick={() => setEditorPanel(editorPanel === 'style' ? null : 'style')}
            >
              <SlidersIcon />
              <span>Style</span>
            </button>
          </div>
        )}

        <KonvaStage
          drawMode={drawMode}
          handTool={handTool}
          adapter={adapter}
          zoom={zoom}
          onZoomChange={setZoom}
          onScaleChange={setDisplayZoom}
        />

        <div className="vs-pages">
          <details className="vs-menu vs-items-pop">
            <summary
              className="vs-page-select"
              data-tip="All board items"
              aria-label="Board items outline"
            >
              Board items ({document.items.length}) <ChevronDownIcon />
            </summary>
            <div className="vs-menu__pop">
              <ul className="v1-items">
                {[...document.items].reverse().map((boardItem) => (
                  <li key={boardItem.id}>
                    <button
                      className={`vs-menu__item${
                        selection.ids.includes(boardItem.id) ? ' is-active' : ''
                      }`}
                      aria-pressed={selection.ids.includes(boardItem.id)}
                      onClick={() => adapter.select([boardItem.id])}
                    >
                      {boardItem.locked && <LockIcon />}
                      <span>
                        {boardItem.groupId ? 'Group · ' : ''}
                        {boardItem.text || boardItem.asset?.title || boardItem.shape || 'Drawing'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {!document.items.length && <p className="vs-menu__note">Nothing on the board yet.</p>}
            </div>
          </details>
          <span className="vs-sel__divider" style={{ background: 'var(--vs-line-soft)' }} aria-hidden="true" />
          <label className="vs-page-select" data-tip="Active page">
            <span className="sr-only">Page</span>
            <select
              aria-label="Active page"
              value={document.activePageId || ''}
              onChange={(event) => adapter.switchPage(event.target.value)}
            >
              {document.pages ? (
                document.pages.map((page, index) => (
                  <option key={page.id} value={page.id} label={`${index + 1}`}>
                    Page {index + 1}
                  </option>
                ))
              ) : (
                <option value="">Page 1</option>
              )}
            </select>
          </label>
          <button
            className="vs-icon-btn"
            data-tip="Add page"
            aria-label="Add page"
            onClick={() => adapter.addPage()}
          >
            <PlusIcon />
          </button>
          <button
            className="vs-icon-btn is-danger"
            data-tip="Delete current page"
            aria-label="Delete page"
            disabled={!document.pages || document.pages.length < 2}
            onClick={() => adapter.deletePage()}
          >
            <TrashIcon />
          </button>
          <span
            className="vs-zoom__pct vs-page-dims"
            data-tip="Board dimensions"
            style={{ minWidth: 'auto', padding: '0 8px' }}
          >
            {document.width}×{document.height}
          </span>
        </div>

        <div className="vs-zoom">
          <button
            className="vs-icon-btn"
            data-tip="Zoom out"
            aria-label="Zoom out"
            onClick={() => setZoom(Math.max(0.1, displayZoom / 100 - 0.1))}
          >
            <MinusIcon />
          </button>
          <input
            className="vs-range"
            aria-label="Zoom"
            type="range"
            min="10"
            max="150"
            value={displayZoom}
            onChange={(event) => setZoom(Number(event.target.value) / 100)}
          />
          <span className="vs-zoom__pct">{displayZoom}%</span>
          <button
            className="vs-icon-btn"
            data-tip="Zoom in"
            aria-label="Zoom in"
            onClick={() => setZoom(Math.min(1.5, displayZoom / 100 + 0.1))}
          >
            <PlusIcon />
          </button>
          <button
            className="vs-icon-btn"
            data-tip="Fit board to view"
            aria-label="Fit board to view"
            onClick={() => adapter.fitBoard()}
          >
            <FitIcon />
          </button>
        </div>
      </div>

      <EditorFeatures adapter={adapter} panel={editorPanel} setPanel={setEditorPanel} />
    </StudioShell>
  );
}

export default function App() {
  const [adapter, setAdapter] = useState<KonvaCanvasAdapter>();
  return (
    <div
      className="vs-root"
      ref={(node) => {
        if (node && !adapter && node.ownerDocument.defaultView)
          setAdapter(
            new KonvaCanvasAdapter(node.ownerDocument.defaultView as Window & typeof globalThis),
          );
      }}
    >
      {adapter && <Editor adapter={adapter} />}
    </div>
  );
}
