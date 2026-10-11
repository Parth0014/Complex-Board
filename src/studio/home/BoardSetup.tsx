import { Button } from '../ui/Button';
import { ELEMENT_THEMES } from '../../assets/elementThemes';
import type { useHomeBoards } from './useHomeBoards';

export type BoardSetupProps = Pick<
  ReturnType<typeof useHomeBoards>,
  | 'busy'
  | 'kind'
  | 'setKind'
  | 'theme'
  | 'setTheme'
  | 'orientation'
  | 'setOrientation'
  | 'title'
  | 'setTitle'
  | 'year'
> & { onClose: () => void; onCreate: () => void };
export function BoardSetup({
  busy,
  kind,
  setKind,
  theme,
  setTheme,
  orientation,
  setOrientation,
  title,
  setTitle,
  year,
  onClose,
  onCreate,
}: BoardSetupProps) {
  return (
    <section className="home-setup" aria-label="New board setup">
      <div className="home-section-heading">
        <h2>Start your vision board</h2>
        <Button disabled={busy} onClick={onClose} aria-label="Close board setup">
          Close
        </Button>
      </div>
      <div className="home-setup-grid">
        <label>
          Board name
          <input
            maxLength={80}
            value={title}
            placeholder={kind === 'yearly' ? 'My ' + year + ' vision' : 'Give your vision a name'}
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
        We’ll open artwork for your theme. You can change the theme and orientation in the editor.
      </p>
      <Button className="home-primary" disabled={busy} onClick={onCreate}>
        {busy ? 'Opening…' : 'Create board'}
      </Button>
    </section>
  );
}
