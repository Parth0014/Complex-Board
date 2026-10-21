import { readDuration } from '../ui/motion';
import { Skeleton } from '../ui/Skeleton';
import { Button, IconButton } from '../ui/Button';
import {
  lazy,
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { TemplatesPanel } from '../TemplatesPanel';
import { BackgroundPanel } from '../BackgroundPanel';
import { TextPanel } from '../TextPanel';
import { CloseIcon, TabIcon, ChevronRightIcon } from '../icons';
import { CuratedPanel } from '../CuratedPanel';
import { STUDIO_TAB_LABELS, type StudioTab } from '../studioTypes';
import type { EditorAdapter } from '../../vision/contracts';
import { UploadsPanel } from '../UploadsPanel';
import { CreatePanel } from '../CreatePanel';

const DiscoverPanel = lazy(() =>
  import('../DiscoverPanel').then(({ DiscoverPanel }) => ({ default: DiscoverPanel })),
);
const ADD_TABS: readonly StudioTab[] = ['templates', 'elements', 'uploads', 'text', 'background'];

export function StudioSidebar({
  adapter,
  tab,
  setTab,
  drawingTools,
  showAI = true,
  initialTheme = 'all',
  onError,
  templateMode = false,
}: {
  adapter: EditorAdapter;
  tab: StudioTab | null;
  setTab: (tab: StudioTab | null) => void;
  drawingTools?: ReactNode;
  showAI?: boolean;
  initialTheme?: string;
  onError: (message: string) => void;
  templateMode?: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const rail = useRef<HTMLElement>(null);
  const dragStart = useRef(0);
  const [railEnds, setRailEnds] = useState({ start: true, end: false });
  const updateRail = useCallback(() => {
    const node = rail.current;
    if (node) {
      const start = node.scrollLeft < 2,
        end = node.scrollLeft + node.clientWidth >= node.scrollWidth - 2;
      setRailEnds((current) =>
        current.start === start && current.end === end ? current : { start, end },
      );
    }
  }, []);
  useLayoutEffect(() => {
    const node = rail.current!;
    const observer = new adapter.ownerWindow.ResizeObserver(updateRail);
    observer.observe(node);
    updateRail();
    return () => observer.disconnect();
  }, [adapter, updateRail]);
  const scrollTools = (direction: number) =>
    rail.current?.scrollBy({
      left: direction * Math.max(128, (rail.current?.clientWidth || 390) - 64),
      behavior: adapter.ownerWindow.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
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
      <div className="vs-rail-wrap">
        <nav ref={rail} onScroll={updateRail} className="vs-rail" aria-label="Studio tools">
          <span className="vs-rail__group-label">Add</span>
          {ADD_TABS.filter((id) => !templateMode || id !== 'templates').map((id) => (
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
          {showAI && (
            <Button
              className={`vs-rail__tab vs-rail__tab--ai${tab === 'ai' ? ' is-active' : ''}`}
              data-tip="Discover photos and generate images"
              data-tip-pos="right"
              aria-label="Discover"
              aria-pressed={tab === 'ai'}
              onClick={() => setTab(tab === 'ai' ? null : 'ai')}
            >
              <TabIcon tab="ai" />
              <span>Discover</span>
            </Button>
          )}
          <span className="vs-rail__divider" aria-hidden="true" />
          <span className="vs-rail__group-label">Create</span>
          {drawingTools}
          <Button
            className={'vs-rail__tab' + (tab === 'create' ? ' is-active' : '')}
            aria-label="Create"
            aria-pressed={tab === 'create'}
            data-tip="Shapes and frames"
            onClick={() => setTab(tab === 'create' ? null : 'create')}
          >
            <TabIcon tab="create" />
            <span>Shapes</span>
          </Button>
        </nav>
        <IconButton
          className="vs-tools-scroll vs-tools-scroll--back"
          aria-label="Previous tools"
          disabled={railEnds.start}
          onClick={() => scrollTools(-1)}
        >
          <ChevronRightIcon />
        </IconButton>
        <IconButton
          className="vs-tools-scroll vs-tools-scroll--next"
          aria-label="More tools"
          disabled={railEnds.end}
          onClick={() => scrollTools(1)}
        >
          <ChevronRightIcon />
        </IconButton>
      </div>

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
          <Button
            type="button"
            className="vs-sheet-handle"
            aria-label="Collapse library panel"
            onClick={() => setTab(null)}
            onPointerDown={(event) => {
              dragStart.current = event.clientY;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={(event) => {
              if (event.clientY - dragStart.current > 40) setTab(null);
            }}
          >
            <span />
          </Button>
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
                <DiscoverPanel adapter={adapter} />
              </Suspense>
            ) : visibleTab === 'background' ? (
              <BackgroundPanel adapter={adapter} />
            ) : (
              <CuratedPanel
                key={elementCategory}
                adapter={adapter}
                initialTheme={elementCategory}
                onUploads={() => setTab('uploads')}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
