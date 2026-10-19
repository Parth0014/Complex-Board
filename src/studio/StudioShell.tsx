import { CanvasIntroduction } from './CanvasIntroduction';
import { ShortcutsDialog } from './ShortcutsDialog';
import { BoardPreview } from './BoardPreview';
import { StudioHeader } from './chrome/StudioHeader';
import { ExportDialog } from './export/ExportDialog';
import { Toast } from './ui/Toast';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { StudioTab } from './studioTypes';
import type { EditorAdapter } from '../vision/contracts';
import { StudioSidebar } from './chrome/StudioSidebar';
import { compactScreen } from './ui/breakpoints';

const INTRO_DISMISSED_KEY = 'visbo:canvas-introduction-dismissed';

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
  const [preview, setPreview] = useState(false);
  const restoreMobileActionFocus = () => {
    if (adapter.ownerWindow.matchMedia(compactScreen).matches)
      adapter.ownerWindow.requestAnimationFrame(() =>
        adapter.ownerWindow.document
          .querySelector<HTMLButtonElement>('button[aria-label="File menu"]')
          ?.focus(),
      );
  };
  const [shortcuts, setShortcuts] = useState(false);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        !(event.key === '?' || ((event.ctrlKey || event.metaKey) && event.key === '/')) ||
        event.altKey ||
        target.isContentEditable ||
        target.closest('input,textarea,select,[role="dialog"]')
      )
        return;
      event.preventDefault();
      setShortcuts(true);
    };
    adapter.ownerWindow.document.addEventListener('keydown', key);
    return () => adapter.ownerWindow.document.removeEventListener('keydown', key);
  }, [adapter]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    try {
      return adapter.ownerWindow.localStorage.getItem(INTRO_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const dismissIntroduction = () => {
    setOnboardingDismissed(true);
    try {
      adapter.ownerWindow.localStorage.setItem(INTRO_DISMISSED_KEY, '1');
    } catch {
      /* A blocked preference store must not prevent dismissal. */
    }
  };
  const [exportOpen, setExportOpen] = useState(false);
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
        onShortcuts={() => setShortcuts(true)}
        onError={setError}
        exportDisabled={!hasContent}
        onPreview={() => setPreview(true)}
        onExport={() => {
          setError('');
          setExportOpen(true);
        }}
      />

      {error && !exportOpen && <Toast message={error} error onDismiss={dismissError} />}
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
          {!hasContent && !onboardingDismissed && (
            <CanvasIntroduction
              width={document.width}
              height={document.height}
              onDismiss={dismissIntroduction}
              onPhotos={() => {
                dismissIntroduction();
                setTab('uploads');
              }}
              onTemplates={() => {
                dismissIntroduction();
                setTab('templates');
              }}
            />
          )}
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
      {preview && (
        <BoardPreview
          adapter={adapter}
          onClose={() => {
            setPreview(false);
            restoreMobileActionFocus();
          }}
        />
      )}
      {shortcuts && (
        <ShortcutsDialog ownerWindow={adapter.ownerWindow} onClose={() => setShortcuts(false)} />
      )}
      {exportOpen && (
        <ExportDialog
          adapter={adapter}
          error={error}
          onError={setError}
          onClose={() => {
            setExportOpen(false);
            restoreMobileActionFocus();
          }}
        />
      )}
    </div>
  );
}
