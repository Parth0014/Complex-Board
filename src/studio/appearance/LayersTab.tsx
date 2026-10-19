import type { ReactNode } from 'react';
import type { BoardItem } from '../../vision/document';
import type { EditorAdapter } from '../../vision/contracts';
import { InspectorSection as Sec } from './InspectorSection';
import { Button, IconButton } from '../ui/Button';
import {
  LayersIcon,
  ImageIcon,
  TypeIcon,
  SlidersIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
  UndoIcon,
  BringFrontIcon,
  SendBackIcon,
  ForwardIcon,
  BackwardIcon,
} from '../icons';
export function LayersTab({ adapter }: { adapter: EditorAdapter }) {
  const layerDrag = (event: React.DragEvent, key: string, path: string[]) => {
    event.stopPropagation();
    event.dataTransfer.setData('application/x-studio-layer', JSON.stringify({ key, path }));
  };
  const layerDrop = (event: React.DragEvent, key: string, path: string[]) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const value = JSON.parse(event.dataTransfer.getData('application/x-studio-layer'));
      if (JSON.stringify(value.path) === JSON.stringify(path))
        adapter.reorderLayer(value.key, key, path);
    } catch {
      /* unrelated drop */
    }
  };
  const layerIcon = (entry: BoardItem) =>
    entry.asset && entry.asset.provider !== 'upload' ? (
      <img className="vs-layer__thumb" src={entry.asset.previewUrl} alt="" />
    ) : entry.kind === 'text' ? (
      <span className="vs-layer__thumb vs-layer__thumb--icon" aria-hidden="true">
        <TypeIcon />
      </span>
    ) : entry.kind === 'asset' ? (
      <span className="vs-layer__thumb vs-layer__thumb--icon" aria-hidden="true">
        <ImageIcon />
      </span>
    ) : (
      <span className="vs-layer__thumb vs-layer__thumb--icon" aria-hidden="true">
        <SlidersIcon />
      </span>
    );

  const groups = (path: string[], depth = 0): ReactNode => {
    const members = adapter.history.document.items.filter((item) =>
      path.every((id, index) => adapter.path(item)[index] === id),
    );
    const keys = [
      ...new Set([...members].reverse().map((item) => adapter.path(item)[depth] || item.id)),
    ];
    return keys.map((key, index) => {
      const children = members.filter((item) => (adapter.path(item)[depth] || item.id) === key),
        group = adapter.path(children[0]).length > depth;
      if (group)
        return (
          <section key={key} className="vs-layer-group layer-group">
            <div
              className="inspector-layer-group-heading"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  (event.key === 'Enter' || event.key === ' ')
                ) {
                  event.preventDefault();
                  adapter.groupScope = path;
                  adapter.select(children.map((item) => item.id));
                }
              }}
              draggable
              onDragStart={(event) => layerDrag(event, key, path)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => layerDrop(event, key, path)}
              onClick={() => {
                adapter.groupScope = path;
                adapter.select(children.map((item) => item.id));
              }}
            >
              <LayersIcon /> Group ({children.length})
              <span className="inspector-group-moves">
                <IconButton
                  aria-label="Move group up"
                  disabled={index === 0}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    adapter.reorderLayer(keys[index - 1], key, path);
                  }}
                >
                  <ForwardIcon />
                </IconButton>
                <IconButton
                  aria-label="Move group down"
                  disabled={index === keys.length - 1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    adapter.reorderLayer(key, keys[index + 1], path);
                  }}
                >
                  <BackwardIcon />
                </IconButton>
              </span>
            </div>
            <div className="vs-layer-group__kids">{groups([...path, key], depth + 1)}</div>
          </section>
        );
      const entry = children[0];
      const label = entry.text || entry.asset?.title || entry.shape || 'Drawing';
      return (
        <div
          key={key}
          className={`vs-layer layer-row${adapter.selectedIds.includes(key) ? ' is-selected' : ''}`}
          draggable
          onDragStart={(event) => layerDrag(event, key, path)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => layerDrop(event, key, path)}
        >
          {layerIcon(entry)}
          <Button
            className="vs-layer__name"
            data-tip={`Select ${label}`}
            aria-pressed={adapter.selectedIds.includes(key)}
            onClick={() => {
              adapter.groupScope = adapter.path(entry);
              adapter.select([key]);
            }}
          >
            {label}
          </Button>
          <Button
            className={`vs-icon-btn vs-layer__visibility${entry.hidden ? ' is-off is-active' : ''}`}
            data-tip={entry.hidden ? `Show ${label}` : `Hide ${label}`}
            aria-label={`${entry.hidden ? 'Show' : 'Hide'} ${label}`}
            onClick={() => adapter.patchItems([{ id: key, patch: { hidden: !entry.hidden } }])}
          >
            {entry.hidden ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
          <Button
            className={`vs-icon-btn vs-layer__lock${entry.locked ? ' is-active' : ' is-off'}`}
            data-tip={entry.locked ? 'Unlock layer' : 'Lock layer'}
            aria-label={`${entry.locked ? 'Unlock' : 'Lock'} layer`}
            onClick={() => adapter.patchItems([{ id: key, patch: { locked: !entry.locked } }])}
          >
            {entry.locked ? <LockIcon /> : <UnlockIcon />}
          </Button>
        </div>
      );
    });
  };
  return (
    <>
      <>
        <Sec title="Layer stack" open icon={<LayersIcon />}>
          <p className="inspector-help">Drag layers to reorder.</p>
          <div className="vs-layers">{groups([])}</div>
          <div className="inspector-background-row">Background</div>
        </Sec>
        <Sec title="Arrange">
          <div className="shape-grid inspector-action-grid">
            {(['forward', 'backward', 'front', 'back'] as const).map((position) => (
              <Button
                key={position}
                disabled={!adapter.selectedIds.length}
                onClick={() => adapter.arrangeSelection(position)}
              >
                {position === 'forward' ? (
                  <ForwardIcon />
                ) : position === 'backward' ? (
                  <BackwardIcon />
                ) : position === 'front' ? (
                  <BringFrontIcon />
                ) : (
                  <SendBackIcon />
                )}
                {position[0].toUpperCase() + position.slice(1)}
              </Button>
            ))}
          </div>
        </Sec>
        {adapter.groupScope.length > 0 && (
          <Button
            variant="secondary"
            className="inspector-centered"
            onClick={() => adapter.exitGroup()}
          >
            <UndoIcon /> Exit group ({adapter.groupScope.length})
          </Button>
        )}
      </>
    </>
  );
}
