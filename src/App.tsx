import './studio/design-system/index.css';
import { useEffect, useState } from 'react';
import { loadBoard } from './vision/storage';
import { KonvaCanvasAdapter } from './vision/canvas/KonvaCanvasAdapter';
import { HomePage } from './studio/HomePage';
import { Editor } from './editor/Editor';
import type { StudioTab } from './studio/studioTypes';
import { AppUpdateNotice } from './studio/AppUpdateNotice';

export default function App() {
  const [adapter, setAdapter] = useState<KonvaCanvasAdapter>();
  const [initialTab, setInitialTab] = useState<StudioTab | null>(null);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(() =>
    new URL(window.location.href).searchParams.has('board'),
  );
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get('board');
    if (!id) {
      setOpening(false);
      return;
    }
    let active = true;
    void (async () => {
      try {
        if (!(await loadBoard(window, id))) throw new Error('This board could not be found.');
        const restored = new KonvaCanvasAdapter(window, id);
        await restored.initialize();
        if (restored.saveStatus.startsWith('Save failed')) throw new Error(restored.saveStatus);
        if (active) {
          setInitialTab(null);
          setAdapter(restored);
        }
      } catch (error) {
        if (active) {
          setError(error instanceof Error ? error.message : 'Unable to open board.');
          const url = new URL(window.location.href);
          url.searchParams.delete('board');
          window.history.replaceState(null, '', url);
        }
      } finally {
        if (active) setOpening(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="vs-root">
      <AppUpdateNotice save={() => (adapter ? adapter.flushSave() : Promise.resolve())} />
      {opening ? (
        <p role="status">Opening your board…</p>
      ) : adapter ? (
        <Editor
          adapter={adapter}
          initialTab={initialTab}
          onHome={() => {
            void adapter
              .flushSave()
              .then(() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('board');
                window.history.replaceState(null, '', url);
                setAdapter(undefined);
              })
              .catch(() => setError('Your board could not be saved. Please try again.'));
          }}
        />
      ) : (
        <HomePage
          onOpen={async (id, isNew) => {
            const nextAdapter = new KonvaCanvasAdapter(window, id);
            await nextAdapter.initialize();
            if (nextAdapter.saveStatus.startsWith('Save failed'))
              throw new Error(nextAdapter.saveStatus);
            const url = new URL(window.location.href);
            url.searchParams.set('board', nextAdapter.boardId);
            window.history.replaceState(null, '', url);
            setInitialTab(isNew ? 'elements' : null);
            setAdapter(nextAdapter);
          }}
        />
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
