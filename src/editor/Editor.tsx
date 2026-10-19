import { ReplaceImageDialog } from '../studio/ReplaceImageDialog';
import { selectableIds } from '../studio/selection';
import { ZoomControls } from '../studio/chrome/ZoomControls';
import { Button } from '../studio/ui/Button';
import { Slider } from '../studio/ui/Slider';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { KonvaCanvasAdapter } from '../vision/canvas/KonvaCanvasAdapter';
import { KonvaStage } from '../vision/canvas/KonvaStage';
import { StudioShell } from '../studio/StudioShell';
import { SelectionToolbar } from '../studio/SelectionToolbar';
import { ContextActions } from '../studio/ContextActions';
import { ObjectDock } from '../studio/appearance/ObjectDock';
import { useMenuPlacement } from '../studio/useMenuPlacement';
import { EditorFeatures, type EditorPanel } from '../studio/EditorFeatures';
import type { StudioTab } from '../studio/studioTypes';
import {
  ChevronDownIcon,
  EraserIcon,
  HighlighterIcon,
  MarkerIcon,
  PenIcon,
  SelectIcon,
  MagnetIcon,
} from '../studio/icons';

const DRAW_MODES = [
  { id: 'pen', label: 'Pen', tip: 'Pen — freehand strokes', Icon: PenIcon },
  { id: 'marker', label: 'Marker', tip: 'Marker — bold strokes', Icon: MarkerIcon },
  {
    id: 'highlighter',
    label: 'Highlighter',
    tip: 'Highlighter — translucent marks',
    Icon: HighlighterIcon,
  },
  { id: 'eraser', label: 'Eraser', tip: 'Eraser — remove drawings', Icon: EraserIcon },
] as const;

export function Editor({
  adapter,
  onHome,
  initialTab,
}: {
  adapter: KonvaCanvasAdapter;
  onHome: () => void;
  initialTab: StudioTab | null;
}) {
  const canvasSettings = useRef<HTMLDetailsElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const doc = adapter.ownerWindow.document;
    const close = (event: PointerEvent) => {
      const settings = canvasSettings.current;
      if (settings?.open && !settings.contains(event.target as Node)) settings.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canvasSettings.current?.open) {
        canvasSettings.current.open = false;
        canvasSettings.current.querySelector('summary')?.focus();
      }
    };
    doc.addEventListener('pointerdown', close, true);
    doc.addEventListener('keydown', escape);
    return () => {
      doc.removeEventListener('pointerdown', close, true);
      doc.removeEventListener('keydown', escape);
    };
  }, [adapter]);
  const [replacementId, setReplacementId] = useState<string | null>(null);
  useMenuPlacement(adapter.ownerWindow);
  useSyncExternalStore(adapter.subscribe, adapter.getSnapshot);
  const [drawMode, setDrawMode] = useState('select');
  const [drawingMenuOpen, setDrawingMenuOpen] = useState(false);
  const [brush, setBrush] = useState({ color: '#33272b', width: 4, opacity: 1 });
  const [drawButton, setDrawButton] = useState<HTMLElement | null>(null);
  const [drawPalettePosition, setDrawPalettePosition] = useState({ top: 100, left: 80 });
  useLayoutEffect(() => {
    if (!drawButton || !drawingMenuOpen) return;
    const update = () => {
      const rect = drawButton.getBoundingClientRect();
      const palette = adapter.ownerWindow.document.querySelector('.vs-draw-pop');
      const height = palette?.getBoundingClientRect().height || 200;
      const width = palette?.getBoundingClientRect().width || 176;
      const next = {
        top: Math.max(8, Math.min(rect.top, adapter.ownerWindow.innerHeight - height - 8)),
        left: Math.max(8, Math.min(rect.right + 8, adapter.ownerWindow.innerWidth - width - 8)),
      };
      setDrawPalettePosition((current) =>
        current.top === next.top && current.left === next.left ? current : next,
      );
    };
    const observer = new adapter.ownerWindow.ResizeObserver(update);
    observer.observe(drawButton);
    const palette = adapter.ownerWindow.document.querySelector('.vs-draw-pop');
    if (palette) observer.observe(palette);
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!drawButton.contains(target) && !palette?.contains(target)) setDrawingMenuOpen(false);
    };
    adapter.ownerWindow.document.addEventListener('pointerdown', outside, true);
    adapter.ownerWindow.addEventListener('resize', update);
    adapter.ownerWindow.document.addEventListener('scroll', update, true);
    update();
    return () => {
      observer.disconnect();
      adapter.ownerWindow.document.removeEventListener('pointerdown', outside, true);
      adapter.ownerWindow.removeEventListener('resize', update);
      adapter.ownerWindow.document.removeEventListener('scroll', update, true);
    };
  }, [drawButton, drawingMenuOpen, drawMode, adapter]);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [contextPosition, setContextPosition] = useState({ left: 8, top: 8, maxHeight: 500 });
  useLayoutEffect(() => {
    const menu = contextMenuRef.current;
    if (!menu || !contextMenu) return;
    const update = () => {
      const dock = adapter.ownerWindow.document
        .querySelector('.vs-bottom-dock')
        ?.getBoundingClientRect();
      const canvas = adapter.ownerWindow.document
        .querySelector('.gs-artboard')
        ?.getBoundingClientRect();
      const bottom = Math.min(
        adapter.ownerWindow.innerHeight - 12,
        (dock?.top ?? adapter.ownerWindow.innerHeight) - 12,
      );
      const start = Math.max(12, (canvas?.top ?? 0) + 12);
      const maxHeight = Math.max(100, bottom - start);
      const height = Math.min(menu.scrollHeight, maxHeight);
      const anchorX = Number.isFinite(contextMenu.x) ? contextMenu.x : 12;
      const anchorY = Number.isFinite(contextMenu.y) ? contextMenu.y : start;
      const next = {
        left: Math.max(
          12,
          Math.min(anchorX, adapter.ownerWindow.innerWidth - menu.offsetWidth - 12),
        ),
        top: Math.max(start, Math.min(anchorY, bottom - height)),
        maxHeight,
      };
      setContextPosition((previous) =>
        previous.left === next.left &&
        previous.top === next.top &&
        previous.maxHeight === next.maxHeight
          ? previous
          : next,
      );
    };
    const observer = new adapter.ownerWindow.ResizeObserver(update);
    observer.observe(menu);
    update();
    adapter.ownerWindow.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      adapter.ownerWindow.removeEventListener('resize', update);
    };
  }, [contextMenu, adapter]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = (event: PointerEvent) => {
      if (
        !contextMenuRef.current?.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.studio-color-popover, .gs-submenu')
      ) {
        setContextMenu(null);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target as HTMLElement).closest('.gs-submenu')) {
        event.stopPropagation();
        setContextMenu(null);
      }
    };
    const doc = adapter.ownerWindow.document;
    doc.addEventListener('pointerdown', close);
    doc.addEventListener('keydown', escape, true);
    return () => {
      doc.removeEventListener('pointerdown', close);
      doc.removeEventListener('keydown', escape, true);
    };
  }, [contextMenu, adapter]);
  const [editorPanel, setEditorPanel] = useState<EditorPanel>(null);
  const previousObjectIds = useRef(new Set(adapter.history.document.items.map((item) => item.id)));
  const objectItems = adapter.history.document.items;
  useEffect(() => {
    const next = new Set(objectItems.map((item) => item.id));
    if (objectItems.some((item) => !previousObjectIds.current.has(item.id))) setEditorPanel(null);
    previousObjectIds.current = next;
  }, [objectItems]);
  const formattingTrigger = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setContextMenu(null);
  const [studioTab, setStudioTab] = useState<StudioTab | null>(initialTab);
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
  const selection = adapter.getSelection();
  useEffect(() => {
    const isEditorInput = (target: EventTarget | null) => {
      const node = target as HTMLElement;
      return (
        /INPUT|TEXTAREA|SELECT/.test(node?.tagName) &&
        !node.closest('[aria-modal="true"], [data-gesture-owner="tweakpane"]')
      );
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
    const arrowKeys = new Set<string>();
    let nudging = false;
    const finishNudge = () => {
      if (nudging) {
        nudging = false;
        arrowKeys.clear();
        adapter.endGesture();
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      arrowKeys.delete(event.key);
      if (!arrowKeys.size) finishNudge();
    };
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.defaultPrevented || target.closest('[role="dialog"], [role="menu"]')) return;
      if (event.key === 'Escape' && /INPUT|TEXTAREA/.test(target.tagName)) {
        adapter.cancelGesture();
        target.blur();
        return;
      }
      const command = event.ctrlKey || event.metaKey;
      const input = target as HTMLInputElement;
      const nativeField = /INPUT|TEXTAREA|SELECT/.test(target.tagName);
      const textEntry =
        target.isContentEditable ||
        target.tagName === 'TEXTAREA' ||
        (target.tagName === 'INPUT' &&
          !['number', 'range', 'checkbox', 'radio', 'color', 'button'].includes(input.type));
      // Text editing owns its clipboard and undo. Inspector numeric/range edits
      // belong to document history; commit their gesture before undo/redo.
      if (textEntry) return;
      const editorCommand =
        command && ['z', 'y', 'd', 'g', '0', '1'].includes(event.key.toLowerCase());
      if (nativeField && !editorCommand) return;
      if (nativeField && editorCommand) {
        target.blur();
        adapter.endGesture();
      }
      // Roving tabs, listboxes and sliders keep their own navigation keys.
      if (
        !command &&
        event.key.startsWith('Arrow') &&
        target.closest('[role="tablist"], [role="listbox"], [role="slider"]')
      )
        return;
      if (!event.key.startsWith('Arrow')) finishNudge();
      if (
        (['+', '=', '-', '_', '0'].includes(event.key) || (command && event.key === '1')) &&
        !event.altKey
      ) {
        event.preventDefault();
        if (event.key === '0') adapter.fitBoard();
        else if (event.key === '1') adapter.zoomView?.(1);
        else
          adapter.zoomView?.(
            Math.max(
              0.1,
              Math.min(
                4,
                (zoom ?? displayZoom / 100) * (['+', '='].includes(event.key) ? 1.2 : 1 / 1.2),
              ),
            ),
          );
        return;
      }
      if (command && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        adapter.select(selectableIds(adapter.history.document.items));
      } else if (command && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        event.shiftKey ? adapter.ungroupSelection() : adapter.groupSelection();
      } else if (command && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        adapter.redo();
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
        // Native paste provides image bytes without clipboard permission prompts.
        return;
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
      else if (
        !command &&
        !event.altKey &&
        event.key.startsWith('Arrow') &&
        adapter.selectedIds.length
      ) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        if (
          adapter.history.document.items.some(
            (item) => adapter.selectedIds.includes(item.id) && item.locked,
          )
        )
          return;
        if (!nudging) {
          nudging = true;
          adapter.beginKeyboardGesture();
        }
        arrowKeys.add(event.key);
        const selectedIds = new Set(adapter.selectedIds);
        adapter.patchItems(
          adapter.history.document.items
            .filter((item) => selectedIds.has(item.id))
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
    const paste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.isContentEditable ||
        isEditorInput(target) ||
        target.closest('[role="dialog"]') ||
        !event.clipboardData
      )
        return;
      event.preventDefault();
      void adapter.pasteTransfer(event.clipboardData);
    };
    adapter.ownerWindow.document.addEventListener('paste', paste);
    adapter.ownerWindow.document.addEventListener('keydown', key);
    adapter.ownerWindow.document.addEventListener('keyup', keyUp);
    adapter.ownerWindow.addEventListener('blur', finishNudge);
    adapter.ownerWindow.document.addEventListener('focusin', focusIn);
    adapter.ownerWindow.document.addEventListener('focusout', focusOut);
    adapter.ownerWindow.document.addEventListener('pointerup', release);
    return () => {
      adapter.ownerWindow.document.removeEventListener('paste', paste);
      finishNudge();
      adapter.ownerWindow.document.removeEventListener('keydown', key);
      adapter.ownerWindow.document.removeEventListener('keyup', keyUp);
      adapter.ownerWindow.removeEventListener('blur', finishNudge);
      adapter.ownerWindow.document.removeEventListener('focusin', focusIn);
      adapter.ownerWindow.document.removeEventListener('focusout', focusOut);
      adapter.ownerWindow.document.removeEventListener('pointerup', release);
    };
  }, [adapter, zoom, displayZoom]);

  return (
    <StudioShell
      adapter={adapter}
      onHome={onHome}
      tab={studioTab}
      setTab={(tab) => {
        setStudioTab(tab);
        setDrawingMenuOpen(false);
        setDrawMode('select');
      }}
      drawingTools={
        <div className="vs-menu vs-drawing-menu">
          <Button
            ref={setDrawButton}
            className={`vs-rail__tab${drawMode !== 'select' || drawingMenuOpen ? ' is-active' : ''}`}
            aria-label="Drawing tools"
            aria-pressed={drawMode !== 'select' || drawingMenuOpen}
            aria-expanded={drawingMenuOpen}
            aria-controls="drawing-palette"
            onClick={(event) => {
              event.preventDefault();
              setStudioTab(null);
              setDrawingMenuOpen((open) => !open);
            }}
          >
            {(() => {
              const Icon = DRAW_MODES.find((tool) => tool.id === drawMode)?.Icon || PenIcon;
              return <Icon />;
            })()}
            <span>Draw</span>
          </Button>
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
                <Button
                  className="vs-menu__item"
                  aria-label="Select"
                  aria-pressed={drawMode === 'select'}
                  onClick={() => {
                    setDrawMode('select');
                    setDrawingMenuOpen(false);
                  }}
                >
                  <SelectIcon /> Select
                </Button>
                {DRAW_MODES.map(({ id, label, tip, Icon }) => (
                  <Button
                    key={id}
                    className={`vs-menu__item${drawMode === id ? ' is-active' : ''}`}
                    aria-label={label}
                    aria-pressed={drawMode === id}
                    data-tip={tip}
                    onClick={() => {
                      setDrawMode(id);
                      setBrush((current) => ({
                        ...current,
                        width: id === 'pen' ? 4 : id === 'marker' ? 12 : 28,
                        opacity: id === 'highlighter' ? 0.4 : 1,
                      }));
                      setDrawingMenuOpen(false);
                      setStudioTab(null);
                      adapter.select([]);
                    }}
                  >
                    <Icon />
                    {label}
                  </Button>
                ))}
              </div>,
              drawButton.closest('.vs')!,
            )}
        </div>
      }
    >
      <div className="vs-stage-fill" ref={setWorkspaceNode}>
        {drawMode !== 'select' && drawMode !== 'eraser' && (
          <div className="vs-drawing-options" role="toolbar" aria-label="Brush options">
            <label>
              Color{' '}
              <input
                aria-label="Brush color"
                type="color"
                value={brush.color}
                onChange={(event) => setBrush({ ...brush, color: event.target.value })}
              />
            </label>
            <label>
              Size{' '}
              <Slider
                aria-label="Brush size"
                min="1"
                max="80"
                value={brush.width}
                onChange={(event) => setBrush({ ...brush, width: Number(event.target.value) })}
              />
            </label>
            <output>{brush.width}</output>
            <label>
              Opacity{' '}
              <Slider
                aria-label="Brush opacity"
                min="10"
                max="100"
                value={Math.round(brush.opacity * 100)}
                onChange={(event) =>
                  setBrush({ ...brush, opacity: Number(event.target.value) / 100 })
                }
              />
            </label>
          </div>
        )}
        {replacementId && (
          <ReplaceImageDialog
            adapter={adapter}
            targetId={replacementId}
            onClose={() => setReplacementId(null)}
          />
        )}
        {selection.count > 0 && (
          <div
            className="vs-top-editing-bar vs-contextual-editing-bar"
            role="toolbar"
            aria-label="Selected object actions"
            style={{
              position: 'fixed',
              top: toolbarPosition.top,
              left: toolbarPosition.left,
              maxWidth: toolbarPosition.width,
            }}
          >
            <div className="vs-top-editing-bar__row">
              <SelectionToolbar
                adapter={adapter}
                formattingTrigger={formattingTrigger}
                formattingOpen={editorPanel === 'style'}
                replacingImage={false}
                onReplaceImage={() => {
                  const selected = adapter.history.document.items.find((entry) =>
                    adapter.selectedIds.includes(entry.id),
                  );
                  if (!selected) return;
                  setReplacementId(selected.id);
                }}
                onEditStyle={() => setEditorPanel(editorPanel === 'style' ? null : 'style')}
              />
            </div>
            {editorPanel && (
              <ObjectDock
                ownerWindow={adapter.ownerWindow}
                trigger={formattingTrigger}
                onClose={() => setEditorPanel(null)}
                label="Object formatting"
              >
                <EditorFeatures
                  adapter={adapter}
                  panel={editorPanel}
                  setPanel={setEditorPanel}
                  inline
                />
              </ObjectDock>
            )}
          </div>
        )}
        <KonvaStage
          key="vision-canvas"
          onObjectContextMenu={(x, y) => {
            setContextMenu({ x, y });
          }}
          snappingContainer={snappingContainer}
          drawMode={drawMode}
          brush={brush}
          adapter={adapter}
          zoom={zoom}
          onZoomChange={setZoom}
          onScaleChange={setDisplayZoom}
        />
        <div className="vs-bottom-dock" role="group" aria-label="Board controls">
          <Button
            className="vs-snap-quick"
            aria-label="Snap to edges"
            aria-pressed={adapter.snapToEdges}
            data-tip={`Snap to edges: ${adapter.snapToEdges ? 'On' : 'Off'}`}
            onClick={() => adapter.setSnapToEdges(!adapter.snapToEdges)}
          >
            <MagnetIcon />
          </Button>
          <details
            className="vs-menu vs-canvas-settings"
            ref={canvasSettings}
            open={settingsOpen}
            onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
          >
            <summary role="presentation">
              <Button
                className="vs-page-select"
                aria-label="Canvas options"
                aria-expanded={settingsOpen}
                aria-haspopup="true"
                onClick={(event) => {
                  event.preventDefault();
                  if (canvasSettings.current)
                    canvasSettings.current.open = !canvasSettings.current.open;
                }}
              >
                <span>Canvas options</span> <ChevronDownIcon />
              </Button>
            </summary>
            <div className="vs-menu__pop">
              <div className="vs-snap-slot" ref={setSnappingContainer} />
            </div>
          </details>
          <span className="vs-bottom-dock__sep" aria-hidden="true" />
          <ZoomControls
            value={zoom === null ? displayZoom : zoom * 100}
            onChange={(next) => (adapter.zoomView ? adapter.zoomView(next) : setZoom(next))}
            onFit={() => adapter.fitBoard()}
          />
        </div>
      </div>

      {contextMenu &&
        createPortal(
          <div
            className="vs vs-object-context vs-context-v2"
            ref={contextMenuRef}
            style={contextPosition}
          >
            <ContextActions adapter={adapter} onClose={closeMenu} />
          </div>,
          adapter.ownerWindow.document.body,
        )}
    </StudioShell>
  );
}
