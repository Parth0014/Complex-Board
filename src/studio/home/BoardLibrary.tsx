import type { BoardDocument } from '../../vision/document';
import { BoardCard } from '../boards/BoardCard';
export function BoardLibrary({
  boards,
  loading = false,
  busy = false,
  onOpen,
}: {
  boards: { id: string; document: BoardDocument }[];
  loading?: boolean;
  busy?: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="home-library" aria-label="Your boards">
      <div className="home-section-heading">
        <h2>Your boards</h2>
        <span>{boards.length} saved locally</span>
      </div>
      {loading ? (
        <p role="status">Loading your boards…</p>
      ) : boards.length ? (
        <div className="home-board-grid">
          {boards.map(({ id, document }) => (
            <BoardCard key={id} document={document} disabled={busy} onOpen={() => onOpen(id)} />
          ))}
        </div>
      ) : (
        <div className="home-empty">
          <h3>Your next chapter starts here.</h3>
          <p>Create your first vision board and make it your own.</p>
        </div>
      )}
    </section>
  );
}
