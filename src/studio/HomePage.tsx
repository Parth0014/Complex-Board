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
        <span>Your space to imagine</span>
      </header>
      <div className="home-content">
        <section className="home-intro">
          <div>
            <p className="home-eyebrow">A little vision. A new beginning.</p>
            <h1>Make room for what matters.</h1>
            <p>
              Collect your dreams, celebrate your progress, and build a vision that feels like you.
            </p>
          </div>
          <Button
            className="home-primary"
            disabled={busy || loading}
            onClick={() => setCreating(true)}
          >
            + Create a vision board
          </Button>
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
        />
        <p className="home-local-note">Your boards are saved in this browser.</p>
      </div>
    </main>
  );
}
