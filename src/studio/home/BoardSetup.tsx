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
    <form
      className="home-setup"
      aria-label="New board setup"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy) onCreate();
      }}
    >
      <div className="home-section-heading">
        <h2>New board</h2>
        <Button disabled={busy} onClick={onClose} aria-label="Close board setup">
          Cancel
        </Button>
      </div>
      <label className="home-name-field">
        Name
        <input
          autoFocus
          maxLength={80}
          value={title}
          placeholder={kind === 'yearly' ? `${year} board` : 'Untitled board'}
          disabled={busy}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <fieldset disabled={busy} className="home-choice-field">
        <legend>Focus</legend>
        <div className="home-choice-row">
          {[
            ['yearly', 'Year ahead'],
            ['topic', 'Topic'],
          ].map(([value, label]) => (
            <label className="home-choice" key={value}>
              <input
                type="radio"
                name="board-kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {kind === 'topic' && (
        <fieldset disabled={busy} className="home-choice-field">
          <legend>Topic</legend>
          <div className="home-theme-choices">
            {ELEMENT_THEMES.filter((item) => item.id !== 'creative').map((item) => (
              <label className="home-choice" key={item.id}>
                <input
                  type="radio"
                  name="board-theme"
                  value={item.id}
                  checked={theme === item.id}
                  onChange={() => setTheme(item.id)}
                />
                <span>{item.label.split(' & ')[0]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset disabled={busy} className="home-choice-field">
        <legend>Layout</legend>
        <div className="home-layout-choices">
          {[
            ['1920x1080', 'Landscape', 'landscape'],
            ['1080x1920', 'Portrait', 'portrait'],
            ['1080x1080', 'Square', 'square'],
          ].map(([value, label, shape]) => (
            <label className="home-choice home-layout-choice" key={value}>
              <input
                type="radio"
                name="board-orientation"
                value={value}
                checked={orientation === value}
                onChange={() => setOrientation(value)}
              />
              <span>
                <i
                  className={`home-layout-preview home-layout-preview--${shape}`}
                  aria-hidden="true"
                />
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="home-setup-footer">
        <Button type="submit" className="home-primary" disabled={busy}>
          {busy ? 'Creating?' : 'Create board'}
        </Button>
      </div>
    </form>
  );
}
