import { Button } from './ui/Button';
import { useState } from 'react';
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
                .catch((error) => onError(String(error)))
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
