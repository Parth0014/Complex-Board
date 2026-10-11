import { Button } from './ui/Button';
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { matchesElementSearch } from '../assets/elementSearch';
import { curatedAssets } from '../assets/curatedPack';
import { ELEMENT_THEMES } from '../assets/elementThemes';
import { GRATITUDE_ASSET_DRAG_TYPE } from '../assets/contracts';
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
          placeholder="Search artwork, words, or feelings"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            if (!search.trim() && event.target.value.trim()) setCategory('all');
          }}
        />
        {search && (
          <Button type="button" aria-label="Clear element search" onClick={() => setSearch('')}>
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
      {assets.length === 0 && <p>No elements found. Try another theme or search.</p>}
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
                    event.dataTransfer.setData(GRATITUDE_ASSET_DRAG_TYPE, JSON.stringify(asset))
                  }
                  onClick={() => {
                    setError('');
                    void adapter.insertAsset(asset).catch((error) => setError(String(error)));
                  }}
                >
                  <img src={asset.previewUrl} alt={asset.title} loading="lazy" />
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
