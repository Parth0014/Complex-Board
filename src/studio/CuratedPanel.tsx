import { errorMessage } from './errors';
import { Button } from './ui/Button';
import { useState } from 'react';
import { SearchIcon as Search, CloseIcon as X } from './icons';
import { matchesElementSearch } from '../assets/elementSearch';
import { curatedAssets } from '../assets/curatedPack';
import { ELEMENT_THEMES } from '../assets/elementThemes';
import { GRATITUDE_ASSET_DRAG_TYPE } from '../assets/contracts';
import { startCanvasDrag } from './canvasDrag';
import type { EditorAdapter } from '../vision/contracts';
export function CuratedPanel({
  adapter,
  initialTheme = 'all',
}: {
  adapter: EditorAdapter;
  initialTheme?: string;
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
      <label className="elements-theme-label" htmlFor="elements-theme">
        Browse by theme
      </label>
      <select
        className="vs-input"
        id="elements-theme"
        aria-label="Element theme"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
      >
        <option value="all">Explore all artwork</option>
        {ELEMENT_THEMES.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
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
            : assets.filter((asset) => asset.topics?.includes(theme.id));
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
