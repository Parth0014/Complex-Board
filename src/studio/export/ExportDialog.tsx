import { useRef, useState } from 'react';
import { Button, IconButton } from '../ui/Button';
import { Dialog, type DialogHandle } from '../ui/Dialog';
import { CloseIcon, DownloadIcon } from '../icons';
import type { EditorAdapter } from '../../vision/contracts';
export function ExportDialog({
  adapter,
  error = '',
  onError,
  onClose,
}: {
  adapter: EditorAdapter;
  error?: string;
  onError: (message: string) => void;
  onClose: () => void;
}) {
  const document = adapter.history.document;
  const [busyId, setBusyId] = useState<string | null>(null);
  const dialogRef = useRef<DialogHandle>(null);
  const options = [
    {
      id: 'png',
      extension: '.png',
      title: 'Original',
      description: `${document.width * 2}\u00d7${document.height * 2} px \u00b7 For larger prints`,
      run: () => adapter.downloadHighResolution(adapter.ownerWindow.document),
    },
    {
      id: '4k',
      extension: '.png',
      title: '4K resolution',
      description: '3840 px long edge \u00b7 Large displays',
      run: () => adapter.exportFormat('4k'),
    },
    {
      id: 'transparent',
      extension: '.png',
      title: 'Transparent PNG',
      description: 'No board background \u00b7 For overlays',
      run: () => adapter.exportFormat('transparent'),
    },
    {
      id: 'jpeg',
      extension: '.jpg',
      title: 'JPEG',
      description: 'Smaller file for easy sharing',
      run: () => adapter.exportFormat('jpeg'),
    },
    {
      id: 'pdf',
      extension: '.pdf',
      title: 'PDF',
      description: 'Single-page document for printing',
      run: () => adapter.exportFormat('pdf'),
    },
  ];
  return (
    <div className="vs-veil">
      <Dialog
        ref={dialogRef}
        className="vs-dialog vs-export-dialog"
        aria-label="Export board"
        onClose={onClose}
      >
        <div className="vs-dialog__head">
          <div>
            <h2>Download board</h2>
            <p className="vs-export-board-name">{document.title}</p>
          </div>
          <IconButton
            className="vs-icon-btn"
            aria-label="Close export"
            onClick={() => dialogRef.current?.requestClose()}
          >
            <CloseIcon />
          </IconButton>
        </div>
        {error && (
          <p role="alert" className="panel-inline-error">
            {error}
          </p>
        )}
        <div className="vs-export-options">
          {options.map((option) => (
            <Button
              className="vs-export-option"
              data-format={option.id}
              key={option.id}
              aria-label={
                option.id === 'png' ? 'Download PNG' : 'Download ' + option.id.toUpperCase()
              }
              loading={busyId === option.id}
              onClick={() => {
                setBusyId(option.id);
                void Promise.resolve()
                  .then(option.run)
                  .catch((error) => onError(String(error)))
                  .finally(() => setBusyId((id) => (id === option.id ? null : id)));
              }}
            >
              <span className="vs-export-extension">{option.extension}</span>
              <span className="vs-export-copy">
                <strong>{option.title}</strong>
                <small>{option.description}</small>
              </span>
              <DownloadIcon />
            </Button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
