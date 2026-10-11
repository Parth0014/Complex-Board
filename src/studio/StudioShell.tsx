import { StudioHeader } from './chrome/StudioHeader';
import { ExportDialog } from './export/ExportDialog';
import { Button } from './ui/Button';
import { useState, type ReactNode } from 'react';
import { InfoIcon } from './icons';
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

      {error && !share && (
        <div className="vs-error" role="alert">
          <div className="vs-alert vs-alert--error">
            <InfoIcon />
            <span>{error}</span>
            <Button onClick={() => setError('')}>Dismiss</Button>
          </div>
        </div>
      )}
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
