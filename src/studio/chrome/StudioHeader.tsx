import { Button, IconButton } from '../ui/Button';
import { BOARD_SIZES } from '../BoardSizeControl';
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
  const document = adapter.history.document;
  return (
    <header className="vs-header">
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
          value={document.title}
          maxLength={80}
          onChange={(event) => adapter.commit({ ...document, title: event.target.value })}
        />
        <span className="vs-save" role="status" aria-live="polite">
          <span className="vs-save__dot" aria-hidden="true" />
          <span>{adapter.saveStatus}</span>
        </span>
      </div>

      <div className="vs-header__spacer" />

      <div className="vs-history" role="group" aria-label="History">
        <IconButton
          className="vs-icon-btn"
          data-tip="Undo (Ctrl+Z)"
          data-tip-pos="below"
          aria-label="Undo"
          disabled={!adapter.history.canUndo}
          onClick={() => adapter.undo()}
        >
          <UndoIcon />
        </IconButton>
        <IconButton
          className="vs-icon-btn"
          data-tip="Redo (Ctrl+Shift+Z)"
          data-tip-pos="below"
          aria-label="Redo"
          disabled={!adapter.history.canRedo}
          onClick={() => adapter.redo()}
        >
          <RedoIcon />
        </IconButton>
      </div>

      <Button
        className="vs-btn vs-btn--ghost"
        aria-label="New board"
        data-tip="Start a new board"
        data-tip-pos="below"
        onClick={onHome}
      >
        <PlusIcon />
        <span>New</span>
      </Button>
      <Button
        className="vs-btn vs-btn--primary"
        aria-label="Share"
        data-tip="Export or share your board"
        data-tip-pos="below"
        onClick={onShare}
        disabled={shareDisabled}
      >
        <ExportIcon />
        <span>Share</span>
      </Button>

      <details className="vs-menu">
        <summary
          className="vs-file-btn"
          data-tip="Board file options"
          data-tip-pos="below"
          aria-label="File menu"
        >
          <span>File</span>
        </summary>
        <div className="vs-menu__pop vs-menu__pop--below-right">
          <p className="vs-menu__kicker">Board file</p>
          <Button
            className="vs-menu__item"

            onClick={() => {
              void adapter.backup().catch((error) => onError(String(error)));
            }}
          >
            <SaveIcon />
            <span>Save backup</span>
          </Button>
          <label className="vs-menu__item">
            <RestoreIcon />
            <span>Restore backup</span>
            <input
              aria-label="Restore backup"
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file)
                  try {
                    if (file.size > 180 * 1024 * 1024)
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
          <div className="vs-menu__divider" />
          <p className="vs-menu__kicker">Canvas</p>
          <label className="vs-menu__row">
            <span>Page size</span>
            <select
              className="vs-select"
              aria-label="Page size"
              value={`${document.width}x${document.height}`}
              onChange={(event) => {
                const [width, height] = event.target.value.split('x').map(Number);
                adapter.commit({ ...document, width, height });
                adapter.fitBoard();
              }}
            >
              {!BOARD_SIZES.some(([value]) => value === `${document.width}x${document.height}`) && (
                <option value={`${document.width}x${document.height}`} disabled hidden>
                  Current board
                </option>
              )}
              {BOARD_SIZES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="vs-menu__note">Your board is saved locally as you work.</p>
        </div>
      </details>
    </header>
  );
}
