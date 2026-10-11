import { Button } from './ui/Button';
import { Menu, Submenu } from './ui/Menu';
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
  const selected = adapter.history.document.items.filter((entry) =>
    adapter.selectedIds.includes(entry.id),
  );
  const anyLocked = selected.some((entry) => !!entry.locked);
  const allLocked = !!selected.length && selected.every((entry) => !!entry.locked);
  const canUngroup = selected.some((entry) => !!entry.groupId);
  const unitCount = new Set(selected.map((entry) => entry.groupId || entry.id)).size;
  const item = selected.length === 1 ? selected[0] : undefined;
  const description =
    selected.length > 1
      ? `${unitCount} selected objects`
      : item?.kind === 'text'
        ? 'Selected text'
        : item?.kind === 'shape'
          ? 'Selected shape'
          : item?.kind === 'asset'
            ? 'Selected image or graphic'
            : 'Canvas';
  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <Menu className="vs-context-v2__content" aria-label="Canvas actions">
      <div className="vs-context-v2__heading">{description}</div>
      <div className="vs-context-actions">
        {!!selected.length && (
          <>
            <Button
              role="menuitem"
              autoFocus
              onClick={run(() => {
                void adapter.copyToSystem();
              })}
            >
              <DuplicateIcon /> Copy <kbd>Ctrl+C</kbd>
            </Button>
            <Button
              role="menuitem"
              disabled={anyLocked}
              onClick={run(() => {
                void adapter.copyToSystem(true);
              })}
            >
              <ScissorsIcon /> Cut <kbd>Ctrl+X</kbd>
            </Button>
          </>
        )}
        <Button
          role="menuitem"
          autoFocus={!selected.length}
          onClick={run(() => {
            void adapter.pasteFromSystem();
          })}
        >
          <PasteIcon /> Paste <kbd>Ctrl+V</kbd>
        </Button>
        {!!selected.length && (
          <Button
            role="menuitem"
            disabled={anyLocked}
            onClick={run(() => adapter.duplicateSelection())}
          >
            <DuplicateItemIcon /> Duplicate <kbd>Ctrl+D</kbd>
          </Button>
        )}
      </div>
      {selected.length > 0 ? (
        <>
          <div className="vs-context-actions">
            <Submenu label="Layer" icon={<LayersIcon />}>
              {(
                [
                  ['forward', 'Bring forward', ']'],
                  ['front', 'Bring to front', 'Ctrl+]'],
                  ['backward', 'Send backward', '['],
                  ['back', 'Send to back', 'Ctrl+['],
                ] as const
              ).map(([position, label, shortcut]) => (
                <Button
                  key={position}
                  role="menuitem"
                  disabled={anyLocked}
                  onClick={run(() => adapter.arrangeSelection(position))}
                >
                  {label}
                  <kbd>{shortcut}</kbd>
                </Button>
              ))}
            </Submenu>
            <Submenu
              label={unitCount === 1 ? 'Align to page' : 'Arrange selection'}
              icon={<MoveIcon />}
            >
              {(
                [
                  ['left', 'Left'],
                  ['center', 'Center'],
                  ['right', 'Right'],
                  ['top', 'Top'],
                  ['middle', 'Middle'],
                  ['bottom', 'Bottom'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  role="menuitem"
                  disabled={anyLocked}
                  onClick={run(() => adapter.alignSelection(value))}
                >
                  {label}
                </Button>
              ))}
              {unitCount >= 3 && (
                <>
                  <Button
                    role="menuitem"
                    disabled={anyLocked}
                    onClick={run(() => adapter.distributeSelection('horizontal'))}
                  >
                    Space evenly horizontally
                  </Button>
                  <Button
                    role="menuitem"
                    disabled={anyLocked}
                    onClick={run(() => adapter.distributeSelection('vertical'))}
                  >
                    Space evenly vertically
                  </Button>
                </>
              )}
            </Submenu>
            {(unitCount > 1 || canUngroup) && (
              <Button
                role="menuitem"
                disabled={anyLocked}
                onClick={run(() => {
                  if (canUngroup) adapter.ungroupSelection();
                  else adapter.groupSelection();
                })}
              >
                {canUngroup ? <UngroupIcon /> : <GroupIcon />}
                {canUngroup ? 'Ungroup objects' : 'Group objects'}
                <kbd>{canUngroup ? 'Ctrl+Shift+G' : 'Ctrl+G'}</kbd>
              </Button>
            )}
            <Button role="menuitem" onClick={run(() => adapter.toggleLock())}>
              {allLocked ? <UnlockIcon /> : <LockIcon />}
              {allLocked ? 'Unlock selection' : 'Lock selection'}
            </Button>
          </div>
          <div className="vs-context-actions vs-context-danger">
            <Button
              role="menuitem"
              disabled={anyLocked}
              onClick={run(() => adapter.delete(adapter.selectedIds))}
            >
              <TrashIcon /> Delete <kbd>Del</kbd>
            </Button>
          </div>
        </>
      ) : (
        <div className="vs-context-actions">
          <Button
            role="menuitem"
            disabled={!adapter.history.document.items.some((entry) => !entry.hidden)}
            onClick={run(() =>
              adapter.select(
                adapter.history.document.items
                  .filter((entry) => !entry.hidden)
                  .map((entry) => entry.id),
              ),
            )}
          >
            <SelectIcon /> Select all <kbd>Ctrl+A</kbd>
          </Button>
          <Button role="menuitem" onClick={run(() => adapter.fitBoard())}>
            <FitIcon /> Fit board to view
          </Button>
        </div>
      )}
    </Menu>
  );
}
