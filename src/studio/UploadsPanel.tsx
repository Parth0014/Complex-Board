import { useState } from 'react';
import type { StudioAdapter } from '../vision/contracts';
import { ImageIcon, InfoIcon, SparklesIcon, UploadIcon } from './icons';

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
      setMessage(
        `${files.length} photo${files.length === 1 ? '' : 's'} added. Originals are saved on this device.`,
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to add photos.');
      setMessage('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="uploads-panel">
      <div className="panel-intro-card panel-intro-card--photo">
        <span className="panel-intro-card__icon" aria-hidden="true">
          <ImageIcon />
        </span>
        <div>
          <strong>Your photos, your vision</strong>
          <p>Add memories, places and people that make the board feel unmistakably yours.</p>
        </div>
      </div>

      <label className={`upload-picker${busy ? ' is-busy' : ''}`}>
        <span className="upload-picker__icon" aria-hidden="true">
          <UploadIcon />
        </span>
        <span className="upload-picker__copy">
          <strong>{busy ? 'Preparing photos…' : 'Choose photos'}</strong>
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

      <div className="upload-tip">
        <SparklesIcon />
        <p>You can also drag photos straight onto the canvas. Your originals stay on this device.</p>
      </div>

      {message && <p className="panel-inline-status" role="status">{message}</p>}

      <div className="uploads-panel__actions">
        <button
          className="panel-secondary-action"
          disabled={!hasOriginal || busy}
          onClick={() => {
            void adapter.downloadOriginalPhoto().catch((error) => onError(String(error)));
          }}
        >
          Download original photo
        </button>
        <p>Select one uploaded photo on the board to download its untouched original.</p>
      </div>

      <div className="privacy-note">
        <InfoIcon />
        <p>Board backups can carry your photos and edits to another browser when you choose to export one.</p>
      </div>
    </div>
  );
}
