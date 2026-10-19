import { Toast } from './ui/Toast';
import './home/home.css';
import { Button, IconButton } from './ui/Button';
import { VisionMark, CloseIcon } from './icons';
import { useHomeBoards, type OpenBoard } from './home/useHomeBoards';
import { BoardSetup } from './home/BoardSetup';
import { BoardLibrary } from './home/BoardLibrary';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from './ui/Dialog';
import { portableMedia } from '../vision/media';
import exampleOne from '../../public/home-examples/board-1.jpg?url';
import exampleTwo from '../../public/home-examples/board-2.jpg?url';
import exampleThree from '../../public/home-examples/board-3.jpg?url';

export function HomePage({ onOpen }: { onOpen: OpenBoard }) {
  const state = useHomeBoards(onOpen);
  const { boards, loading, busy, error, creating, setCreating } = state;
  const [backupsOpen, setBackupsOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [backupError, setBackupError] = useState('');
  const downloadBackup = async (id: string) => {
    const board = boards.find((entry) => entry.id === id)?.document;
    if (!board) return;
    setDownloading(id);
    setBackupError('');
    try {
      const media = await portableMedia(window, board);
      const blob = new Blob([JSON.stringify(media.length ? { ...board, media } : board)], {
        type: 'application/vnd.visbo.project+json',
      });
      if (blob.size > 180 * 1024 * 1024)
        throw new Error('Backup exceeds 180 MB. Use fewer or smaller images.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        (board.title
          .split('')
          .map((character) => (character.charCodeAt(0) < 32 ? '-' : character))
          .join('')
          .replace(/[<>:"/\\|?*]/g, '-')
          .replace(/[. ]+$/, '')
          .trim() || 'vision-board') + '.visbo';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Unable to download backup.');
    } finally {
      setDownloading(null);
    }
  };
  return (
    <main className="home-page">
      {backupsOpen &&
        createPortal(
          <div className="vs vs-veil">
            <Dialog
              className="vs-dialog home-backup-dialog"
              aria-label="Back up boards"
              onClose={() => setBackupsOpen(false)}
              dismissible={!downloading}
            >
              <div className="vs-dialog__head">
                <h2>Back up boards</h2>
                <IconButton
                  aria-label="Close backups"
                  disabled={!!downloading}
                  onClick={() => setBackupsOpen(false)}
                >
                  <CloseIcon />
                </IconButton>
              </div>
              <p className="home-backup-description">
                Download editable files, including uploaded photos. Restore them with File → Open
                board file in the editor.
              </p>
              {boards.map(({ id, document: board }) => (
                <div className="home-backup-row" key={id}>
                  <span>{board.title}</span>
                  <Button
                    variant="secondary"
                    disabled={!!downloading}
                    loading={downloading === id}
                    onClick={() => void downloadBackup(id)}
                  >
                    Download <span className="gs-sr-only">{board.title}</span>
                  </Button>
                </div>
              ))}
              {backupError && <p role="alert">{backupError}</p>}
              <div className="home-backup-footer">
                <Button
                  variant="primary"
                  disabled={!!downloading}
                  onClick={() => setBackupsOpen(false)}
                >
                  Done
                </Button>
              </div>
            </Dialog>
          </div>,
          document.body,
        )}
      <header className="home-header">
        <span className="home-brand">
          <VisionMark /> VisBo
        </span>
      </header>
      {state.removed.length > 0 && (
        <Toast
          message={'Deleted ' + state.removed.at(-1)!.document.title}
          action={{ label: 'Undo', onClick: () => void state.undoRemove() }}
          onDismiss={state.dismissRemoved}
          duration={8000}
        />
      )}
      <div className="home-content">
        <section className="home-intro">
          <div>
            <h1>Your vision, in one place.</h1>
            <p>Images, ideas and plans. Bring them together on a board.</p>
            <Button
              className="home-primary"
              disabled={busy || loading}
              onClick={() => setCreating(true)}
            >
              + New board
            </Button>
          </div>
          <div className="home-example-boards" aria-label="Example vision boards">
            {['Torn scrapbook', 'Soft life collage', 'Sticker chaos'].map((label, index) => (
              <img
                key={label}
                src={[exampleOne, exampleTwo, exampleThree][index]}
                alt={`${label} example board`}
                width="405"
                height="720"
                decoding="async"
              />
            ))}
          </div>
        </section>
        {error && !creating && (
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
          onCreate={() => setCreating(true)}
          boards={boards}
          loading={loading}
          busy={busy}
          onOpen={(id) => void state.open(id)}
          onDelete={(id) => void state.remove(id)}
        />
        <p className="home-local-note">
          Your boards are saved in this browser. Keep a backup: open a board and choose File →
          Download board file. Clearing browser data removes local boards.
        </p>
        {boards.length > 0 && (
          <Button variant="secondary" onClick={() => setBackupsOpen(true)}>
            Back up boards
          </Button>
        )}
      </div>
    </main>
  );
}
