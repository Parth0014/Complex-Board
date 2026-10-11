import { ZoomControls } from '../studio/chrome/ZoomControls';
import { Button } from '../studio/ui/Button';
import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import type { KonvaCanvasAdapter } from '../vision/canvas/KonvaCanvasAdapter';
import { KonvaStage } from '../vision/canvas/KonvaStage';
import { StudioShell } from '../studio/StudioShell';
import { SelectionToolbar } from '../studio/SelectionToolbar';
import { ContextActions } from '../studio/ContextActions';
import { ObjectDock } from '../studio/appearance/ObjectDock';
import { useMenuPlacement } from '../studio/useMenuPlacement';
import { EditorFeatures, type EditorPanel } from '../studio/EditorFeatures';
import {
  selectedAppearance,
  selectedQuickShape,
  tweakpaneD1Enabled,
  tweakpaneD2Enabled,
} from '../studio/appearance/feature';
import type { StudioTab } from '../studio/studioTypes';
import {
  ChevronDownIcon,
  EraserIcon,
  HighlighterIcon,
  MarkerIcon,
  PenIcon,
  SelectIcon,
} from '../studio/icons';

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

const QuickShapeInspector = lazy(() => import('../studio/appearance/QuickShapeInspector'));
const UnifiedInspector = lazy(() => import('../studio/appearance/UnifiedInspector'));
const HybridQuickBar = lazy(() => import('../studio/appearance/HybridQuickBar'));

export function Editor({
  adapter,
  onHome,
  initialTab,
}: {
  adapter: KonvaCanvasAdapter;
  onHome: () => void;
  initialTab: StudioTab | null;
}) {
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
        .querySelector('.v1-artboard')
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
  const editable = tweakpaneD2Enabled ? selectedAppearance(adapter) : undefined;
  const quickShape =
    !tweakpaneD2Enabled && tweakpaneD1Enabled ? selectedQuickShape(adapter) : undefined;
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
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.defaultPrevented ||
        target.closest(
          '[role="dialog"], [role="menu"], [data-appearance-surface], .gs-hybrid-quickbar',
        )
      )
        return;
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

  return (
    <StudioShell
      adapter={adapter}
      onHome={onHome}
      tab={studioTab}
      setTab={setStudioTab}
      drawingTools={
        <div className="vs-menu vs-drawing-menu">
          <Button
            ref={setDrawButton}
            className="vs-rail__tab"
            aria-label="Drawing tools"
            aria-expanded={drawingMenuOpen}
            aria-controls="drawing-palette"
            onClick={(event) => {
              event.preventDefault();
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
                  <SelectIcon /> Arrange
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
              {editable ? (
                <Suspense fallback={<p role="status">Loading formatting tools…</p>}>
                  <HybridQuickBar
                    key={editable.id}
                    adapter={adapter}
                    trigger={formattingTrigger}
                    open={editorPanel === 'style'}
                    onAppearance={() => setEditorPanel(editorPanel === 'style' ? null : 'style')}
                  />
                </Suspense>
              ) : (
                <SelectionToolbar
                  adapter={adapter}
                  formattingTrigger={formattingTrigger}
                  formattingOpen={editorPanel === 'style'}
                  appearanceInspector={!!quickShape}
                  replacingImage={replacingImage}
                  onReplaceImage={() => {
                    const selected = adapter.history.document.items.find((entry) =>
                      adapter.selectedIds.includes(entry.id),
                    );
                    if (!selected) return;
                    replacementId.current = selected.id;
                    replacementInput.current?.click();
                  }}
                  onEditStyle={() => setEditorPanel(editorPanel === 'style' ? null : 'style')}
                />
              )}
            </div>
            {editorPanel && !editable && !(tweakpaneD2Enabled && selection.count > 1) && (
              <ObjectDock
                ownerWindow={adapter.ownerWindow}
                trigger={formattingTrigger}
                onClose={() => setEditorPanel(null)}
                label={
                  quickShape && editorPanel === 'style' ? 'Shape appearance' : 'Object formatting'
                }
              >
                {quickShape && editorPanel === 'style' ? (
                  <Suspense fallback={<p role="status">Loading appearance controls…</p>}>
                    <QuickShapeInspector
                      adapter={adapter}
                      id={quickShape.id}
                      onClose={() => setEditorPanel(null)}
                    />
                  </Suspense>
                ) : (
                  <EditorFeatures
                    adapter={adapter}
                    panel={editorPanel}
                    setPanel={setEditorPanel}
                    inline
                  />
                )}
              </ObjectDock>
            )}
          </div>
        )}
        {editable && editorPanel === 'style' && (
          <Suspense fallback={<p role="status">Loading appearance controls…</p>}>
            <UnifiedInspector
              adapter={adapter}
              trigger={formattingTrigger}
              onClose={() => setEditorPanel(null)}
            />
          </Suspense>
        )}
        <KonvaStage
          key="vision-canvas"
          onObjectContextMenu={(x, y) => {
            setContextMenu({ x, y });
          }}
          snappingContainer={snappingContainer}
          drawMode={drawMode}
          adapter={adapter}
          zoom={zoom}
          onZoomChange={setZoom}
          onScaleChange={setDisplayZoom}
        />
        <div className="vs-bottom-dock" role="group" aria-label="Board controls">
          <details className="vs-menu vs-canvas-settings">
            <summary className="vs-page-select" aria-label="Canvas settings">
              Canvas settings <ChevronDownIcon />
            </summary>
            <div className="vs-menu__pop">
              <div className="vs-snap-slot" ref={setSnappingContainer} />
            </div>
          </details>
          <span className="vs-bottom-dock__sep" aria-hidden="true" />
          <ZoomControls value={displayZoom} onChange={setZoom} onFit={() => adapter.fitBoard()} />
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
