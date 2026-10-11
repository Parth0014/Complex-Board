import { Button, IconButton } from '../ui/Button';
import { lazy, Suspense, type ReactNode } from 'react';
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

      {tab && (
        <section className="vs-lib__panel" aria-label={`${STUDIO_TAB_LABELS[tab]} panel`}>
          <div className="vs-lib__head">
            <h2 className="vs-lib__title">{STUDIO_TAB_LABELS[tab]}</h2>
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
            {tab === 'templates' ? (
              <TemplatesPanel onApplyTemplate={(template) => adapter.applyTemplate(template)} />
            ) : tab === 'text' ? (
              <TextPanel onInsertText={(preset) => adapter.createTextPreset(preset)} />
            ) : tab === 'uploads' ? (
              <UploadsPanel adapter={adapter} onError={onError} />
            ) : tab === 'create' ? (
              <CreatePanel adapter={adapter} />
            ) : tab === 'ai' ? (
              <Suspense
                fallback={
                  <div className="panel-loading" role="status">
                    Opening AI tools…
                  </div>
                }
              >
                <AIPanel adapter={adapter} />
              </Suspense>
            ) : tab === 'background' ? (
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
