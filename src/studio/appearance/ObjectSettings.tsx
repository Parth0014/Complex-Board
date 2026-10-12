import { errorMessage } from '../errors';
import { FlipHIcon } from '../icons';
import { useEffect, useState } from 'react';
import type { EditorAdapter } from '../../vision/contracts';
import type { EditableItem } from '../../vision/appearance/types';
import type { GratitudeAsset } from '../../assets/contracts';
import { curatedPackProvider } from '../../assets/curatedPack';
import { Button } from '../ui/Button';
import { CommittedNumber } from './CommittedNumber';
import { selectedAppearance } from './feature';

/** Retain existing bounds/frame actions separately from appearance; no new geometry logic. */
export function ObjectSettings({ adapter, item }: { adapter: EditorAdapter; item: EditableItem }) {
  const [open, setOpen] = useState(true);
  const [assets, setAssets] = useState<GratitudeAsset[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const frame =
    item.kind === 'shape' &&
    ['rectangle', 'circle', 'triangle', 'heart', 'cloud', 'star'].includes(item.shape || '');
  useEffect(() => {
    if (!open || !frame) return;
    let canceled = false;
    void curatedPackProvider
      .search({ limit: 250 }, adapter.ownerWindow)
      .then((result) => {
        if (!canceled) setAssets(result.items);
      })
      .catch((error) => {
        if (!canceled) setError(errorMessage(error));
      });
    return () => {
      canceled = true;
    };
  }, [adapter, frame, open]);
  const media = [
    ...new Map(
      [
        ...assets,
        ...adapter.history.document.items.flatMap((entry) =>
          [entry.asset, entry.contentAsset].filter(
            (asset): asset is GratitudeAsset =>
              !!asset && (asset.provider === 'upload' || asset.provider === 'generated'),
          ),
        ),
      ].map((asset) => [asset.id, asset]),
    ).values(),
  ];
  const setRadius = (radius: number) => {
    const current = selectedAppearance(adapter);
    if (current?.id === item.id && !current.locked)
      adapter.patchItems([{ id: item.id, patch: { radius } }]);
  };
  const resize = (key: 'width' | 'height', value: number) => {
    const current = selectedAppearance(adapter);
    if (current?.id === item.id && !current.locked)
      adapter.resizeObjectBounds(
        item.id,
        key === 'width' ? value : current.width,
        key === 'height' ? value : current.height,
      );
  };
  return (
    <details
      open={open}
      className="gs-text-advanced gs-object-settings"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        Object settings <span>Bounds & content</span>
      </summary>
      {!item.connector && (
        <>
          <p className="gs-appearance-note">
            Bounds change the frame; appearance controls leave your geometry intact.
          </p>
          <div className="gs-text-controls">
            <CommittedNumber
              adapter={adapter}
              label="Bounds width"
              value={item.width}
              min={10}
              max={10000}
              onCommit={(value) => resize('width', value)}
            />
            <CommittedNumber
              adapter={adapter}
              label="Bounds height"
              value={item.height}
              min={10}
              max={10000}
              onCommit={(value) => resize('height', value)}
            />
          </div>
          <Button
            disabled={item.kind !== 'text' && !item.contentSize}
            onClick={() => adapter.fitObjectBounds(item.id)}
          >
            Fit bounds to content
          </Button>
        </>
      )}
      {((item.kind === 'shape' && item.shape === 'rectangle') ||
        (item.appearance.kind === 'text' && item.appearance.background !== null)) && (
        <div className="gs-radius-controls">
          <label>
            Corner radius
            <input
              type="range"
              aria-label="Corner radius slider"
              min={0}
              max={150}
              value={item.radius || 0}
              onPointerDown={() => adapter.beginGesture()}
              onPointerUp={() => adapter.endGesture()}
              onPointerCancel={() => adapter.endGesture()}
              onChange={(event) => setRadius(Number(event.target.value))}
            />
          </label>
          <CommittedNumber
            adapter={adapter}
            label="Corner radius"
            value={item.radius || 0}
            min={0}
            max={150}
            onCommit={setRadius}
          />
        </div>
      )}
      <Button
        onClick={() => {
          const current = selectedAppearance(adapter);
          if (current?.id === item.id && !current.locked)
            adapter.patchItems([{ id: item.id, patch: { flipX: !current.flipX } }]);
        }}
      >
        <FlipHIcon /> Flip horizontally
      </Button>
      {frame && (
        <label className="gs-frame-choice">
          Convert shape to frame
          <select
            aria-label="Convert shape to frame"
            value=""
            disabled={busy}
            onChange={async (event) => {
              const id = event.target.value;
              if (!id || selectedAppearance(adapter)?.id !== item.id || item.locked) return;
              setBusy(true);
              setError('');
              try {
                await adapter.attachFrameContent(id);
              } catch (error) {
                setError(errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <option value="">Choose image or graphic</option>
            {media
              .filter((asset) => !asset.frameSlot)
              .map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title}
                </option>
              ))}
          </select>
        </label>
      )}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
