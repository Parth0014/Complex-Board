import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import type { BoardDocument } from '../../vision/document';
import { BoardCard } from '../boards/BoardCard';
export function BoardLibrary({
  boards,
  loading = false,
  busy = false,
  onOpen,
  onDelete,
  onCreate,
}: {
  boards: { id: string; document: BoardDocument }[];
  loading?: boolean;
  busy?: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate(): void;
}) {
  return (
    <section className="home-library" aria-label="Your boards">
      <div className="home-section-heading">
        <h2>Your boards</h2>
        <span>
          {boards.length} {boards.length === 1 ? 'board' : 'boards'}
        </span>
      </div>
      {loading ? (
        <Skeleton label="Loading your boards" />
      ) : boards.length ? (
        <div className="home-board-grid">
          {boards.map(({ id, document }) => (
            <BoardCard
              key={id}
              document={document}
              disabled={busy}
              onOpen={() => onOpen(id)}
              onDelete={() => onDelete(id)}
            />
          ))}
        </div>
      ) : (
        <div className="gs-empty">
          <h3 className="gs-empty__title">No boards yet</h3>
          <p className="gs-empty__body">Create a board to get started.</p>
          <Button variant="primary" disabled={busy} onClick={onCreate}>
            New board
          </Button>
        </div>
      )}
    </section>
  );
}
