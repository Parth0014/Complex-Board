import { loadBoard } from './vision/storage';
import { HomePage } from './studio/HomePage';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { KonvaCanvasAdapter } from './vision/canvas/KonvaCanvasAdapter';
import { KonvaStage } from './vision/canvas/KonvaStage';
import { StudioShell } from './studio/StudioShell';
import { SelectionToolbar } from './studio/SelectionToolbar';
import { ContextActions } from './studio/ContextActions';
import { useMenuPlacement } from './studio/useMenuPlacement';
import './studio/design-system/foundations.css';
import './studio/v5/v5-tokens.css';
import './studio/v5/v5-chrome.css';
import './studio/v5/v5-panels.css';
import './studio/v5/v5-layout.css';
import './studio/v5/v5-hierarchy.css';
import './studio/v5/v5-controls.css';
import './studio/v5/v5-corners.css';
import './studio/design-system/fluent.css';
import './studio/interaction-overrides.css';
import { EditorFeatures, type EditorPanel } from './studio/EditorFeatures';
import type { StudioTab } from './studio/studioTypes';
import {
  ChevronDownIcon,
  EraserIcon,
  FitIcon,
  HighlighterIcon,
  MarkerIcon,
  MinusIcon,
  PenIcon,
  PlusIcon,
  SelectIcon,
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

function Editor({
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
        !(event.target as HTMLElement).closest('.studio-color-popover')
      ) {
        setContextMenu(null);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
  const document = adapter.history.document;

  const selection = adapter.getSelection();
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

  return (
    <StudioShell
      adapter={adapter}
      onHome={onHome}
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
              setDrawingMenuOpen((open) => !open);
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

            </div>
            {editorPanel && (
              <EditorFeatures
                adapter={adapter}
                panel={editorPanel}
                setPanel={setEditorPanel}
                inline
              />
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
          adapter={adapter}
          zoom={zoom}
          onZoomChange={setZoom}
          onScaleChange={setDisplayZoom}
        />
        <div className="vs-bottom-dock" aria-label="Board controls">
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
          <details className="vs-menu vs-canvas-settings">
            <summary className="vs-page-select" aria-label="Canvas settings">
              Canvas settings <ChevronDownIcon />
            </summary>
            <div className="vs-menu__pop">
              <div className="vs-snap-slot" ref={setSnappingContainer} />
            </div>
          </details>
        </div>
      </div>

      {contextMenu &&
        createPortal(
          <div
            className="vs vs-object-context vs-context-v2"
            ref={contextMenuRef}
            role="menu"
            aria-label="Canvas actions"
            style={contextPosition}
          >
            <ContextActions
              adapter={adapter}
              onClose={closeMenu}
            />
          </div>,
          adapter.ownerWindow.document.body,
        )}
    </StudioShell>
  );
}

export default function App() {
  const [adapter, setAdapter] = useState<KonvaCanvasAdapter>();
  const [initialTab, setInitialTab] = useState<StudioTab | null>(null);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(() =>
    new URL(window.location.href).searchParams.has('board'),
  );
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get('board');
    if (!id) {
      setOpening(false);
      return;
    }
    let active = true;
    void (async () => {
      try {
        if (!(await loadBoard(window, id))) throw new Error('This board could not be found.');
        const restored = new KonvaCanvasAdapter(window, id);
        await restored.initialize();
        if (restored.saveStatus.startsWith('Save failed')) throw new Error(restored.saveStatus);
        if (active) {
          setInitialTab(null);
          setAdapter(restored);
        }
      } catch (error) {
        if (active) {
          setError(error instanceof Error ? error.message : 'Unable to open board.');
          const url = new URL(window.location.href);
          url.searchParams.delete('board');
          window.history.replaceState(null, '', url);
        }
      } finally {
        if (active) setOpening(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="vs-root">
      {opening ? (
        <p role="status">Opening your board…</p>
      ) : adapter ? (
        <Editor
          adapter={adapter}
          initialTab={initialTab}
          onHome={() => {
            void adapter
              .flushSave()
              .then(() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('board');
                window.history.replaceState(null, '', url);
                setAdapter(undefined);
              })
              .catch(() => setError('Your board could not be saved. Please try again.'));
          }}
        />
      ) : (
        <HomePage
          onOpen={(nextAdapter, isNew) => {
            const url = new URL(window.location.href);
            url.searchParams.set('board', nextAdapter.boardId);
            window.history.replaceState(null, '', url);
            setInitialTab(isNew ? 'elements' : null);
            setAdapter(nextAdapter);
          }}
        />
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
