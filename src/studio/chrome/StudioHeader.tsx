import { errorMessage } from '../errors';
import { BoardSizeControl } from '../BoardSizeControl';
import { useEffect, useRef, useState } from 'react';
import { Menu } from '../ui/Menu';
import { Popover } from '../ui/Popover';
import { compactScreen } from '../ui/breakpoints';
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

/** Maximum backup file size for restore (item 17). */
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
  onExport,
  onPreview,
  onError,
  onShortcuts,
  exportDisabled = false,
  templateTools,
}: {
  adapter: EditorAdapter;
  onHome: () => void;
  onExport: () => void;
  onPreview: () => void;
  onError: (message: string) => void;
  onShortcuts: () => void;
  exportDisabled?: boolean;
  templateTools?: { onPublish(): void; publishing: boolean };
}) {
  const fileMenu = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [compact, setCompact] = useState(
    () => adapter.ownerWindow.matchMedia(compactScreen).matches,
  );
  useEffect(() => {
    const media = adapter.ownerWindow.matchMedia(compactScreen);
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [adapter]);
  const backup = async () => {
    setBackupBusy(true);
    try {
      await adapter.backup();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBackupBusy(false);
    }
  };
  const commandKey = /Mac|iPhone|iPad/.test(adapter.ownerWindow.navigator.platform) ? '⌘' : 'Ctrl';
  const document = adapter.history.document;
  const [name, setName] = useState(document.title);
  const cancelled = useRef(false);
  useEffect(() => setName(document.title), [document.title]);
  const commitName = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setName(document.title);
      return;
    }
    const next = name.trim() || document.title;
    if (next !== document.title) adapter.commit({ ...document, title: next });
    setName(next);
  };
  return (
    <header className="vs-header">
      <div className="vs-header__start">
        <Button
          type="button"
          className="vs-brand"
          aria-label={templateTools ? 'Back to template library' : 'Back to home'}
          onClick={onHome}
        >
          <VisionMark />
          <span className="vs-brand__name">
            <strong>{templateTools ? 'Template maker' : 'VisBo'}</strong>
          </span>
        </Button>

        <div className="vs-title">
          <input
            className="vs-title__input"
            aria-label={templateTools ? 'Template name' : 'Board name'}
            data-tip={document.title}
            data-tip-pos="below"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                event.stopPropagation();
                cancelled.current = true;
                setName(document.title);
                event.currentTarget.blur();
              }
            }}
          />
          <span
            className="vs-save"
            role="status"
            aria-live="polite"
            data-tip={
              adapter.savedAt
                ? `Last saved ${new Date(adapter.savedAt).toLocaleString()}`
                : 'Saved in this browser'
            }
          >
            <span className="vs-save__dot" aria-hidden="true" />
            <span>{adapter.saveStatus}</span>
          </span>
        </div>
      </div>

      <div className="vs-header__center gs-segmented" role="group" aria-label="History">
        <IconButton
          className="gs-segmented__item"
          data-tip={`Undo (${commandKey}+Z)`}
          data-tip-pos="below"
          aria-label="Undo"
          disabled={!adapter.history.canUndo}
          onClick={() => adapter.undo()}
        >
          <UndoIcon />
        </IconButton>
        <IconButton
          className="gs-segmented__item"
          data-tip={`Redo (${commandKey}+${commandKey === '⌘' ? 'Shift+Z' : 'Y'})`}
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
          variant="secondary"
          className="vs-preview-trigger"
          aria-label={templateTools ? 'Preview template' : 'Preview board'}
          onClick={onPreview}
        >
          Preview
        </Button>
        <Button
          variant="primary"
          className="vs-export-trigger"
          aria-label={templateTools ? 'Publish template' : 'Export'}
          data-tip={
            templateTools
              ? 'Review template details and publish'
              : exportDisabled
                ? 'Add something to your board to export'
                : 'Export your board'
          }
          data-tip-pos="below"
          onClick={templateTools ? templateTools.onPublish : onExport}
          loading={templateTools?.publishing}
          disabledReason={
            exportDisabled
              ? templateTools
                ? 'Add something to your template to publish'
                : 'Add something to your board to export'
              : undefined
          }
        >
          <ExportIcon />
          <span>{templateTools ? 'Publish' : 'Export'}</span>
        </Button>

        <div className="vs-menu">
          <Button
            ref={fileMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="vs-file-btn"
            data-tip={templateTools ? 'Template actions' : 'Board actions'}
            data-tip-pos="below"
            aria-label="File menu"
          >
            <span className="vs-file-label">File</span>
            <span aria-hidden="true" className="vs-file-mobile-icon">
              ⋯
            </span>
          </Button>
          {menuOpen && (
            <Popover
              focusOnOpen
              anchor={fileMenu}
              onDismiss={() => setMenuOpen(false)}
              className="vs vs-header-file-menu"
            >
              <Menu aria-label="File actions">
                <p className="vs-menu__kicker">{templateTools ? 'Template' : 'Board'}</p>
                <Button
                  className="vs-menu__item"
                  role="menuitem"
                  aria-label={templateTools ? 'Template library' : 'New board'}
                  onClick={() => {
                    setMenuOpen(false);
                    onHome();
                  }}
                >
                  <PlusIcon />
                  <span>{templateTools ? 'Template library' : 'New board'}</span>
                </Button>
                <Button
                  className="vs-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setResizeOpen(true);
                  }}
                >
                  {templateTools ? 'Resize template' : 'Resize board'}
                </Button>
                <div className="vs-menu__divider" />
                <p className="vs-menu__kicker">Editable files</p>
                <Button
                  className="vs-menu__item"
                  role="menuitem"
                  onClick={() => fileInput.current?.click()}
                >
                  <RestoreIcon />
                  <span>{templateTools ? 'Open draft file' : 'Open board file'}</span>
                </Button>
                <Button
                  className="vs-menu__item"
                  role="menuitem"
                  disabled={backupBusy}
                  onClick={() => {
                    setMenuOpen(false);
                    void backup();
                  }}
                >
                  <SaveIcon />
                  <span>{templateTools ? 'Download draft file' : 'Download board file'}</span>
                </Button>
                <input
                  ref={fileInput}
                  aria-label={templateTools ? 'Open draft file' : 'Open board file'}
                  type="file"
                  accept=".visbo,.json,application/vnd.visbo.project+json,application/json"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file)
                      try {
                        if (file.size > MAX_BACKUP_BYTES)
                          throw new Error(
                            'Backup is too large (maximum 180 MB). Choose a smaller backup file.',
                          );
                        await adapter.restore(await file.text());
                        onError('');
                      } catch (error) {
                        onError(errorMessage(error));
                      }
                    event.target.value = '';
                  }}
                />
                {(compact || templateTools) && (
                  <>
                    <div className="vs-menu__divider" />
                    <p className="vs-menu__kicker">View & export</p>
                    <Button
                      role="menuitem"
                      className="vs-menu__item"
                      onClick={() => {
                        setMenuOpen(false);
                        onPreview();
                      }}
                    >
                      {templateTools ? 'Preview template' : 'Preview board'}
                    </Button>
                    <Button
                      role="menuitem"
                      className="vs-menu__item"
                      disabled={exportDisabled}
                      onClick={() => {
                        setMenuOpen(false);
                        onExport();
                      }}
                    >
                      {templateTools ? 'Export image' : 'Export board'}
                    </Button>
                  </>
                )}
                <div className="vs-menu__divider" />
                <p className="vs-menu__kicker">Help</p>
                <Button
                  role="menuitem"
                  className="vs-menu__item"
                  onClick={() => {
                    setMenuOpen(false);
                    onShortcuts();
                  }}
                >
                  Keyboard shortcuts <kbd>?</kbd>
                </Button>
                <p className="vs-menu__note">
                  Keep a board file as a backup before clearing browser data.
                </p>
              </Menu>
            </Popover>
          )}
        </div>
      </div>
      {resizeOpen && <BoardSizeControl adapter={adapter} onClose={() => setResizeOpen(false)} />}
    </header>
  );
}
