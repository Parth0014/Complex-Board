import { useState } from 'react';
import type { StudioAdapter } from '../vision/contracts';
import type { MediaRecord } from '../vision/media';
import { photoLayout, type PhotoArrangement } from '../vision/photoLayout';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { errorMessage } from './errors';
export function PhotoLayoutBuilder({
  adapter,
  photos,
  onClose,
  initialIds,
}: {
  adapter: StudioAdapter;
  photos: Array<{ record: MediaRecord; url: string }>;
  onClose: () => void;
  initialIds?: string[];
}) {
  const [selected, setSelected] = useState(
    (initialIds ? photos.filter((photo) => initialIds.includes(photo.record.id)) : photos)
      .slice(0, 6)
      .map((photo) => photo.record.id),
  );
  const [style, setStyle] = useState<PhotoArrangement>('grid');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const chosen = photos.filter((photo) => selected.includes(photo.record.id));
  const board = adapter.history.document;
  const slots = selected.length
    ? photoLayout(
        selected.length,
        style,
        board.width,
        board.height,
        chosen.map((photo) => photo.record.width / photo.record.height),
      )
    : [];
  const apply = async () => {
    setBusy(true);
    setError('');
    try {
      await adapter.arrangePhotos(
        chosen.map((photo) => photo.record.id),
        style,
      );
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="vs-veil">
      <Dialog
        className="vs-dialog photo-layout-dialog"
        aria-label="Arrange uploaded photos"
        onClose={() => {
          if (!busy) onClose();
        }}
      >
        <div className="vs-dialog__head">
          <h2>Arrange photos</h2>
          <Button disabled={busy} onClick={onClose}>
            Close
          </Button>
        </div>
        <p>Choose photos and a layout. Your existing board content stays in place.</p>
        <label className="vs-field">
          <span>Number of photos</span>
          <input
            className="vs-input"
            type="number"
            min={1}
            max={Math.min(12, photos.length)}
            value={selected.length}
            disabled={busy}
            onChange={(e) => {
              const count = Math.max(
                1,
                Math.min(12, photos.length, Math.round(Number(e.target.value))),
              );
              setSelected(
                [
                  ...selected,
                  ...photos.map((p) => p.record.id).filter((id) => !selected.includes(id)),
                ].slice(0, count),
              );
            }}
          />
        </label>
        <div className="photo-layout-choices" role="group" aria-label="Layout style">
          {(['grid', 'hero', 'columns'] as const).map((value) => (
            <Button
              key={value}
              disabled={busy}
              aria-pressed={style === value}
              onClick={() => setStyle(value)}
            >
              <svg
                viewBox={`0 0 ${board.width} ${board.height}`}
                width="72"
                height="44"
                aria-hidden="true"
              >
                {photoLayout(
                  Math.max(1, selected.length),
                  value,
                  board.width,
                  board.height,
                  chosen.map((photo) => photo.record.width / photo.record.height),
                ).map((slot, index) => (
                  <rect
                    key={index}
                    {...slot}
                    rx={Math.min(board.width, board.height) * 0.015}
                    fill="currentColor"
                    opacity={value === 'hero' && index === 0 ? 1 : 0.5}
                  />
                ))}
              </svg>
              {value === 'grid' ? 'Gallery' : value === 'hero' ? 'Spotlight' : 'Mosaic'}
            </Button>
          ))}
        </div>
        <div
          className="photo-layout-preview"
          style={{
            aspectRatio: `${board.width}/${board.height}`,
            width: `min(100%, ${(360 * board.width) / board.height}px)`,
          }}
          aria-label="Layout preview"
        >
          {chosen.map((photo, i) => (
            <img
              key={photo.record.id}
              src={photo.url}
              alt=""
              style={{
                left: `${(slots[i].x / board.width) * 100}%`,
                top: `${(slots[i].y / board.height) * 100}%`,
                width: `${(slots[i].width / board.width) * 100}%`,
                height: `${(slots[i].height / board.height) * 100}%`,
              }}
            />
          ))}
        </div>
        <div className="photo-layout-selection" role="group" aria-label="Choose photos">
          {photos.map((photo) => (
            <Button
              key={photo.record.id}
              disabled={busy || (!selected.includes(photo.record.id) && selected.length >= 12)}
              aria-label={`Use ${photo.record.name}`}
              aria-pressed={selected.includes(photo.record.id)}
              onClick={() =>
                setSelected((old) =>
                  old.includes(photo.record.id)
                    ? old.filter((id) => id !== photo.record.id)
                    : [...old, photo.record.id],
                )
              }
            >
              <img src={photo.url} alt="" />
            </Button>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        <Button
          variant="primary"
          loading={busy}
          disabled={!selected.length}
          onClick={() => void apply()}
        >
          Add layout to board
        </Button>
        <p className="ai-tool-help">Photos remain editable. Undo removes the layout in one step.</p>
      </Dialog>
    </div>
  );
}
