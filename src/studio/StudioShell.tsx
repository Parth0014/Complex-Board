import { BoardPreview } from './BoardPreview';
import { StudioHeader } from './chrome/StudioHeader';
import { ExportDialog } from './export/ExportDialog';
import { Toast } from './ui/Toast';
import { useCallback, useState, type ReactNode } from 'react';
import type { StudioTab } from './studioTypes';
import type { EditorAdapter } from '../vision/contracts';
import { StudioSidebar } from './chrome/StudioSidebar';

export function StudioShell({
  adapter,
  children,
  tab,
  setTab,
  drawingTools,
  onHome,
}: {
  adapter: EditorAdapter;
  children: ReactNode;
  tab: StudioTab | null;
  setTab: (tab: StudioTab | null) => void;
  drawingTools?: ReactNode;
  onHome: () => void;
}) {
  const [preview, setPreview] = useState('');
  const [share, setShare] = useState(false);
  const [error, setError] = useState('');
  const dismissError = useCallback(() => setError(''), []);
  const [elementCategory] = useState(adapter.history.document.boardTheme || 'all');
  const document = adapter.history.document;
  const hasContent = Boolean(
    document.items.length ||
    document.background ||
    document.pages?.some((page) => page.items.length || page.background),
  );
  return (
    <div className="vs">
      <StudioHeader
        adapter={adapter}
        onHome={onHome}
        onError={setError}
        shareDisabled={!hasContent}
        onPreview={() => {
          try {
            setPreview(adapter.previewBoard());
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Preview could not be opened.');
          }
        }}
        onShare={() => {
          setError('');
          setShare(true);
        }}
      />

      {error && !share && <Toast message={error} error onDismiss={dismissError} />}
      <div className="vs-body">
        <StudioSidebar
          adapter={adapter}
          tab={tab}
          setTab={setTab}
          drawingTools={drawingTools}
          showAI
          initialTheme={elementCategory}
          onError={setError}
        />

        <main className="vs-canvas" aria-label="Vision board canvas">
          {children}
          <div className="discover-credits" aria-label="Photo credits">
            {document.items
              .filter(
                (item) =>
                  item.kind === 'asset' && item.asset?.provider === 'unsplash' && !item.hidden,
              )
              .map(
                (item) =>
                  item.kind === 'asset' && (
                    <span key={item.id}>
                      Photo by{' '}
                      <a
                        href={item.asset!.license.authorUrl || item.asset!.license.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.asset!.license.author}
                      </a>{' '}
                      on{' '}
                      <a
                        href="https://unsplash.com/?utm_source=visbo&utm_medium=referral"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Unsplash
                      </a>
                    </span>
                  ),
              )}
          </div>
        </main>
      </div>
      {preview && <BoardPreview adapter={adapter} image={preview} onClose={() => setPreview('')} />}
      {share && (
        <ExportDialog
          adapter={adapter}
          error={error}
          onError={setError}
          onClose={() => setShare(false)}
        />
      )}
    </div>
  );
}
