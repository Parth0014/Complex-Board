import { useEffect, useState } from 'react';
import { ELEMENT_THEMES } from '../assets/elementThemes';
import { newBoard, type BoardDocument } from '../vision/document';
import { listBoards, saveBoard } from '../vision/storage';
import { KonvaCanvasAdapter } from '../vision/canvas/KonvaCanvasAdapter';
import { VisionMark } from './icons';
import './home.css';

export function HomePage({
  onOpen,
}: {
  onOpen: (adapter: KonvaCanvasAdapter, isNew: boolean) => void;
}) {
  const [boards, setBoards] = useState<{ id: string; document: BoardDocument }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState('yearly');
  const [theme, setTheme] = useState('growth');
  const [orientation, setOrientation] = useState('1920x1080');
  const [title, setTitle] = useState('');
  const year = new Date().getFullYear();
  useEffect(() => {
    let active = true;
    listBoards(window)
      .then((value) => {
        if (active) setBoards(value);
      })
      .catch(() => {
        if (active) setError('Unable to load your boards. Try refreshing.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const open = async (id: string, isNew = false) => {
    setBusy(true);
    setError('');
    try {
      const adapter = new KonvaCanvasAdapter(window, id);
      await adapter.initialize();
      if (adapter.saveStatus.startsWith('Save failed')) throw new Error(adapter.saveStatus);
      onOpen(adapter, isNew);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to open board.');
      setBusy(false);
    }
  };
  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const id = 'board:' + window.crypto.randomUUID();
      const [width, height] = orientation.split('x').map(Number);
      await saveBoard(
        window,
        {
          ...newBoard(),
          title:
            title.trim() ||
            (kind === 'yearly'
              ? 'My ' + year + ' vision'
              : ELEMENT_THEMES.find((item) => item.id === theme)!.label),
          width,
          height,
          boardTheme: kind === 'yearly' ? 'planning' : theme,
        },
        id,
      );
      await open(id, true);
    } catch {
      setError('Unable to save your new board. Please try again.');
      setBusy(false);
    }
  };
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
          <button
            className="home-primary"
            disabled={busy || loading}
            onClick={() => setCreating(true)}
          >
            + Create a vision board
          </button>
        </section>
        {error && (
          <p className="home-error" role="alert">
            {error}
          </p>
        )}
        {creating && (
          <section className="home-setup" aria-label="New board setup">
            <div className="home-section-heading">
              <h2>Start your vision board</h2>
              <button
                disabled={busy}
                onClick={() => setCreating(false)}
                aria-label="Close board setup"
              >
                Close
              </button>
            </div>
            <div className="home-setup-grid">
              <label>
                Board name
                <input
                  maxLength={80}
                  value={title}
                  placeholder={
                    kind === 'yearly' ? 'My ' + year + ' vision' : 'Give your vision a name'
                  }
                  disabled={busy}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                What is it about?
                <select
                  aria-label="Board type"
                  value={kind}
                  disabled={busy}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="yearly">My year ahead</option>
                  <option value="topic">A specific topic</option>
                </select>
              </label>
              {kind === 'topic' && (
                <label>
                  Choose a theme
                  <select
                    aria-label="Board theme"
                    value={theme}
                    disabled={busy}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    {ELEMENT_THEMES.filter((item) => item.id !== 'creative').map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Orientation
                <select
                  aria-label="Board orientation"
                  value={orientation}
                  disabled={busy}
                  onChange={(e) => setOrientation(e.target.value)}
                >
                  <option value="1920x1080">Landscape</option>
                  <option value="1080x1920">Portrait</option>
                  <option value="1080x1080">Square</option>
                </select>
              </label>
            </div>
            <p>
              We’ll open artwork for your theme. You can change the theme and orientation in the
              editor.
            </p>
            <button className="home-primary" disabled={busy} onClick={() => void create()}>
              {busy ? 'Opening…' : 'Create board'}
            </button>
          </section>
        )}
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
                <button
                  className="home-board"
                  key={id}
                  disabled={busy}
                  onClick={() => void open(id)}
                >
                  <div className="home-board-preview">
                    <svg
                      viewBox={'0 0 ' + document.width + ' ' + document.height}
                      aria-hidden="true"
                      style={{ background: document.color }}
                    >
                      <rect width={document.width} height={document.height} fill={document.color} />
                      {document.items.slice(0, 100).map((item) => (
                        <g
                          key={item.id}
                          transform={
                            'translate(' + item.x + ' ' + item.y + ') rotate(' + item.rotation + ')'
                          }
                          opacity={item.opacity}
                        >
                          {item.kind === 'text' ? (
                            <text
                              y={item.fontSize || 34}
                              fontSize={item.fontSize || 34}
                              fill={item.color || '#49375e'}
                            >
                              {item.text?.slice(0, 100)}
                            </text>
                          ) : item.asset?.previewUrl.startsWith('data:') ? (
                            <image
                              href={item.asset.previewUrl}
                              width={item.width}
                              height={item.height}
                              preserveAspectRatio="xMidYMid slice"
                            />
                          ) : (
                            <rect
                              width={item.width}
                              height={item.height}
                              fill={item.color || '#d9d3e8'}
                              rx={item.radius || 0}
                            />
                          )}
                        </g>
                      ))}
                    </svg>
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
                </button>
              ))}
            </div>
          ) : (
            <div className="home-empty">
              <h3>Your next chapter starts here.</h3>
              <p>Create your first vision board and make it your own.</p>
            </div>
          )}
        </section>
        <p className="home-local-note">Your boards are saved in this browser.</p>
      </div>
    </main>
  );
}
