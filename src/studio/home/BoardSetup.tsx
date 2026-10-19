import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { createPortal } from 'react-dom';
import { useRef } from 'react';
import type { useHomeBoards } from './useHomeBoards';

export type BoardSetupProps = Pick<
  ReturnType<typeof useHomeBoards>,
  | 'busy'
  | 'error'
  | 'startMode'
  | 'setStartMode'
  | 'orientation'
  | 'setOrientation'
  | 'title'
  | 'setTitle'
  | 'year'
> & { onClose: () => void; onCreate: () => void };
export function BoardSetup({
  busy,
  error,
  startMode,
  setStartMode,
  orientation,
  setOrientation,
  title,
  setTitle,
  year,
  onClose,
  onCreate,
}: BoardSetupProps) {
  const nameInput = useRef<HTMLInputElement>(null);
  return createPortal(
    <div className="vs vs-veil">
      <Dialog
        className="vs-dialog home-setup-dialog"
        aria-label="Create a board"
        onClose={onClose}
        dismissible={!busy}
        initialFocus={nameInput}
      >
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
              ref={nameInput}
              autoFocus
              maxLength={80}
              value={title}
              placeholder={`${year} board`}
              disabled={busy}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <fieldset disabled={busy} className="home-choice-field">
            <legend>Start with</legend>
            <div className="home-choice-row">
              {(
                [
                  ['blank', 'Blank'],
                  ['templates', 'Template'],
                  ['photos', 'From photos'],
                ] as const
              ).map(([mode, label]) => (
                <label className="home-choice" key={mode}>
                  <input
                    type="radio"
                    name="start-mode"
                    checked={startMode === mode}
                    onChange={() => {
                      setStartMode(mode);
                      if (mode === 'templates') setOrientation('1080x1920');
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
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
                    disabled={startMode === 'templates' && value !== '1080x1920'}
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
          {startMode === 'templates' && (
            <p className="home-local-note">Our scrapbook templates fit portrait boards.</p>
          )}
          <div className="home-setup-footer">
            {error && (
              <p className="home-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" className="home-primary" loading={busy}>
              Create board
            </Button>
          </div>
        </form>
      </Dialog>
    </div>,
    window.document.body,
  );
}
