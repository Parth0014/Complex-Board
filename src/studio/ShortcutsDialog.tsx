import { Dialog } from './ui/Dialog';
import { IconButton } from './ui/Button';
import { CloseIcon } from './icons';

export function ShortcutsDialog({
  ownerWindow,
  onClose,
}: {
  ownerWindow: Window;
  onClose(): void;
}) {
  const mod = /Mac|iPhone|iPad/.test(ownerWindow.navigator.platform) ? '⌘' : 'Ctrl';
  const rows = [
    ['Undo', `${mod}+Z`],
    ['Redo', mod === '⌘' ? '⌘+Shift+Z' : 'Ctrl+Y'],
    ['Select all', `${mod}+A`],
    ['Duplicate', `${mod}+D`],
    ['Group / Ungroup', `${mod}+G / ${mod}+Shift+G`],
    ['Copy / Cut / Paste', `${mod}+C / X / V`],
    ['Delete selection', 'Delete / Backspace'],
    ['Move selection', 'Arrow keys'],
    ['Move faster', 'Shift+Arrow'],
    ['Move backward / forward', '[ / ]'],
    ['Send to back / front', `${mod}+[ / ]`],
    ['Zoom out / in', '- / +'],
    ['Fit board', `0 / ${mod}+0`],
    ['Actual size (100%)', `${mod}+1`],
    ['Zoom from center', `${mod}+scroll`],
    ['Selection tool', 'V'],
    ['Deselect / exit mode', 'Esc'],
    ['Show shortcuts', '?'],
  ];
  return (
    <div className="vs-veil">
      <Dialog
        className="vs-dialog shortcuts-dialog"
        aria-label="Keyboard shortcuts"
        onClose={onClose}
      >
        <div className="vs-dialog__head">
          <h2>Keyboard shortcuts</h2>
          <IconButton aria-label="Close shortcuts" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <p className="inspector-help">
          Shortcuts apply on the canvas. Text fields keep their normal editing controls.
        </p>
        <dl className="shortcut-list">
          {rows.map(([label, keys]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <kbd>{keys}</kbd>
              </dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </div>
  );
}
