import { StudioHeader } from './chrome/StudioHeader';
import { ExportDialog } from './export/ExportDialog';
import { Toast } from './ui/Toast';
import { useCallback, useState, type ReactNode } from 'react';
import type { StudioTab } from './studioTypes';
import type { EditorAdapter } from '../vision/contracts';
import { useAIStatus } from './useAIStatus';
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
  const [share, setShare] = useState(false);
  const [error, setError] = useState('');
  const dismissError = useCallback(() => setError(''), []);
  const [elementCategory] = useState(adapter.history.document.boardTheme || 'all');
  const { status: aiStatus } = useAIStatus(adapter.ownerWindow);
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
          showAI={Boolean(aiStatus?.configured)}
          initialTheme={elementCategory}
          onError={setError}
        />

        <main className="vs-canvas" aria-label="Vision board canvas">
          {children}
        </main>
      </div>
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
