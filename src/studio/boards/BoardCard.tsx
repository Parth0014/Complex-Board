import type { BoardDocument } from '../../vision/document';
import { Button } from '../ui/Button';
import { BoardPreview } from './BoardPreview';
export function BoardCard({
  document,
  disabled = false,
  onOpen,
  onDelete,
}: {
  document: BoardDocument;
  disabled?: boolean;
  onOpen: () => void;
  onDelete?: () => void;
}) {
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
            · {document.items.length} elements
          </p>
        </div>
      </Button>
      {onDelete && (
        <Button
          variant="danger"
          disabled={disabled}
          aria-label={`Delete ${document.title}`}
          onClick={onDelete}
        >
          Delete board
        </Button>
      )}
    </article>
  );
}
