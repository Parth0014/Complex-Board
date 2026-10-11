import { Skeleton } from '../ui/Skeleton';
import { Button, IconButton } from '../ui/Button';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { TemplatesPanel } from '../TemplatesPanel';
import { BackgroundPanel } from '../BackgroundPanel';
import { TextPanel } from '../TextPanel';
import { CloseIcon, TabIcon } from '../icons';
import { CuratedPanel } from '../CuratedPanel';
import { STUDIO_TAB_LABELS, type StudioTab } from '../studioTypes';
import type { EditorAdapter } from '../../vision/contracts';
import { UploadsPanel } from '../UploadsPanel';
import { CreatePanel } from '../CreatePanel';

const AIPanel = lazy(() => import('../AIPanel').then(({ AIPanel }) => ({ default: AIPanel })));
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
  showAI = false,
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
  const elementCategory = initialTheme;
  const [retainedTab, setRetainedTab] = useState(tab);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    if (tab) {
      setRetainedTab(tab);
      return;
    }
    const timer = setTimeout(
      () => setRetainedTab(null),
      keyboard || adapter.ownerWindow.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 120,
    );
    return () => clearTimeout(timer);
  }, [tab, keyboard, adapter.ownerWindow]);
  const panelTab = tab ?? retainedTab;
  return (
    <div className={`vs-lib${tab ? '' : ' is-collapsed'}`}>
      <nav className="vs-rail" aria-label="Studio tools">
        {ADD_TABS.map((id) => (
          <Button
            key={id}
            className={`vs-rail__tab${tab === id ? ' is-active' : ''}`}
            data-tip={STUDIO_TAB_LABELS[id]}
            data-tip-pos="right"
            aria-label={STUDIO_TAB_LABELS[id]}
            aria-pressed={tab === id}
            onClick={(event) => {
              setKeyboard(event.detail === 0);
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
            aria-label="AI"
            aria-pressed={tab === 'ai'}
            onClick={() => setTab(tab === 'ai' ? null : 'ai')}
          >
            <TabIcon tab="ai" />
            <span>AI</span>
            <span className="vs-rail__badge" aria-hidden="true" />
          </Button>
        )}
      </nav>

      {panelTab && (
        <section
          className="vs-lib__panel"
          data-motion={keyboard ? 'keyboard' : tab ? 'enter' : 'exit'}
          inert={!tab}
          aria-label={`${STUDIO_TAB_LABELS[panelTab]} panel`}
        >
          <div className="vs-lib__head">
            <h2 className="vs-lib__title">{STUDIO_TAB_LABELS[panelTab]}</h2>
            <IconButton
              type="button"
              className="vs-icon-btn"
              data-tip="Close panel"
              aria-label="Close panel"
              onClick={(event) => {
                setKeyboard(event.detail === 0);
                setTab(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </div>
          <div className="vs-lib__body">
            {panelTab === 'templates' ? (
              <TemplatesPanel onApplyTemplate={(template) => adapter.applyTemplate(template)} />
            ) : panelTab === 'text' ? (
              <TextPanel onInsertText={(preset) => adapter.createTextPreset(preset)} />
            ) : panelTab === 'uploads' ? (
              <UploadsPanel adapter={adapter} onError={onError} />
            ) : panelTab === 'create' ? (
              <CreatePanel adapter={adapter} />
            ) : panelTab === 'ai' ? (
              <Suspense fallback={<Skeleton label="Opening AI tools" />}>
                <AIPanel adapter={adapter} />
              </Suspense>
            ) : panelTab === 'background' ? (
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
