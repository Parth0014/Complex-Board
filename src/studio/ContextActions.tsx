import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { KonvaCanvasAdapter } from '../vision/canvas/KonvaCanvasAdapter';
import {
  PasteIcon,
  MoveIcon,
  LayersIcon,
  ScissorsIcon,
  DuplicateIcon,
  DuplicateItemIcon,
  GroupIcon,
  UngroupIcon,
  LockIcon,
  UnlockIcon,
  TrashIcon,
  SelectIcon,
  FitIcon,
} from './icons';

type Props = {
  adapter: KonvaCanvasAdapter;
  onClose: () => void;
};

export function ContextActions({ adapter, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = adapter.history.document.items.filter((entry) => adapter.selectedIds.includes(entry.id));
  const anyLocked = selected.some((entry) => !!entry.locked);
  const allLocked = !!selected.length && selected.every((entry) => !!entry.locked);
  const canUngroup = selected.some((entry) => !!entry.groupId);
  const unitCount = new Set(selected.map((entry) => entry.groupId || entry.id)).size;
  const item = selected.length === 1 ? selected[0] : undefined;
  const description = selected.length > 1 ? `${unitCount} selected objects` :
    item?.kind === 'text' ? 'Selected text' :
    item?.kind === 'shape' ? 'Selected shape' :
    item?.kind === 'asset' ? 'Selected image or graphic' : 'Canvas';
  const run = (fn: () => void) => () => { fn(); onClose(); };

  const onKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])]
      .filter((node) => node.getClientRects().length > 0);
    if (!buttons.length) return;
    event.preventDefault();
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
      event.key === 'ArrowDown' ? (index + 1) % buttons.length :
      (index - 1 + buttons.length) % buttons.length;
    buttons[next].focus();
  };

  return (
    <div ref={menuRef} className="vs-context-v2__content" onKeyDown={onKeyboard}>
      <div className="vs-context-v2__heading">{description}</div>
      <div className="vs-context-actions">
        {!!selected.length && (
          <>
            <button role="menuitem" autoFocus onClick={run(() => { void adapter.copyToSystem(); })}>
              <DuplicateIcon /> Copy <kbd>Ctrl+C</kbd>
            </button>
            <button role="menuitem" disabled={anyLocked}
              onClick={run(() => { void adapter.copyToSystem(true); })}>
              <ScissorsIcon /> Cut <kbd>Ctrl+X</kbd>
            </button>
          </>
        )}
        <button role="menuitem" autoFocus={!selected.length}
          onClick={run(() => { void adapter.pasteFromSystem(); })}>
          <PasteIcon /> Paste <kbd>Ctrl+V</kbd>
        </button>
        {!!selected.length && (
          <button role="menuitem" disabled={anyLocked} onClick={run(() => adapter.duplicateSelection())}>
            <DuplicateItemIcon /> Duplicate <kbd>Ctrl+D</kbd>
          </button>
        )}
      </div>
      {!!selected.length ? (
        <>
          <div className="vs-context-actions">
            <details className="vs-context-v2__sub vs-context-v2__sub--hover" onMouseEnter={(event) => { event.currentTarget.open = true; }} onMouseLeave={(event) => { event.currentTarget.open = false; }} onFocus={(event) => { event.currentTarget.open = true; }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false; }}>
              <summary onClick={(event) => event.preventDefault()}><LayersIcon /> Layer <span className="vs-context-v2__chevron">›</span></summary>
              <div className="vs-context-v2__subbody">
                {([['forward', 'Bring forward', ']'], ['front', 'Bring to front', 'Ctrl+]'], ['backward', 'Send backward', '['], ['back', 'Send to back', 'Ctrl+[']] as const).map(([position, label, shortcut]) => <button key={position} role="menuitem" disabled={anyLocked} onClick={run(() => adapter.arrangeSelection(position))}>{label}<kbd>{shortcut}</kbd></button>)}
              </div>
            </details>
            <details className="vs-context-v2__sub vs-context-v2__sub--hover" onMouseEnter={(event) => { event.currentTarget.open = true; }} onMouseLeave={(event) => { event.currentTarget.open = false; }} onFocus={(event) => { event.currentTarget.open = true; }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false; }}>
              <summary onClick={(event) => event.preventDefault()}><MoveIcon />{unitCount === 1 ? 'Align to page' : 'Arrange selection'}<span className="vs-context-v2__chevron">›</span></summary>
              <div className="vs-context-v2__subbody">
                {([['left', 'Left'], ['center', 'Center'], ['right', 'Right'], ['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']] as const).map(([value, label]) => <button key={value} role="menuitem" disabled={anyLocked} onClick={run(() => adapter.alignSelection(value))}>{label}</button>)}
                {unitCount >= 3 && <><button role="menuitem" disabled={anyLocked} onClick={run(() => adapter.distributeSelection('horizontal'))}>Space evenly horizontally</button><button role="menuitem" disabled={anyLocked} onClick={run(() => adapter.distributeSelection('vertical'))}>Space evenly vertically</button></>}
              </div>
            </details>
            {(unitCount > 1 || canUngroup) && (
              <button role="menuitem" disabled={anyLocked} onClick={run(() => {
                if (canUngroup) adapter.ungroupSelection(); else adapter.groupSelection();
              })}>
                {canUngroup ? <UngroupIcon /> : <GroupIcon />}
                {canUngroup ? 'Ungroup objects' : 'Group objects'}
                <kbd>{canUngroup ? 'Ctrl+Shift+G' : 'Ctrl+G'}</kbd>
              </button>
            )}
            <button role="menuitem" onClick={run(() => adapter.toggleLock())}>
              {allLocked ? <UnlockIcon /> : <LockIcon />}
              {allLocked ? 'Unlock selection' : 'Lock selection'}
            </button>
          </div>
          <div className="vs-context-actions vs-context-danger">
            <button role="menuitem" disabled={anyLocked}
              onClick={run(() => adapter.delete(adapter.selectedIds))}>
              <TrashIcon /> Delete <kbd>Del</kbd>
            </button>
          </div>
        </>
      ) : (
        <div className="vs-context-actions">
          <button role="menuitem"
            disabled={!adapter.history.document.items.some((entry) => !entry.hidden)}
            onClick={run(() => adapter.select(adapter.history.document.items.filter((entry) => !entry.hidden).map((entry) => entry.id)))}>
            <SelectIcon /> Select all <kbd>Ctrl+A</kbd>
          </button>
          <button role="menuitem" onClick={run(() => adapter.fitBoard())}><FitIcon /> Fit board to view</button>
        </div>
      )}
    </div>
  );
}
