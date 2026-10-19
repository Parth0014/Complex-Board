import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, IconButton } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { FitIcon, MinusIcon, PlusIcon } from './icons';
import type { EditorAdapter } from '../vision/contracts';
import { errorMessage } from './errors';

export function BoardPreview({
  adapter,
  onClose,
}: {
  adapter: EditorAdapter;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(
    null,
  );
  const board = adapter.history.document;
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState<number | null>(null);
  const fit = Math.max(
    0.01,
    Math.min((size.width - 48) / board.width, (size.height - 48) / board.height, 1),
  );
  const scale = zoom ?? fit;
  const changeZoom = (factor: number) => setZoom(Math.max(0.05, Math.min(3, scale * factor)));
  useEffect(() => {
    const win = adapter.ownerWindow;
    let timer: number | undefined;
    // Paint the viewer before the synchronous canvas capture starts.
    const frame = win.requestAnimationFrame(() => {
      timer = win.setTimeout(() => {
        try {
          setImage(adapter.previewBoard());
          setError('');
        } catch (e) {
          setError(errorMessage(e));
        }
      }, 0);
    });
    return () => {
      win.cancelAnimationFrame(frame);
      if (timer !== undefined) win.clearTimeout(timer);
    };
  }, [adapter, attempt]);
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new adapter.ownerWindow.ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [adapter]);
  useLayoutEffect(() => {
    const node = viewport.current;
    if (node)
      node.scrollTo(
        (node.scrollWidth - node.clientWidth) / 2,
        (node.scrollHeight - node.clientHeight) / 2,
      );
  }, [scale, size]);
  useEffect(() => {
    const node = root.current,
      doc = adapter.ownerWindow.document;
    const changed = () => setFullscreen(doc.fullscreenElement === node);
    doc.addEventListener('fullscreenchange', changed);
    return () => {
      doc.removeEventListener('fullscreenchange', changed);
      if (doc.fullscreenElement === node) void doc.exitFullscreen().catch(() => {});
    };
  }, [adapter]);
  return (
    <div ref={root} className="vs-veil board-preview">
      <Dialog
        className="board-preview-dialog"
        aria-label="Fullscreen board preview"
        onClose={onClose}
        onKeyDown={(event) => {
          if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            changeZoom(1.25);
          }
          if (event.key === '-') {
            event.preventDefault();
            changeZoom(0.8);
          }
          if (event.key === '0') {
            event.preventDefault();
            setZoom(null);
          }
        }}
      >
        <header className="board-preview-actions">
          <div className="board-preview-title">
            <strong>{board.title}</strong>
            <span>
              {board.width} × {board.height} · Preview
            </span>
          </div>
          <Button
            onClick={() => {
              const doc = adapter.ownerWindow.document;
              const operation = fullscreen
                ? doc.exitFullscreen()
                : root.current?.requestFullscreen();
              void operation?.catch((e) => setError(errorMessage(e)));
            }}
            disabled={!adapter.ownerWindow.document.fullscreenEnabled}
          >
            {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </Button>
          <Button variant="secondary" aria-label="Close preview" onClick={onClose}>
            Back to editor
          </Button>
        </header>
        <div
          ref={viewport}
          className="board-preview-viewport"
          tabIndex={0}
          aria-label="Board preview image"
          data-zoomed={scale > fit + 0.001}
          onDoubleClick={() => setZoom(zoom === null ? 1 : null)}
          onPointerDown={(event) => {
            if (event.button !== 0 || scale <= fit + 0.001) return;
            const node = event.currentTarget;
            drag.current = {
              pointer: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              left: node.scrollLeft,
              top: node.scrollTop,
            };
            node.setPointerCapture(event.pointerId);
            node.dataset.panning = 'true';
          }}
          onPointerMove={(event) => {
            const active = drag.current;
            if (active?.pointer === event.pointerId)
              event.currentTarget.scrollTo(
                active.left + active.x - event.clientX,
                active.top + active.y - event.clientY,
              );
          }}
          onPointerUp={(event) => {
            drag.current = null;
            event.currentTarget.dataset.panning = 'false';
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onLostPointerCapture={(event) => {
            drag.current = null;
            event.currentTarget.dataset.panning = 'false';
          }}
        >
          {image ? (
            <div
              className="board-preview-image-space"
              style={{
                width: Math.max(size.width, board.width * scale + 48),
                height: Math.max(size.height, board.height * scale + 48),
              }}
            >
              <img
                src={image}
                alt={`Preview of ${board.title}`}
                draggable={false}
                style={{ width: board.width * scale, height: board.height * scale }}
              />
            </div>
          ) : (
            <div className="board-preview-state">
              {error ? (
                <>
                  <p role="alert">{error}</p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setError('');
                      setAttempt((value) => value + 1);
                    }}
                  >
                    Retry preview
                  </Button>
                </>
              ) : (
                <p role="status">Preparing your board…</p>
              )}
            </div>
          )}
        </div>
        {image && error && (
          <p className="panel-inline-error" role="alert">
            {error}
          </p>
        )}
        <footer className="board-preview-controls" aria-label="Preview controls">
          <IconButton
            aria-label="Zoom out preview"
            disabled={!image || scale <= 0.05}
            onClick={() => changeZoom(0.8)}
          >
            <MinusIcon />
          </IconButton>
          <output aria-label="Preview zoom">{Math.round(scale * 100)}%</output>
          <IconButton
            aria-label="Zoom in preview"
            disabled={!image || scale >= 3}
            onClick={() => changeZoom(1.25)}
          >
            <PlusIcon />
          </IconButton>
          <Button
            aria-label="Fit preview"
            aria-pressed={zoom === null}
            disabled={!image}
            onClick={() => setZoom(null)}
          >
            <FitIcon /> Fit
          </Button>
        </footer>
      </Dialog>
    </div>
  );
}
