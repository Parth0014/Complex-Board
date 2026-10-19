import { readDuration } from '../ui/motion';
import { Skeleton } from '../ui/Skeleton';
import { Button, IconButton } from '../ui/Button';
import { lazy, Suspense, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { TemplatesPanel } from '../TemplatesPanel';
import { BackgroundPanel } from '../BackgroundPanel';
import { TextPanel } from '../TextPanel';
import { CloseIcon, TabIcon } from '../icons';
import { CuratedPanel } from '../CuratedPanel';
import { STUDIO_TAB_LABELS, type StudioTab } from '../studioTypes';
import type { EditorAdapter } from '../../vision/contracts';
import { UploadsPanel } from '../UploadsPanel';
import { CreatePanel } from '../CreatePanel';

const AIPanel = lazy(() =>
  import('../DiscoverPanel').then(({ DiscoverPanel }) => ({ default: DiscoverPanel })),
);
const ADD_TABS: readonly StudioTab[] = [
  'templates',
  'elements',
  'uploads',
  'text',
  'create',
  'background',
];

export function StudioSidebar({
  adapter,
  tab,
  setTab,
  drawingTools,
  showAI = true,
  initialTheme = 'all',
  onError,
}: {
  adapter: EditorAdapter;
  tab: StudioTab | null;
  setTab: (tab: StudioTab | null) => void;
  drawingTools?: ReactNode;
  showAI?: boolean;
  initialTheme?: string;
  onError: (message: string) => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const elementCategory = initialTheme;
  // Keep the panel and its column mounted until the content fade finishes.
  const [exitingTab, setExitingTab] = useState<StudioTab | null>(null);
  const prevTab = useRef<StudioTab | null>(null);
  useLayoutEffect(() => {
    if (!tab && prevTab.current) {
      const closed = prevTab.current;
      prevTab.current = null;
      if (closed === 'templates') {
        setExitingTab(null);
        return;
      }
      setExitingTab(closed);
      if (adapter.ownerWindow.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setExitingTab(null);
        return;
      }
      const t = adapter.ownerWindow.setTimeout(
        () => setExitingTab(null),
        panelRef.current ? readDuration(panelRef.current) : 0,
      );
      return () => adapter.ownerWindow.clearTimeout(t);
    }
    prevTab.current = tab;
    setExitingTab(null);
  }, [tab, adapter.ownerWindow]);
  const visibleTab = tab ?? exitingTab;
  return (
    <div className={`vs-lib${visibleTab ? '' : ' is-collapsed'}`}>
      <nav className="vs-rail" aria-label="Studio tools">
        {ADD_TABS.map((id) => (
          <Button
            key={id}
            className={`vs-rail__tab${tab === id ? ' is-active' : ''}`}
            data-tip={STUDIO_TAB_LABELS[id]}
            data-tip-pos="right"
            aria-label={STUDIO_TAB_LABELS[id]}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(tab === id ? null : id);
            }}
          >
            <TabIcon tab={id} />
            <span>{STUDIO_TAB_LABELS[id]}</span>
          </Button>
        ))}
        <span className="vs-rail__divider" aria-hidden="true" />
        {drawingTools}
        {showAI && (
          <Button
            className={`vs-rail__tab vs-rail__tab--ai${tab === 'ai' ? ' is-active' : ''}`}
            data-tip="AI — generate images and ideas"
            data-tip-pos="right"
            aria-label="Discover"
            aria-pressed={tab === 'ai'}
            onClick={() => setTab(tab === 'ai' ? null : 'ai')}
          >
            <TabIcon tab="ai" />
            <span>Discover</span>
            <span className="vs-rail__badge" aria-hidden="true" />
          </Button>
        )}
      </nav>

      {visibleTab && (
        <section
          ref={panelRef}
          key={visibleTab}
          data-panel={visibleTab}
          className={`vs-lib__panel${exitingTab ? ' is-exiting' : ''}`}
          aria-label={`${STUDIO_TAB_LABELS[visibleTab]} panel`}
          inert={!!exitingTab}
          aria-hidden={exitingTab ? true : undefined}
        >
          <div className="vs-lib__head">
            <h2 className="vs-lib__title">{STUDIO_TAB_LABELS[visibleTab]}</h2>
            <IconButton
              type="button"
              className="vs-icon-btn"
              data-tip="Close panel"
              aria-label="Close panel"
              onClick={() => setTab(null)}
            >
              <CloseIcon />
            </IconButton>
          </div>
          <div className="vs-lib__body">
            {visibleTab === 'templates' ? (
              <TemplatesPanel
                adapter={adapter}
                onApplyTemplate={(template) => adapter.applyTemplate(template)}
                onClose={() => setTab(null)}
              />
            ) : visibleTab === 'text' ? (
              <TextPanel onInsertText={(preset) => adapter.createTextPreset(preset)} />
            ) : visibleTab === 'uploads' ? (
              <UploadsPanel adapter={adapter} onError={onError} />
            ) : visibleTab === 'create' ? (
              <CreatePanel adapter={adapter} />
            ) : visibleTab === 'ai' ? (
              <Suspense fallback={<Skeleton label="Opening Discover" />}>
                <AIPanel adapter={adapter} />
              </Suspense>
            ) : visibleTab === 'background' ? (
              <BackgroundPanel adapter={adapter} />
            ) : (
              <CuratedPanel
                key={elementCategory}
                adapter={adapter}
                initialTheme={elementCategory}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
