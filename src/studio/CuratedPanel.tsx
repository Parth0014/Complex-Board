import { errorMessage } from './errors';
import { Button } from './ui/Button';
import { useState } from 'react';
import { SearchIcon as Search, CloseIcon as X } from './icons';
import { matchesElementSearch } from '../assets/elementSearch';
import { curatedAssets } from '../assets/curatedPack';
import { ELEMENT_THEMES } from '../assets/elementThemes';
import { GRATITUDE_ASSET_DRAG_TYPE } from '../assets/contracts';
import { startCanvasDrag } from './canvasDrag';
import { elementDropSize } from '../vision/dropPlacement';
import type { EditorAdapter } from '../vision/contracts';
export function CuratedPanel({
  adapter,
  initialTheme = 'all',
  onUploads,
}: {
  adapter: EditorAdapter;
  initialTheme?: string;
  onUploads?(): void;
}) {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState(initialTheme),
    [error, setError] = useState('');
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  const assets = curatedAssets.filter(
    (asset) =>
      (category === 'all' || asset.topics?.includes(category)) &&
      matchesElementSearch(asset, search),
  );
  if (!curatedAssets.length)
    return (
      <div className="gs-empty">
        <h3>No artwork available yet</h3>
        <p>Add your own photos to start creating.</p>
        {onUploads && (
          <Button variant="primary" onClick={onUploads}>
            Upload photos
          </Button>
        )}
      </div>
    );
  return (
    <div className="elements-panel">
      <p>Find artwork for what you want to feel, celebrate, or grow toward.</p>
      <div className="elements-search" role="search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          aria-label="Search elements"
          placeholder="Search artwork"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            if (!search.trim() && event.target.value.trim()) setCategory('all');
          }}
        />
        {search && (
          <Button
            type="button"
            aria-label="Clear element search"
            data-tip="Clear element search"
            onClick={() => setSearch('')}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="elements-theme-chips" role="group" aria-label="Browse by theme">
        {[{ id: 'all', label: 'All artwork' }, ...ELEMENT_THEMES].map((theme) => (
          <Button
            key={theme.id}
            aria-pressed={category === theme.id}
            onClick={() => setCategory(theme.id)}
          >
            {theme.label}
          </Button>
        ))}
      </div>
      <p className="elements-placement-hint">Click to add or drag onto your board.</p>
      <p className="elements-search-count" role="status" aria-live="polite">
        {assets.length} {search.trim() ? 'results' : 'elements'}
      </p>
      {error && <p role="alert">{error}</p>}
      {assets.length === 0 && (
        <div className="gs-empty">
          <h3 className="gs-empty__title">No elements found</h3>
          <p className="gs-empty__body">Try another theme or search.</p>
          <Button
            type="button"
            className="gs-button--primary gs-button--sm"
            onClick={() => {
              setSearch('');
              setCategory('all');
            }}
          >
            Clear search
          </Button>
        </div>
      )}
      {(search.trim()
        ? [{ id: 'search-results', label: 'Search results' }]
        : ELEMENT_THEMES.filter((theme) => category === 'all' || theme.id === category)
      ).map((theme) => {
        const themeAssets =
          theme.id === 'search-results'
            ? assets
            : assets.filter((asset) =>
                category === 'all' ? asset.category === theme.id : asset.topics?.includes(theme.id),
              );
        if (!themeAssets.length) return null;
        return (
          <section key={theme.id} aria-label={theme.label}>
            <h3>{theme.label}</h3>
            <div className="elements-grid">
              {themeAssets.map((asset) => (
                <Button
                  key={asset.id}
                  type="button"
                  className="elements-card"
                  data-tip={asset.title}
                  draggable
                  onDragStart={(event) =>
                    startCanvasDrag(
                      event,
                      GRATITUDE_ASSET_DRAG_TYPE,
                      JSON.stringify({ id: asset.id }),
                      { size: (board) => elementDropSize(asset, board) },
                    )
                  }
                  onClick={() => {
                    setError('');
                    void adapter.insertAsset(asset).catch((error) => setError(errorMessage(error)));
                  }}
                >
                  <img
                    src={asset.previewUrl}
                    alt={asset.title}
                    loading="lazy"
                    draggable={false}
                    className={loaded.has(asset.id) ? undefined : 'gs-skeleton'}
                    onLoad={() => setLoaded((current) => new Set(current).add(asset.id))}
                    onError={() => setLoaded((current) => new Set(current).add(asset.id))}
                  />
                  <span>{asset.title}</span>
                </Button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
