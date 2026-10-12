import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import type { EditorAdapter } from '../vision/contracts';
import { errorMessage } from './errors';
export function BoardPreview({
  adapter,
  image,
  onClose,
}: {
  adapter: EditorAdapter;
  image: string;
  onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const node = root.current,
      doc = adapter.ownerWindow.document;
    return () => {
      if (doc.fullscreenElement === node) void doc.exitFullscreen().catch(() => {});
    };
  }, [adapter]);
  return (
    <div ref={root} className="vs-veil board-preview">
      <Dialog
        className="board-preview-dialog"
        aria-label="Fullscreen board preview"
        onClose={onClose}
      >
        <div className="board-preview-actions">
          <span>{adapter.history.document.title}</span>
          <Button
            onClick={() => {
              void root.current?.requestFullscreen().catch((e) => setError(errorMessage(e)));
            }}
            disabled={!adapter.ownerWindow.document.fullscreenEnabled}
          >
            Fullscreen
          </Button>
          <Button onClick={onClose}>Close preview</Button>
        </div>
        {error && <p role="alert">{error}</p>}
        <img src={image} alt={`Preview of ${adapter.history.document.title}`} />
      </Dialog>
    </div>
  );
}
