import { useEffect, useRef, useState } from 'react';
import type { EditorAdapter } from '../vision/contracts';
import { requestAI } from '../vision/aiClient';
import { AIPanel } from './AIPanel';
import { Button } from './ui/Button';
import { errorMessage } from './errors';
import { startCanvasDrag } from './canvasDrag';
type Photo = {
  id: string;
  provider: string;
  title: string;
  thumb: string;
  author: string;
  authorUrl: string;
  source: string;
  token: string;
};
export function DiscoverPanel({ adapter }: { adapter: EditorAdapter }) {
  const [mode, setMode] = useState('photos');
  const cursors = useRef<Record<string, { page: number; more: boolean }>>({});
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [items, setItems] = useState<Photo[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState<Record<string, boolean> | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    let live = true;
    requestAI(adapter.ownerWindow, '/api/images/status')
      .then((value) => {
        if (live) setStatus(value);
      })
      .catch(() => {});
    return () => {
      live = false;
      controller.current?.abort();
    };
  }, [adapter]);
  async function search(next = 1, term = query) {
    controller.current?.abort();
    const request = new adapter.ownerWindow.AbortController();
    controller.current = request;
    setBusy(true);
    setError('');
    setNotice('');
    if (next === 1) {
      setItems([]);
      setSearched(term);
      setPage(0);
      setMore(false);
    }
    try {
      const providers = ['unsplash'].filter(
        (id) => status?.[id] !== false && (next === 1 || cursors.current[id]?.more),
      );
      if (!providers.length)
        throw new Error('Photo search is not connected yet. Add the image API keys on the server.');
      if (next === 1) cursors.current = {};
      const results = await Promise.allSettled(
        providers.map(async (provider) => {
          const providerPage = (cursors.current[provider]?.page || 0) + 1;
          const value = await requestAI(
            adapter.ownerWindow,
            `/api/images/search?${new URLSearchParams({ provider, q: term, page: String(providerPage) })}`,
            { signal: request.signal },
          );
          return { provider, providerPage, value };
        }),
      );
      if (request.signal.aborted) return;
      const batches: Photo[][] = [];
      let failures = 0;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          const { provider, providerPage, value } = result.value;
          cursors.current[provider] = { page: providerPage, more: value.hasMore };
          batches.push(value.items);
        } else {
          failures++;
          cursors.current[providers[i]] ??= { page: 0, more: true };
        }
      }
      if (failures === providers.length)
        throw new Error(
          'Photo search is unavailable. Check the image API connection and try again.',
        );
      const combined: Photo[] = [];
      for (let i = 0; i < Math.max(0, ...batches.map((batch) => batch.length)); i++)
        for (const batch of batches) if (batch[i]) combined.push(batch[i]);
      setItems((old) => {
        const previous = next === 1 ? [] : old;
        const seen = new Set(previous.map((item) => `${item.provider}:${item.id}`));
        return [
          ...previous,
          ...combined.filter((item) => {
            const key = `${item.provider}:${item.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }),
        ];
      });
      setPage(next);
      setMore(Object.values(cursors.current).some((cursor) => cursor.more));
      if (failures) setNotice('Some photos could not be loaded. Load more to try again.');
    } catch (e) {
      if (!request.signal.aborted) setError(errorMessage(e));
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  async function insert(item: Photo) {
    setAdding(`${item.provider}:${item.id}`);
    setError('');
    setNotice('');
    try {
      const asset = await requestAI(adapter.ownerWindow, '/api/images/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: item.token }),
      });
      await adapter.insertAsset(asset);
      setNotice('Image added to your board.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAdding('');
    }
  }
  return (
    <div className="discover-panel">
      <div className="discover-tabs" role="group" aria-label="Discover tools">
        {['photos', 'generate'].map((id) => (
          <Button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>
            {id === 'photos' ? 'Photos' : 'Generate'}
          </Button>
        ))}
      </div>
      {mode === 'generate' ? (
        <AIPanel adapter={adapter} />
      ) : (
        <>
          <form
            className="discover-search"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <input
              className="vs-input"
              aria-label="Search photos"
              placeholder="Search photos"
              maxLength={100}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" disabled={!query.trim() || busy}>
              Search
            </Button>
          </form>
          {error && (
            <p className="panel-inline-error" role="alert">
              {error}
            </p>
          )}
          <p className="ai-tool-help" role="status">
            {busy
              ? 'Searching photos...'
              : adding
                ? 'Adding image...'
                : notice ||
                  (page && !items.length
                    ? 'No photos found. Try another search.'
                    : searched
                      ? `Results for ${searched}`
                      : 'Search to explore photos.')}
          </p>
          <a
            className="discover-source"
            href="https://unsplash.com/?utm_source=visbo&utm_medium=referral"
            target="_blank"
            rel="noreferrer"
          >
            Photos from Unsplash
          </a>
          <div className="discover-grid">
            {items.map((item) => (
              <article className="discover-photo" key={`${item.provider}:${item.id}`}>
                <Button
                  type="button"
                  disabled={Boolean(adding)}
                  draggable
                  onDragStart={(event) =>
                    startCanvasDrag(event, 'application/x-visbo-photo', item.token)
                  }
                  aria-label={`Add ${item.title} to board`}
                  onClick={() => void insert(item)}
                >
                  <img src={item.thumb} alt="" loading="lazy" draggable={false} />
                </Button>
              </article>
            ))}
          </div>
          {more && (
            <Button
              disabled={busy || Boolean(adding)}
              onClick={() => void search(page + 1, searched)}
            >
              Load more
            </Button>
          )}
        </>
      )}
    </div>
  );
}
