import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { KonvaCanvasAdapter } from './vision/canvas/KonvaCanvasAdapter';
import { KonvaStage } from './vision/canvas/KonvaStage';
import { StudioShell } from './studio/StudioShell';
import { BoardSizeControl } from './studio/BoardSizeControl';
import { useMenuPlacement } from './studio/useMenuPlacement';
import './studio/v5/v5-tokens.css';
import './studio/v5/v5-chrome.css';
import './studio/v5/v5-panels.css';
import './studio/v5/v5-layout.css';
import './studio/v5/v5-hierarchy.css';
import './studio/v5/v5-controls.css';
import './studio/v5/v5-corners.css';
import { EditorFeatures, type EditorPanel } from './studio/EditorFeatures';
import type { StudioTab } from './studio/studioTypes';
import {
  AlignIcon,
  BoldIcon,
  ChevronDownIcon,
  DistributeHIcon,
  DistributeVIcon,
  DropletIcon,
  DuplicateIcon,
  EraserIcon,
  FitIcon,
  GroupIcon,
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
  {
    id: 'highlighter',
    label: 'highlighter',
    tip: 'Highlighter — translucent marks',
    Icon: HighlighterIcon,
  },
  { id: 'eraser', label: 'eraser', tip: 'Eraser — remove drawings', Icon: EraserIcon },
] as const;

function Editor({ adapter }: { adapter: KonvaCanvasAdapter }) {
  const replacementInput = useRef<HTMLInputElement>(null);
  const replacementId = useRef<string | null>(null);
  const [replacingImage, setReplacingImage] = useState(false);
  const [replacementError, setReplacementError] = useState('');
  useMenuPlacement(adapter.ownerWindow);
  useSyncExternalStore(adapter.subscribe, adapter.getSnapshot);
  const [drawMode, setDrawMode] = useState('select');
  const [drawingMenuOpen, setDrawingMenuOpen] = useState(false);
  const [drawButton, setDrawButton] = useState<HTMLElement | null>(null);
  const [drawPalettePosition, setDrawPalettePosition] = useState({ top: 100, left: 80 });
  useLayoutEffect(() => {
    if (!drawButton || !drawingMenuOpen) return;
    const update = () => {
      const rect = drawButton.getBoundingClientRect();
      const palette = adapter.ownerWindow.document.querySelector('.vs-draw-pop');
      const height = palette?.getBoundingClientRect().height || 200;
      const next = {
        top: Math.max(8, Math.min(rect.top, adapter.ownerWindow.innerHeight - height - 8)),
        left: Math.max(8, Math.min(rect.right + 8, adapter.ownerWindow.innerWidth - 140)),
      };
      setDrawPalettePosition((current) =>
        current.top === next.top && current.left === next.left ? current : next,
      );
    };
    const observer = new adapter.ownerWindow.ResizeObserver(update);
    observer.observe(drawButton);
    const palette = adapter.ownerWindow.document.querySelector('.vs-draw-pop');
    if (palette) observer.observe(palette);
    adapter.ownerWindow.addEventListener('resize', update);
    adapter.ownerWindow.document.addEventListener('scroll', update, true);
    update();
    return () => {
      observer.disconnect();
      adapter.ownerWindow.removeEventListener('resize', update);
      adapter.ownerWindow.document.removeEventListener('scroll', update, true);
    };
  }, [drawButton, drawingMenuOpen, drawMode, adapter]);
  const [editorPanel, setEditorPanel] = useState<EditorPanel>(null);
  const [studioTab, setStudioTab] = useState<StudioTab | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [displayZoom, setDisplayZoom] = useState(40);
  const [snappingContainer, setSnappingContainer] = useState<HTMLDivElement | null>(null);
  const [workspaceNode, setWorkspaceNode] = useState<HTMLDivElement | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    if (!workspaceNode) return;
    const update = () => {
      const rect = workspaceNode.getBoundingClientRect();
      const next = { top: rect.top + 12, left: rect.left + rect.width / 2, width: rect.width - 24 };
      setToolbarPosition((current) =>
        current.top === next.top && current.left === next.left && current.width === next.width
          ? current
          : next,
      );
    };
    const observer = new adapter.ownerWindow.ResizeObserver(update);
    observer.observe(workspaceNode);
    adapter.ownerWindow.addEventListener('resize', update);
    update();
    return () => {
      observer.disconnect();
      adapter.ownerWindow.removeEventListener('resize', update);
    };
  }, [workspaceNode, adapter]);
  const document = adapter.history.document;
  useEffect(() => {
    void adapter.initialize();
  }, [adapter]);
  const selection = adapter.getSelection();
  const item = document.items.find((item) => item.id === selection.ids[0]);
  const selectedItems = document.items.filter((item) => selection.ids.includes(item.id));
  const locked = selectedItems.some((item) => item.locked);
  const canUngroup = selectedItems.some((item) => item.groupId);
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
        setDrawMode('select');
        setDrawingMenuOpen(false);
        if (adapter.groupScope.length) adapter.exitGroup();
        else adapter.select([]);
      } else if (!command && event.key.toLowerCase() === 'v') setDrawMode('select');
      else if (event.key === '[') adapter.arrangeSelection(command ? 'back' : 'backward');
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
    <StudioShell
      adapter={adapter}
      tab={studioTab}
      setTab={setStudioTab}
      drawingTools={
        <div className="vs-menu vs-drawing-menu">
          <button
            ref={setDrawButton}
            className="vs-rail__tab"
            aria-label="Drawing tools"
            aria-expanded={drawingMenuOpen}
            aria-controls="drawing-palette"
            onClick={(event) => {
              event.preventDefault();
              setDrawingMenuOpen(true);
            }}
          >
            {(() => {
              const Icon = DRAW_MODES.find((tool) => tool.id === drawMode)?.Icon || PenIcon;
              return <Icon />;
            })()}
            <span>Draw</span>
          </button>
          {drawingMenuOpen &&
            drawButton &&
            createPortal(
              <div
                id="drawing-palette"
                className="vs-menu__pop vs-draw-pop"
                style={drawPalettePosition}
                role="toolbar"
                aria-label="Drawing palette"
              >
                <p className="vs-menu__kicker">Drawing tools</p>
                <button
                  className="vs-menu__item"
                  aria-label="Select"
                  aria-pressed={drawMode === 'select'}
                  onClick={() => {
                    setDrawMode('select');
                    setDrawingMenuOpen(false);
                  }}
                >
                  <SelectIcon /> Arrange
                </button>
                {DRAW_MODES.map(({ id, label, tip, Icon }) => (
                  <button
                    key={id}
                    className={`vs-menu__item${drawMode === id ? ' is-active' : ''}`}
                    aria-label={label}
                    aria-pressed={drawMode === id}
                    data-tip={tip}
                    onClick={() => {
                      setDrawMode(id);
                      adapter.select([]);
                    }}
                  >
                    <Icon />
                    {label}
                  </button>
                ))}
              </div>,
              drawButton.closest('.vs')!,
            )}
        </div>
      }
    >
      <div className="vs-stage-fill" ref={setWorkspaceNode}>
        <input
          ref={replacementInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Replacement image file"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0],
              id = replacementId.current;
            event.target.value = '';
            if (!file || !id) return;
            setReplacingImage(true);
            setReplacementError('');
            try {
              await adapter.replaceImageFile(id, file);
            } catch (error) {
              setReplacementError(
                error instanceof Error ? error.message : 'Unable to replace image.',
              );
            } finally {
              setReplacingImage(false);
            }
          }}
        />
        {replacementError && (
          <p className="canvas-message" role="alert">
            {replacementError}
          </p>
        )}
        {selection.count > 0 && !editorPanel && (
          <div
            className="vs-sel vs-dark"
            role="toolbar"
            aria-label="Selection controls"
            style={{
              position: 'fixed',
              top: toolbarPosition.top,
              left: toolbarPosition.left,
              maxWidth: toolbarPosition.width,
            }}
          >
            <span className="vs-sel__chip">
              {selectionType}
              <small>{selection.count === 1 ? 'selected' : 'selected together'}</small>
            </span>
            <span className="vs-sel__divider" aria-hidden="true" />

            {selection.count === 1 && item?.kind === 'asset' && (
              <button
                className="vs-sel__design"
                aria-label="Replace image"
                disabled={
                  locked || replacingImage || !!adapter.cropDraft || adapter.originalPreview
                }
                onClick={() => {
                  replacementId.current = item.id;
                  replacementInput.current?.click();
                }}
              >
                {replacingImage ? 'Replacing…' : 'Replace image'}
              </button>
            )}

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
                                align: event.target.value as
                                  'left' | 'center' | 'right' | 'justify',
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
                                letterSpacing: Math.max(
                                  -5,
                                  Math.min(30, Number(event.target.value)),
                                ),
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
              data-tip={
                canUngroup ? 'Ungroup selection (Ctrl+Shift+G)' : 'Group selection (Ctrl+G)'
              }
              aria-label={canUngroup ? 'Ungroup' : 'Group'}
              disabled={locked || (!canUngroup && selection.count < 2)}
              onClick={() => (canUngroup ? adapter.ungroupSelection() : adapter.groupSelection())}
            >
              {canUngroup ? <UngroupIcon /> : <GroupIcon />}
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
          key="vision-canvas"
          snappingContainer={snappingContainer}
          drawMode={drawMode}
          adapter={adapter}
          zoom={zoom}
          onZoomChange={setZoom}
          onScaleChange={setDisplayZoom}
        />

        <div className="vs-bottom-dock" aria-label="Board controls">
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
                {!document.items.length && (
                  <p className="vs-menu__note">Nothing on the board yet.</p>
                )}
              </div>
            </details>
            <span
              className="vs-sel__divider"
              style={{ background: 'var(--vs-line-soft)' }}
              aria-hidden="true"
            />
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
            <BoardSizeControl adapter={adapter} />
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
          <div className="vs-snap-slot" ref={setSnappingContainer} />
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
