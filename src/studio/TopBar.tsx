import React from 'react';

import { FitIcon, LogoIcon, PlusIcon, ShareIcon } from './icons';

export interface TopBarProps {
  boardName: string;
  onNameChange: (name: string) => void;
  onFitBoard: () => void;
  onNewBoard: () => void;
  onShare: () => void;
  hasBoardContent: boolean;
}

/**
 * Module 2 top bar: brand + editable board name | new board + fit actions.
 * The name commits on blur/Enter (Escape cancels); "New" asks for
 * confirmation inline and is disabled on an empty board. Share arrives in
 * Module 6.
 */
export const TopBar = ({
  boardName,
  onNameChange,
  onFitBoard,
  onNewBoard,
  onShare,
  hasBoardContent,
}: TopBarProps) => {
  const [draft, setDraft] = React.useState(boardName);
  const [editing, setEditing] = React.useState(false);
  const [confirmingNew, setConfirmingNew] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keep the draft in sync when the name changes elsewhere.
  React.useEffect(() => {
    if (!editing) {
      setDraft(boardName);
    }
  }, [boardName, editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim().slice(0, 80);
    if (next && next !== boardName) {
      onNameChange(next);
    } else {
      setDraft(boardName);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(boardName);
  };

  return (
    <header className="studio-topbar">
      <div className="studio-topbar__left">
        <span className="studio-topbar__logo" aria-hidden="true">
          <LogoIcon />
        </span>
        <span className="studio-topbar__wordmark">Gratitude</span>
        <span className="studio-topbar__divider" aria-hidden="true" />
        <input
          ref={inputRef}
          className="studio-topbar__name-input"
          value={draft}
          maxLength={80}
          aria-label="Board name"
          onFocus={() => setEditing(true)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              inputRef.current?.blur();
            } else if (event.key === 'Escape') {
              cancel();
              inputRef.current?.blur();
            }
          }}
        />
      </div>
      <div className="studio-topbar__right">
        <div className="studio-topbar__new">
          <button
            type="button"
            className="studio-topbar__new-btn"
            onClick={() => setConfirmingNew((confirming) => !confirming)}
            disabled={!hasBoardContent}
            title={hasBoardContent ? 'Start a new board' : 'Board is empty'}
            aria-expanded={confirmingNew}
            aria-haspopup="dialog"
          >
            <PlusIcon />
            <span>New</span>
          </button>
          {confirmingNew && (
            <>
              <button
                type="button"
                className="studio-topbar__confirm-veil"
                aria-label="Dismiss new board confirmation"
                onClick={() => setConfirmingNew(false)}
              />
              <div className="studio-topbar__confirm" role="dialog" aria-label="Confirm new board">
                <p>Start a new board? This clears everything on the canvas.</p>
                <div className="studio-topbar__confirm-actions">
                  <button
                    type="button"
                    className="studio-topbar__confirm-cancel"
                    onClick={() => setConfirmingNew(false)}
                  >
                    Keep board
                  </button>
                  <button
                    type="button"
                    className="studio-topbar__confirm-go"
                    onClick={() => {
                      setConfirmingNew(false);
                      onNewBoard();
                    }}
                  >
                    Clear board
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          className="studio-topbar__fit"
          onClick={onFitBoard}
          title="Fit board to view"
        >
          <FitIcon />
          <span>Fit</span>
        </button>
        <button
          type="button"
          className="studio-topbar__share"
          onClick={onShare}
          disabled={!hasBoardContent}
          title={hasBoardContent ? 'Share or export your board' : 'Board is empty'}
        >
          <ShareIcon />
          <span>Share</span>
        </button>
      </div>
    </header>
  );
};
