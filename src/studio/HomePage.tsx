import './home/home.css';
import { Button } from './ui/Button';
import { VisionMark } from './icons';
import { useHomeBoards, type OpenBoard } from './home/useHomeBoards';
import { BoardSetup } from './home/BoardSetup';
import { BoardLibrary } from './home/BoardLibrary';

export function HomePage({ onOpen }: { onOpen: OpenBoard }) {
  const state = useHomeBoards(onOpen);
  const { boards, loading, busy, error, creating, setCreating } = state;
  return (
    <main className="home-page">
      <header className="home-header">
        <span className="home-brand">
          <VisionMark /> VisBo
        </span>
      </header>
      <div className="home-content">
        <section className="home-intro">
          <div>
            <h1>Your vision, in one place.</h1>
            <p>
              Images, ideas and plans. Bring them together on a board.
            </p>
            <Button
              className="home-primary"
              disabled={busy || loading}
              onClick={() => setCreating(true)}
            >
              + New board
            </Button>
          </div>
          <div className="home-collage" aria-hidden="true">
            <span className="c-arch" />
            <span className="c-circle" />
            <span className="c-print" />
            <span className="c-tape" />
            <span className="c-dot" />
          </div>
        </section>
        {error && (
          <p className="home-error" role="alert">
            {error}
          </p>
        )}
        {creating && (
          <BoardSetup
            {...state}
            onClose={() => setCreating(false)}
            onCreate={() => void state.create()}
          />
        )}
        <BoardLibrary
          boards={boards}
          loading={loading}
          busy={busy}
          onOpen={(id) => void state.open(id)}
          onDelete={(id) => void state.remove(id)}
        />
        <p className="home-local-note">Your boards are saved in this browser.</p>
      </div>
    </main>
  );
}
