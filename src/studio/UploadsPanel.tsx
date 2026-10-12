import { listMedia, mediaAsset, type MediaRecord } from '../vision/media';
import { errorMessage } from './errors';
import { Button } from './ui/Button';
import { useEffect, useState } from 'react';
import type { StudioAdapter } from '../vision/contracts';
import { UploadIcon } from './icons';

export function UploadsPanel({
  adapter,
  onError,
}: {
  adapter: StudioAdapter;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [downloading, setDownloading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [failedFiles, setFailedFiles] = useState<File[] | null>(null);
  const [library, setLibrary] = useState<Array<{ record: MediaRecord; url: string }>>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [inserting, setInserting] = useState('');
  useEffect(() => {
    const win = adapter.ownerWindow;
    let live = true,
      serial = 0;
    let urls: string[] = [];
    const refresh = async () => {
      const request = ++serial;
      try {
        const records = await listMedia(win);
        if (!live || request !== serial) return;
        const next = records.map((record) => ({
          record,
          url: win.URL.createObjectURL(record.working),
        }));
        urls.forEach((url) => win.URL.revokeObjectURL(url));
        urls = next.map((item) => item.url);
        setLibrary(next);
      } catch (error) {
        if (live) setError(errorMessage(error));
      } finally {
        if (live) setLoadingLibrary(false);
      }
    };
    void refresh();
    const changed = () => {
      void refresh();
    };
    win.addEventListener('studio-media-changed', changed);
    win.addEventListener('focus', changed);
    return () => {
      live = false;
      win.removeEventListener('studio-media-changed', changed);
      win.removeEventListener('focus', changed);
      urls.forEach((url) => win.URL.revokeObjectURL(url));
    };
  }, [adapter]);
  const reuse = async (record: MediaRecord) => {
    setInserting(record.id);
    setError('');
    try {
      await adapter.insertAsset(mediaAsset(record));
      setMessage('Photo added to this board.');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setInserting('');
    }
  };
  const selected = adapter.history.document.items.find(
    (item) => item.id === adapter.selectedIds[0],
  );
  const hasOriginal =
    adapter.selectedIds.length === 1 &&
    (selected?.contentAsset || selected?.asset)?.provider === 'upload';

  const upload = async (files: File[]) => {
    setBusy(true);
    onError('');
    setError('');
    setFailedFiles(null);
    setMessage('Preparing your photos…');
    try {
      await adapter.uploadPhotos(files);
      setMessage(`${files.length} photo${files.length === 1 ? '' : 's'} added.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to add photos.';
      setError(msg);
      setFailedFiles(files);
      setMessage('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="uploads-panel">
      <label
        className={`upload-picker${busy ? ' is-busy' : ''}${dragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy && event.dataTransfer.types.includes('Files')) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragging(false);
          const files = Array.from(event.dataTransfer.files);
          if (!busy && files.length) void upload(files);
        }}
      >
        <span className="upload-picker__icon" aria-hidden="true">
          <UploadIcon />
        </span>
        <span className="upload-picker__copy">
          <strong>{busy ? 'Preparing photos…' : 'Upload photos'}</strong>
          <span>PNG, JPEG or WebP · up to 25 MB each</span>
        </span>
        <span className="upload-picker__button">Browse</span>
        <input
          aria-label="Upload photos"
          disabled={busy}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            if (files.length) void upload(files);
          }}
        />
      </label>

      {message && (
        <p className="panel-inline-status" role="status">
          {message}
        </p>
      )}

      {error && (
        <div className="panel-inline-error" role="alert">
          <p>{error}</p>
          {failedFiles && (
            <Button
              type="button"
              className="gs-button--sm"
              onClick={() => void upload(failedFiles)}
            >
              Try again
            </Button>
          )}
        </div>
      )}

      <section aria-label="Your uploaded photos" className="uploads-library">
        <h3>Your photos</h3>
        <p className="ai-tool-help">Saved in this browser. Reuse on any board.</p>
        {loadingLibrary ? (
          <p role="status">Loading photos...</p>
        ) : !library.length ? (
          <p className="ai-tool-help">Your uploaded photos will appear here.</p>
        ) : (
          <div className="discover-grid">
            {library.map(({ record, url }) => (
              <article className="discover-photo" key={record.id}>
                <Button
                  aria-label={`Add uploaded photo ${record.name} to board`}
                  disabled={busy || Boolean(inserting)}
                  aria-busy={inserting === record.id}
                  onClick={() => void reuse(record)}
                >
                  <img src={url} alt="" loading="lazy" />
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      {hasOriginal && (
        <div className="uploads-panel__actions">
          <Button
            className="panel-secondary-action"
            loading={downloading}
            disabled={busy}
            onClick={() => {
              setDownloading(true);
              void adapter
                .downloadOriginalPhoto()
                .catch((error) => onError(errorMessage(error)))
                .finally(() => setDownloading(false));
            }}
          >
            Download original
          </Button>
        </div>
      )}
    </div>
  );
}
