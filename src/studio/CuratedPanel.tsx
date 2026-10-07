import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import manifest from '../../public/curated-v1/manifest.json';
import { curatedPackProvider } from '../assets/curatedPack';
import type { GratitudeAsset } from '../assets/contracts';
import { GRATITUDE_ASSET_DRAG_TYPE } from '../assets/contracts';
import { SearchIcon } from './icons';

export function CuratedPanel({
  ownerWindow,
  onInsert,
  initialCategory = 'all',
}: {
  ownerWindow: Window & typeof globalThis;
  onInsert: (asset: GratitudeAsset) => Promise<unknown>;
  initialCategory?: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const [assets, setAssets] = useState<GratitudeAsset[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setError('');
    void curatedPackProvider
      .search({ search: deferredQuery, limit: 250 }, ownerWindow)
      .then((page) => {
        if (active) setAssets(page.items);
      })
      .catch((error) => {
        if (active) setError(String(error));
      });
    return () => {
      active = false;
    };
  }, [ownerWindow, deferredQuery]);

  const ids = useMemo(
    () =>
      new Set(
        manifest.assets
          .filter((asset) => category === 'all' || asset.category === category)
          .map((asset) => asset.id),
      ),
    [category],
  );
  const visibleAssets = useMemo(() => assets.filter((asset) => ids.has(asset.id)), [assets, ids]);
  const selectedCategory =
    category === 'all'
      ? 'All assets'
      : manifest.categories.find((item) => item.id === category)?.label;

  return (
    <div className="elements-panel">
      <div className="elements-panel__filters">
        <label className="elements-panel__search">
          <span>Search library</span>
          <span className="search-field">
            <SearchIcon />
            <input
              className="vs-input"
              aria-label="Search assets"
              value={query}
              placeholder="Growth, gratitude, travel…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
        </label>
        <label>
          <span>Category</span>
          <select
            className="vs-select"
            aria-label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All 250 assets</option>
            {manifest.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label} · {category.count}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="asset-results-meta" role="status" aria-live="polite">
        <span>{selectedCategory}</span>
        <span>{visibleAssets.length} results</span>
      </div>
      {error && (
        <p className="panel-inline-error" role="alert">
          {error}
        </p>
      )}

      <div className="v1-asset-grid" aria-busy={busy}>
        {visibleAssets.map((asset) => (
          <button
            key={asset.id}
            title={asset.title}
            aria-label={asset.title}
            draggable={!busy}
            onDragStart={(event) => {
              event.dataTransfer.setData(GRATITUDE_ASSET_DRAG_TYPE, asset.id);
              event.dataTransfer.effectAllowed = 'copy';
            }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await onInsert(asset);
              } catch (error) {
                setError(error instanceof Error ? error.message : 'Insertion failed');
              } finally {
                setBusy(false);
              }
            }}
          >
            <span className="asset-thumb">
              <img src={asset.previewUrl} alt="" draggable={false} />
            </span>
            <span className="asset-title">{asset.title}</span>
          </button>
        ))}
      </div>
      {!visibleAssets.length && (
        <div className="panel-empty-state">
          <span className="vs-icon-btn" aria-hidden="true" style={{ margin: '0 auto 8px' }}>
            <SearchIcon />
          </span>
          <strong>No matches yet</strong>
          <p>Try a broader word or switch back to all assets.</p>
          {(query || category !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
