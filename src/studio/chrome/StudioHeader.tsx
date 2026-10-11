import { useEffect, useRef } from 'react';
import { Button, IconButton } from '../ui/Button';
import {
  VisionMark,
  UndoIcon,
  RedoIcon,
  PlusIcon,
  ExportIcon,
  SaveIcon,
  RestoreIcon,
} from '../icons';
import type { EditorAdapter } from '../../vision/contracts';
const MAX_BACKUP_BYTES = 180 * 1024 * 1024;

/**
 * Three zones, one job each:
 *   start  → where am I (brand, board name, save state)
 *   center → what can I undo (history)
 *   end    → what do I do with the board (Share, File menu)
 */
export function StudioHeader({
  adapter,
  onHome,
  onShare,
  onError,
  shareDisabled = false,
}: {
  adapter: EditorAdapter;
  onHome: () => void;
  onShare: () => void;
  onError: (message: string) => void;
  shareDisabled?: boolean;
}) {
  const fileMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const menu = fileMenu.current;
    if (!menu) return;
    const ownerDocument = menu.ownerDocument;
    const closeOutside = (event: PointerEvent) => {
      if (menu.open && !event.composedPath().includes(menu)) menu.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (menu.open && event.key === 'Escape') {
        menu.open = false;
        menu.querySelector('summary')?.focus();
      }
    };
    ownerDocument.addEventListener('pointerdown', closeOutside, true);
    ownerDocument.addEventListener('keydown', closeOnEscape);
    return () => {
      ownerDocument.removeEventListener('pointerdown', closeOutside, true);
      ownerDocument.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  const document = adapter.history.document;
  return (
    <header className="vs-header">
      <div className="vs-header__start">
        <Button type="button" className="vs-brand" aria-label="Back to home" onClick={onHome}>
          <VisionMark />
          <span className="vs-brand__name">
            <strong>VisBo</strong>
          </span>
        </Button>

        <div className="vs-title">
          <input
            className="vs-title__input"
            aria-label="Board name"
            data-tip={document.title}
            value={document.title}
            maxLength={80}
            onChange={(event) => adapter.commit({ ...document, title: event.target.value })}
          />
          <span className="vs-save" role="status" aria-live="polite">
            <span className="vs-save__dot" aria-hidden="true" />
            <span>{adapter.saveStatus}</span>
          </span>
        </div>
      </div>

      <div className="vs-header__center vs-history gs-segmented" role="group" aria-label="History">
        <IconButton
          className="vs-icon-btn gs-segmented__item"
          data-tip="Undo (Ctrl+Z)"
          data-tip-pos="below"
          aria-label="Undo"
          disabled={!adapter.history.canUndo}
          onClick={() => adapter.undo()}
        >
          <UndoIcon />
        </IconButton>
        <IconButton
          className="vs-icon-btn gs-segmented__item"
          data-tip="Redo (Ctrl+Shift+Z)"
          data-tip-pos="below"
          aria-label="Redo"
          disabled={!adapter.history.canRedo}
          onClick={() => adapter.redo()}
        >
          <RedoIcon />
        </IconButton>
      </div>

      <div className="vs-header__end">
        <Button
          variant="primary"
          aria-label="Share"
          data-tip={
            shareDisabled ? 'Add something to your board to share' : 'Export or share your board'
          }
          data-tip-pos="below"
          onClick={onShare}
          disabled={shareDisabled}
        >
          <ExportIcon />
          <span>Share</span>
        </Button>

        <details ref={fileMenu} className="vs-menu">
          <summary
            className="vs-file-btn"
            data-tip="New board and backups"
            data-tip-pos="below"
            aria-label="File menu"
          >
            <span>File</span>
          </summary>
          <div className="vs-menu__pop vs-menu__pop--below-right">
            <Button className="vs-menu__item" aria-label="New board" onClick={onHome}>
              <PlusIcon />
              <span>New board</span>
            </Button>
            <div className="vs-menu__divider" />
            <p className="vs-menu__kicker">Editable board</p>
            <Button
              className="vs-menu__item"
              onClick={() => {
                void adapter.backup().catch((error) => onError(String(error)));
              }}
            >
              <SaveIcon />
              <span>Save .visbo file</span>
            </Button>
            <label className="vs-menu__item">
              <RestoreIcon />
              <span>Open board file</span>
              <input
                aria-label="Open board file"
                type="file"
                accept=".visbo,.json,application/vnd.visbo.project+json,application/json"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file)
                    try {
                      if (file.size > MAX_BACKUP_BYTES)
                        throw new Error('Backup is too large (maximum 180 MB).');
                      await adapter.restore(await file.text());
                      onError('');
                    } catch (error) {
                      onError(String(error));
                    }
                  event.target.value = '';
                }}
              />
            </label>
            <p className="vs-menu__note">Your board is saved locally as you work.</p>
          </div>
        </details>
      </div>
    </header>
  );
}
