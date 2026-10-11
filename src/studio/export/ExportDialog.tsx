import { Button, IconButton } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { CloseIcon, DownloadIcon, FileTextIcon, PrinterIcon, InfoIcon } from '../icons';
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
  return (
    <div className="vs-veil">
      <Dialog className="vs-dialog" aria-label="Export board" onClose={onClose}>
        <div className="vs-dialog__head">
          <h2>Export your board</h2>
          <IconButton className="vs-icon-btn" aria-label="Close export" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        {error && (
          <p role="alert" className="panel-inline-error">
            {error}
          </p>
        )}
        <section className="vs-export__group">
          <div className="vs-export__label">
            <h3>Recommended</h3>
            <span>Best for sharing</span>
          </div>
          <div className="vs-export__featured">
            <Button
              className="vs-export__card"
              aria-label="Download PNG"
              onClick={() => {
                try {
                  adapter.exportImage();
                } catch (error) {
                  onError(String(error));
                }
              }}
            >
              <span className="vs-export__badge">PNG</span>
              <span>
                <strong>Download PNG</strong>
                <small>
                  {document.width} × {document.height} px · Original size
                </small>
              </span>
              <DownloadIcon />
            </Button>
            <Button
              className="vs-export__card"
              aria-label="Download 2× PNG"
              onClick={() => {
                void adapter
                  .downloadHighResolution(adapter.ownerWindow.document)
                  .catch((error) => onError(String(error)));
              }}
            >
              <span className="vs-export__badge">2×</span>
              <span>
                <strong>Download 2× PNG</strong>
                <small>Extra detail for print and large screens</small>
              </span>
              <DownloadIcon />
            </Button>
          </div>
        </section>
        <section className="vs-export__group">
          <div className="vs-export__label">
            <h3>More formats</h3>
          </div>
          <div className="vs-export__grid">
            {(['jpeg', 'transparent', 'pdf', '4k'] as const).map((format) => (
              <Button
                className="vs-export__mini"
                key={format}
                aria-label={'Download ' + format.toUpperCase()}
                onClick={() => {
                  void adapter.exportFormat(format).catch((error) => onError(String(error)));
                }}
              >
                <DownloadIcon />
                {format.toUpperCase()}
              </Button>
            ))}
          </div>
        </section>
        <section className="vs-export__group">
          <div className="vs-export__utils">
            <Button
              className="vs-export__util"
              aria-label="Download asset credits"
              onClick={() => adapter.downloadAttributions(adapter.ownerWindow.document)}
            >
              <FileTextIcon />
              <span>
                <strong>Asset credits</strong>
                <small>Source and license details</small>
              </span>
            </Button>
            <Button
              className="vs-export__util"
              onClick={() => {
                void adapter
                  .printBoard(adapter.ownerWindow.document)
                  .catch((error) => onError(String(error)));
              }}
            >
              <PrinterIcon />
              <span>
                <strong>Print board</strong>
                <small>Open your device print dialog</small>
              </span>
            </Button>
          </div>
        </section>
        <p className="vs-export__privacy">
          <InfoIcon />
          <span>Boards stay in this browser. AI requests only use your configured service.</span>
        </p>
      </Dialog>
    </div>
  );
}
