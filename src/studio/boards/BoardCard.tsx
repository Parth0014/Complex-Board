import { useRef, useState } from 'react';
import type { BoardDocument } from '../../vision/document';
import { Button, IconButton } from '../ui/Button';
import { Menu } from '../ui/Menu';
import { Popover } from '../ui/Popover';
import { TrashIcon } from '../icons';
import { BoardPreview } from './BoardPreview';
function editedAt(value?: number) {
  if (!value) return 'Saved in this browser';
  const days = Math.max(0, Math.floor((Date.now() - value) / 86400000));
  return days === 0
    ? 'Edited today'
    : days === 1
      ? 'Edited yesterday'
      : 'Edited ' +
        new Date(value).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
}
export function BoardCard({
  document,
  disabled = false,
  onOpen,
  onDelete,
}: {
  document: BoardDocument;
  disabled?: boolean;
  onOpen(): void;
  onDelete?(): void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <article className="home-board-card">
      <Button className="home-board" disabled={disabled} onClick={onOpen}>
        <div className="home-board-preview">
          <BoardPreview document={document} />
        </div>
        <div className="home-board-info">
          <h3>{document.title}</h3>
          <p>
            {document.width > document.height
              ? 'Landscape'
              : document.width < document.height
                ? 'Portrait'
                : 'Square'}{' '}
            ·{' '}
            <time
              dateTime={document.updatedAt ? new Date(document.updatedAt).toISOString() : undefined}
            >
              {editedAt(document.updatedAt)}
            </time>
          </p>
        </div>
      </Button>
      {onDelete && (
        <>
          <IconButton
            className="home-board-more"
            ref={trigger}
            aria-label={'Board options for ' + document.title}
            aria-haspopup="menu"
            aria-expanded={open}
            disabled={disabled}
            onClick={() => setOpen(!open)}
          >
            <span aria-hidden="true">&#8943;</span>
          </IconButton>
          {open && (
            <Popover
              anchor={trigger}
              focusOnOpen
              onDismiss={() => setOpen(false)}
              className="vs home-board-menu"
            >
              <Menu aria-label={'Board options for ' + document.title}>
                <Button
                  role="menuitem"
                  className="home-board-delete"
                  onClick={() => {
                    setOpen(false);
                    onDelete();
                  }}
                >
                  <TrashIcon /> Delete board
                </Button>
              </Menu>
            </Popover>
          )}
        </>
      )}
    </article>
  );
}
