import { lazy, Suspense, useState, type ReactNode } from 'react';
import { TemplatesPanel } from './TemplatesPanel';
import { BOARD_SIZES } from './BoardSizeControl';
import { BackgroundPanel } from './BackgroundPanel';
import { TooltipLayer } from './TooltipLayer';
import { TextPanel } from './TextPanel';
import {
  ArrowRightIcon,
  CloseIcon,
  DotsIcon,
  DownloadIcon,
  ExportIcon,
  FileTextIcon,
  HeartIcon,
  InfoIcon,
  PlusIcon,
  PrinterIcon,
  RedoIcon,
  RestoreIcon,
  SaveIcon,
  TabIcon,
  UndoIcon,
  VisionMark,
} from './icons';
import { CuratedPanel } from './CuratedPanel';
import { STUDIO_TAB_LABELS, type StudioTab } from './studioTypes';
import type { EditorAdapter } from '../vision/contracts';
import { useDialogFocus } from './useDialogFocus';
import { UploadsPanel } from './UploadsPanel';
import { CreatePanel } from './CreatePanel';

const AIPanel = lazy(() => import('./AIPanel').then(({ AIPanel }) => ({ default: AIPanel })));
const ADD_TABS: readonly StudioTab[] = [
  'templates',
  'elements',
  'uploads',
  'text',
  'create',
  'background',
];

const PANEL_SUBTITLES: Record<StudioTab, string> = {
  templates: 'Start with structure, then make it yours.',
  elements: 'Symbols, frames and details for your story.',
  text: 'Add words with a voice that feels like you.',
  uploads: 'Add your own photos from this device.',
  create: 'Shapes, cards and complete starting compositions.',
  background: 'Set the tone behind everything else.',
  ai: 'Generate ideas or visual directions without leaving your board.',
};

export function StudioShell({
  adapter,
  children,
  tab,
  setTab,
  drawingTools,
}: {
  adapter: EditorAdapter;
  children: ReactNode;
  tab: StudioTab | null;
  setTab: (tab: StudioTab | null) => void;
  drawingTools?: ReactNode;
}) {
  const [share, setShare] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState('');
  const [elementCategory, setElementCategory] = useState('all');
  const document = adapter.history.document;
  useDialogFocus(adapter.ownerWindow, share || confirmClear, () => {
    setShare(false);
    setConfirmClear(false);
  });
  const hasContent = Boolean(
    document.items.length ||
    document.background ||
    document.pages?.some((page) => page.items.length || page.background),
  );
  return (
    <div className="vs">
      <TooltipLayer ownerWindow={adapter.ownerWindow} />
      <header className="vs-header vs-dark">
        <div className="vs-brand">
          <VisionMark />
          <span className="vs-brand__name">
            Vision <strong>Studio</strong>
          </span>
        </div>

        <div className="vs-title">
          <input
            className="vs-title__input"
            aria-label="Board name"
            value={document.title}
            maxLength={80}
            onChange={(event) => adapter.commit({ ...document, title: event.target.value })}
          />
          <span className="vs-save" role="status" aria-live="polite">
            <span className="vs-save__dot" aria-hidden="true" />
            <span>{adapter.saveStatus}</span>
          </span>
        </div>

        <div className="vs-header__spacer" />

        <div className="vs-history" role="group" aria-label="History">
          <button
            className="vs-icon-btn"
            data-tip="Undo (Ctrl+Z)"
            data-tip-pos="below"
            aria-label="Undo"
            disabled={!adapter.history.canUndo}
            onClick={() => adapter.undo()}
          >
            <UndoIcon />
          </button>
          <button
            className="vs-icon-btn"
            data-tip="Redo (Ctrl+Shift+Z)"
            data-tip-pos="below"
            aria-label="Redo"
            disabled={!adapter.history.canRedo}
            onClick={() => adapter.redo()}
          >
            <RedoIcon />
          </button>
        </div>

        <button
          className="vs-btn vs-btn--ghost"
          data-tip="Start a new board"
          data-tip-pos="below"
          disabled={!document.items.length}
          onClick={() => setConfirmClear(true)}
        >
          <PlusIcon />
          <span>New</span>
        </button>
        <button
          className="vs-btn vs-btn--primary"
          data-tip="Export or share your board"
          data-tip-pos="below"
          onClick={() => {
            setError('');
            setShare(true);
          }}
          disabled={!hasContent}
        >
          <ExportIcon />
          <span>Share</span>
        </button>

        <details className="vs-menu">
          <summary
            className="vs-file-btn"
            data-tip="Board file options"
            data-tip-pos="below"
            aria-label="File menu"
          >
            <span>File</span>
          </summary>
          <div className="vs-menu__pop vs-menu__pop--below-right">
            <p className="vs-menu__kicker">Board file</p>
            <button
              className="vs-menu__item"

              onClick={() => {
                void adapter.backup().catch((error) => setError(String(error)));
              }}
            >
              <SaveIcon />
              <span>Save backup</span>
            </button>
            <label className="vs-menu__item">
              <RestoreIcon />
              <span>Restore backup</span>
              <input
                aria-label="Restore backup"
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file)
                    try {
                      if (file.size > 180 * 1024 * 1024)
                        throw new Error('Backup is too large (maximum 180 MB).');
                      await adapter.restore(await file.text());
                      setError('');
                    } catch (error) {
                      setError(String(error));
                    }
                  event.target.value = '';
                }}
              />
            </label>
            <div className="vs-menu__divider" />
            <p className="vs-menu__kicker">Canvas</p>
            <label className="vs-menu__row">
              <span>Page size</span>
              <select
                className="vs-select"
                aria-label="Page size"
                value={`${document.width}x${document.height}`}
                onChange={(event) => {
                  const [width, height] = event.target.value.split('x').map(Number);
                  adapter.commit({ ...document, width, height });
                  adapter.fitBoard();
                }}
              >
                {!BOARD_SIZES.some(
                  ([value]) => value === `${document.width}x${document.height}`,
                ) && (
                  <option value={`${document.width}x${document.height}`} disabled hidden>
                    Current board
                  </option>
                )}
                {BOARD_SIZES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p className="vs-menu__note">Your board is saved locally as you work.</p>
          </div>
        </details>
      </header>

      <div className="vs-body">
        {error && !share && (
          <div className="vs-error" role="alert">
            <div className="vs-alert vs-alert--error">
              <InfoIcon />
              <span>{error}</span>
              <button onClick={() => setError('')}>Dismiss</button>
            </div>
          </div>
        )}

        <div className={`vs-lib${tab ? '' : ' is-collapsed'}`}>
          <nav className="vs-rail" aria-label="Studio tools">
            {ADD_TABS.map((id) => (
              <button
                key={id}
                className={`vs-rail__tab${tab === id ? ' is-active' : ''}`}
                data-tip={STUDIO_TAB_LABELS[id]}
                data-tip-pos="right"
                aria-label={STUDIO_TAB_LABELS[id]}
                aria-pressed={tab === id}
                onClick={() => {
                  if (id === 'elements') setElementCategory('all');
                  setTab(tab === id ? null : id);
                }}
              >
                <TabIcon tab={id} />
                <span>{STUDIO_TAB_LABELS[id]}</span>
              </button>
            ))}
            <span className="vs-rail__divider" aria-hidden="true" />
            {drawingTools}
            <button
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
            </button>
          </nav>

          {tab && (
            <section className="vs-lib__panel" aria-label={`${STUDIO_TAB_LABELS[tab]} panel`}>
              <div className="vs-lib__head">
                <div className="vs-sec-head" style={{ marginBottom: 0 }}>
                  <span className="vs-eyebrow">
                    {tab === 'ai' ? 'Smart tools' : 'Add to board'}
                  </span>
                  <h3>{STUDIO_TAB_LABELS[tab]}</h3>
                  <p>{PANEL_SUBTITLES[tab]}</p>
                </div>
                <button
                  type="button"
                  className="vs-icon-btn"
                  data-tip="Close panel"
                  aria-label="Close panel"
                  onClick={() => setTab(null)}
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="vs-lib__body">
                {tab === 'templates' ? (
                  <TemplatesPanel onApplyTemplate={(template) => adapter.applyTemplate(template)} />
                ) : tab === 'text' ? (
                  <TextPanel onInsertText={(preset) => adapter.createTextPreset(preset)} />
                ) : tab === 'uploads' ? (
                  <UploadsPanel adapter={adapter} onError={setError} />
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
                  <BackgroundPanel
                    adapter={adapter}
                    onBrowseSurfaces={() => {
                      setElementCategory('textures');
                      setTab('elements');
                    }}
                  />
                ) : (
                  <CuratedPanel
                    key={elementCategory}
                    initialCategory={elementCategory}
                    ownerWindow={adapter.ownerWindow}
                    onInsert={(asset) => adapter.insertAsset(asset)}
                  />
                )}
              </div>
              <div className="vs-lib__foot">
                <HeartIcon />
                <span>Made for your next chapter.</span>
              </div>
            </section>
          )}
        </div>

        <main className="vs-canvas" aria-label="Vision board canvas">
          {children}
        </main>
      </div>

      {confirmClear && (
        <div className="vs-veil">
          <div
            className="vs-dialog vs-confirm"
            role="dialog"
            aria-modal="true"
            aria-label="Clear board"
          >
            <span className="vs-confirm__icon" aria-hidden="true">
              <DotsIcon />
            </span>
            <h2>Start fresh?</h2>
            <p>This clears the items on your board. You can undo the change right after.</p>
            <div className="vs-dialog__actions">
              <button className="vs-btn vs-btn--light" onClick={() => setConfirmClear(false)}>
                Keep board
              </button>
              <button
                className="vs-btn vs-btn--primary"
                style={{ background: 'var(--vs-danger)' }}
                onClick={() => {
                  adapter.clearBoard();
                  setConfirmClear(false);
                }}
              >
                Clear board
              </button>
            </div>
          </div>
        </div>
      )}

      {share && (
        <div
          className="vs-veil"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShare(false);
          }}
        >
          <div className="vs-dialog" role="dialog" aria-modal="true" aria-label="Export board">
            <div className="vs-dialog__head">
              <div>
                <span className="vs-eyebrow">Take your vision with you</span>
                <h2>Export your board</h2>
                <p>{document.title || 'My vision board'}</p>
              </div>
              <button
                className="vs-icon-btn"
                data-tip="Close export"
                aria-label="Close export"
                onClick={() => setShare(false)}
              >
                <CloseIcon />
              </button>
            </div>
            {error && (
              <p className="vs-alert vs-alert--error" role="alert" style={{ marginTop: 10 }}>
                <InfoIcon />
                <span>{error}</span>
              </p>
            )}

            <section className="vs-export__group" aria-labelledby="export-recommended">
              <div className="vs-export__label">
                <h3 id="export-recommended">Recommended</h3>
                <span>Best for sharing</span>
              </div>
              <div className="vs-export__featured">
                <button
                  className="vs-export__card"
                  aria-label="Download PNG"
                  onClick={() => {
                    try {
                      adapter.exportImage();
                    } catch (error) {
                      setError(String(error));
                    }
                  }}
                >
                  <span className="vs-export__badge" aria-hidden="true">
                    PNG
                  </span>
                  <span>
                    <strong>Download PNG</strong>
                    <small>
                      {document.width} × {document.height} px · Original size
                    </small>
                  </span>
                  <DownloadIcon />
                </button>
                <button
                  className="vs-export__card"
                  aria-label="Download 2× PNG"
                  onClick={() => {
                    void adapter
                      .downloadHighResolution(adapter.ownerWindow.document)
                      .catch((error) => setError(String(error)));
                  }}
                >
                  <span className="vs-export__badge" aria-hidden="true">
                    2×
                  </span>
                  <span>
                    <strong>Download 2× PNG</strong>
                    <small>Extra detail for print and large screens</small>
                  </span>
                  <DownloadIcon />
                </button>
              </div>
            </section>

            <section className="vs-export__group" aria-labelledby="export-more">
              <div className="vs-export__label">
                <h3 id="export-more">More formats</h3>
                <span>Choose what fits your next step</span>
              </div>
              <div className="vs-export__grid">
                {(['jpeg', 'transparent', 'pdf', '4k', 'pdf-all'] as const).map((format) => (
                  <button
                    className="vs-export__mini"
                    key={format}
                    aria-label={`Download ${format.toUpperCase()}`}
                    onClick={() => {
                      void adapter.exportFormat(format).catch((error) => setError(String(error)));
                    }}
                  >
                    <DownloadIcon />
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </section>

            <section className="vs-export__group" aria-label="Export utilities">
              <div className="vs-export__utils">
                <button
                  className="vs-export__util"
                  aria-label="Download asset credits"
                  onClick={() => adapter.downloadAttributions(adapter.ownerWindow.document)}
                >
                  <FileTextIcon />
                  <span>
                    <strong>Asset credits</strong>
                    <small>Source and license details</small>
                  </span>
                </button>
                <button
                  className="vs-export__util"
                  onClick={() => {
                    void adapter
                      .printBoard(adapter.ownerWindow.document)
                      .catch((error) => setError(String(error)));
                  }}
                >
                  <PrinterIcon />
                  <span>
                    <strong>Print current page</strong>
                    <small>Open your device print dialog</small>
                  </span>
                </button>
              </div>
            </section>

            <p className="vs-export__privacy">
              <InfoIcon />
              <span>
                Boards stay in this browser. AI requests only use your configured service.
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
