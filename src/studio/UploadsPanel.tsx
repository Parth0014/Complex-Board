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
    [message, setMessage] = useState('');
  const selected = adapter.history.document.items.find(
    (item) => item.id === adapter.selectedIds[0],
  );
  const hasOriginal =
    adapter.selectedIds.length === 1 &&
    (selected?.contentAsset || selected?.asset)?.provider === 'upload';

  const upload = async (files: File[]) => {
    setBusy(true);
    onError('');
    setMessage('Preparing your photos…');
    try {
      await adapter.uploadPhotos(files);
      setMessage(`${files.length} photo${files.length === 1 ? '' : 's'} added.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to add photos.');
      setMessage('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="uploads-panel">
      <label className={`upload-picker${busy ? ' is-busy' : ''}`}>
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

      {hasOriginal && (
        <div className="uploads-panel__actions">
          <button
            className="panel-secondary-action"
            disabled={busy}
            onClick={() => {
              void adapter.downloadOriginalPhoto().catch((error) => onError(String(error)));
            }}
          >
            Download original
          </button>
        </div>
      )}
    </div>
  );
}
