import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { StudioAdapter } from '../vision/contracts';
import { Button, IconButton } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { CloseIcon } from './icons';

export const BOARD_SIZES = [
  ['1080x1080', 'Square'],
  ['1920x1080', 'Landscape'],
  ['1080x1920', 'Portrait'],
] as const;

export function BoardSizeControl({
  adapter,
  onClose,
  initialSize,
}: {
  adapter: Pick<StudioAdapter, 'history' | 'commit' | 'fitBoard' | 'ownerWindow'>;
  onClose: () => void;
  initialSize?: string;
}) {
  const board = adapter.history.document;
  const [size, setSize] = useState(initialSize || `${board.width}x${board.height}`);
  const [width, height] = size.split('x').map(Number);
  const changed = width !== board.width || height !== board.height;
  return createPortal(
    <div className="vs vs-veil">
      <Dialog className="vs-dialog board-size-dialog" aria-label="Resize board" onClose={onClose}>
        <div className="vs-dialog__head">
          <h2>Resize board</h2>
          <IconButton aria-label="Close resize board" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <label className="vs-field">
          Board size
          <select
            className="vs-select"
            aria-label="Board size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            {!BOARD_SIZES.some(([id]) => id === size) && (
              <option value={size}>Current size ({size})</option>
            )}
            {BOARD_SIZES.map(([id, label]) => (
              <option key={id} value={id}>
                {label} · {id.replace('x', ' × ')} px
              </option>
            ))}
          </select>
        </label>
        <p className="inspector-help">
          Your objects keep their size and position. Anything beyond the new board edge is hidden
          from exports, but stays editable. You can undo this change.
        </p>
        <div className="review-dialog-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!changed}
            onClick={() => {
              adapter.commit(
                { ...adapter.history.document, width, height },
                { preservePositions: true },
              );
              adapter.fitBoard();
              onClose();
            }}
          >
            Resize board
          </Button>
        </div>
      </Dialog>
    </div>,
    adapter.ownerWindow.document.body,
  );
}
