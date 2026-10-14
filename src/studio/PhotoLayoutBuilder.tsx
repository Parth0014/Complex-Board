import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StudioAdapter } from '../vision/contracts';
import type { MediaRecord } from '../vision/media';
import {
  photoLayout,
  PHOTO_STYLES,
  type PhotoArrangement,
  type PhotoTheme,
} from '../vision/photoLayout';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { CloseIcon, CheckIcon } from './icons';
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
    (initialIds ? photos.filter((p) => initialIds.includes(p.record.id)) : photos)
      .slice(0, 6)
      .map((p) => p.record.id),
  );
  const [style, setStyle] = useState<PhotoArrangement>('scrapbook'),
    [theme, setTheme] = useState<PhotoTheme>('vision2027');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(''),
    [previewing, setPreviewing] = useState(false);
  const applying = useRef(false);
  const chosen = selected.map((id) => photos.find((p) => p.record.id === id)!).filter(Boolean),
    board = adapter.history.document;
  const idsKey = JSON.stringify(selected);
  useEffect(() => {
    let live = true;
    const ids: string[] = JSON.parse(idsKey);
    setPreview('');
    setError('');
    if (!ids.length) {
      setPreviewing(false);
      return;
    }
    setPreviewing(true);
    void adapter
      .previewPhotoArrangement(ids, style, theme)
      .then((url) => {
        if (live) setPreview(url);
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setPreviewing(false);
      });
    return () => {
      live = false;
    };
  }, [adapter, idsKey, style, theme, board.width, board.height]);
  const apply = async () => {
    if (applying.current || !preview) return;
    applying.current = true;
    setBusy(true);
    setError('');
    try {
      await adapter.arrangePhotos(selected, style, theme);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      applying.current = false;
      setBusy(false);
    }
  };
  return createPortal(
    <div className="vs vs-veil photo-layout-veil">
      <Dialog
        className="vs-dialog photo-layout-dialog"
        aria-label="Arrange uploaded photos"
        onClose={() => {
          if (!applying.current) onClose();
        }}
      >
        <header className="photo-layout-header">
          <div>
            <p className="photo-layout-eyebrow">Your photos, a new story</p>
            <h2>Arrange photos</h2>
          </div>
          <Button
            className="gs-icon-button"
            aria-label="Close photo arranger"
            disabled={busy}
            onClick={onClose}
          >
            <CloseIcon size={20} />
          </Button>
        </header>
        <div className="photo-layout-body">
          <div className="photo-layout-settings">
            <div className="photo-layout-fields">
              <label className="vs-field">
                <span>Theme</span>
                <select
                  className="vs-select"
                  aria-label="Collage theme"
                  value={theme}
                  disabled={busy}
                  onChange={(e) => setTheme(e.target.value as PhotoTheme)}
                >
                  <option value="vision2027">Dreams &amp; goals</option>
                  <option value="travel">Travel &amp; adventure</option>
                  <option value="diaries">Reading &amp; journaling</option>
                </select>
              </label>
              <label className="vs-field">
                <span>Number of photos</span>
                <select
                  className="vs-select"
                  aria-label="Number of photos"
                  value={selected.length}
                  disabled={busy}
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    setSelected(
                      [
                        ...selected,
                        ...photos.map((p) => p.record.id).filter((id) => !selected.includes(id)),
                      ].slice(0, count),
                    );
                  }}
                >
                  {!selected.length && <option value={0}>Choose photos</option>}
                  {Array.from({ length: Math.min(12, photos.length) }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {i === 0 ? 'photo' : 'photos'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <h3>Choose a style</h3>
            <div className="photo-layout-choices" role="group" aria-label="Layout style">
              {PHOTO_STYLES.map((option) => (
                <Button
                  key={option.id}
                  disabled={busy}
                  aria-pressed={style === option.id}
                  onClick={() => setStyle(option.id)}
                >
                  <svg viewBox={`0 0 ${board.width} ${board.height}`} aria-hidden="true">
                    {photoLayout(
                      Math.max(1, selected.length),
                      option.id,
                      board.width,
                      board.height,
                      chosen.map((p) => p.record.width / p.record.height),
                    ).map((slot, i) => (
                      <rect
                        key={i}
                        x={slot.x}
                        y={slot.y}
                        width={slot.width}
                        height={slot.height}
                        transform={`rotate(${slot.rotation} ${slot.x} ${slot.y})`}
                        rx={Math.min(board.width, board.height) * 0.006}
                        fill="currentColor"
                        opacity={i % 2 ? 0.55 : 0.85}
                      />
                    ))}
                  </svg>
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  {style === option.id && <CheckIcon size={16} />}
                </Button>
              ))}
            </div>
            <div className="photo-layout-selection-heading">
              <h3>Your photos</h3>
              <span>{selected.length} / 12 selected</span>
            </div>
            <div className="photo-layout-selection" role="group" aria-label="Choose photos">
              {photos.map((p) => (
                <Button
                  key={p.record.id}
                  disabled={busy || (!selected.includes(p.record.id) && selected.length >= 12)}
                  aria-label={`Use ${p.record.name}`}
                  aria-pressed={selected.includes(p.record.id)}
                  onClick={() =>
                    setSelected((old) =>
                      old.includes(p.record.id)
                        ? old.filter((id) => id !== p.record.id)
                        : [...old, p.record.id],
                    )
                  }
                >
                  <img src={p.url} alt="" loading="lazy" draggable={false} />
                  {selected.includes(p.record.id) && (
                    <span className="photo-layout-photo-number">
                      {selected.indexOf(p.record.id) + 1}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
          <section className="photo-layout-preview-area" aria-label="Composition preview">
            <div className="photo-layout-preview-label">
              <span>Live preview</span>
              <span>
                {board.width} × {board.height}
              </span>
            </div>
            <div
              className="photo-layout-preview"
              style={{
                aspectRatio: `${board.width}/${board.height}`,
                width: `min(100%, calc(var(--photo-preview-height) * ${board.width / board.height}))`,
              }}
              aria-label="Layout preview"
              aria-busy={previewing}
            >
              {preview ? (
                <img
                  src={preview}
                  alt={`${PHOTO_STYLES.find((p) => p.id === style)!.label} composition preview`}
                  draggable={false}
                />
              ) : (
                <p role="status">
                  {previewing
                    ? 'Preparing your composition…'
                    : selected.length
                      ? 'Preview unavailable'
                      : 'Choose photos to begin'}
                </p>
              )}
            </div>
            <p className="photo-layout-preview-hint">
              Photos, lettering and decorations stay editable.
            </p>
          </section>
        </div>
        <footer className="photo-layout-footer">
          <div>
            {error ? (
              <p className="panel-inline-error" role="alert">
                {error}
              </p>
            ) : (
              <p>One composition. One step to undo.</p>
            )}
            <span>
              {selected.length} {selected.length === 1 ? 'photo' : 'photos'} ·{' '}
              {PHOTO_STYLES.find((p) => p.id === style)!.label}
            </span>
          </div>
          <Button
            variant="primary"
            loading={busy}
            disabled={!selected.length || previewing || !preview}
            onClick={() => void apply()}
          >
            Add layout to board
          </Button>
        </footer>
      </Dialog>
    </div>,
    adapter.ownerWindow.document.body,
  );
}
