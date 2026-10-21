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
import { studioCutouts, approvedCutoutIds, isTemplateStudio } from '../assets/studioCutouts';
import './CutoutWorkshop.css';
import { isDigitalCutout } from '../vision/digitalCutoutEdge';
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
    [category, setCategory] = useState(isTemplateStudio() ? 'all' : initialTheme),
    [error, setError] = useState('');
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  const studio = isTemplateStudio();
  const [collection, setCollection] = useState(studio ? 'paper' : 'all');
  const [approved, setApproved] = useState(approvedCutoutIds);
  const [promoting, setPromoting] = useState<string | null>(null);
  const catalog = [
    ...curatedAssets,
    ...studioCutouts.filter((asset) => studio || approved.includes(asset.id)),
  ];
  const assets = catalog.filter(
    (asset) =>
      (collection === 'all' || asset.styles?.includes(collection)) &&
      (category === 'digital-cutouts'
        ? asset.styles?.includes('digital')
        : category === 'all' || asset.topics?.includes(category)) &&
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
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter
            id="visbo-digital-cutout-preview-edge"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="expanded" />
            <feFlood floodColor="#ffffff" result="white" />
            <feComposite in="white" in2="expanded" operator="in" result="edge" />
            <feMerge>
              <feMergeNode in="edge" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      {studio && (
        <>
          <label className="vs-field">
            <span>Artwork collection</span>
            <select
              className="vs-select"
              aria-label="Artwork collection"
              value={collection}
              onChange={(event) => {
                setCollection(event.target.value);
                setCategory('all');
                setSearch('');
              }}
            >
              <option value="digital">Digital cutouts</option>
              <option value="paper">Paper cutouts</option>
              <option value="all">All artwork</option>
            </select>
          </label>
          {collection === 'paper' && (
            <p>
              Ready-made torn notes, scraps and dividers. Add a piece, then resize, rotate or layer
              it behind your photos and text.
            </p>
          )}
        </>
      )}
      {(!studio || collection === 'all') && (
        <p>Find artwork for what you want to feel, celebrate, or grow toward.</p>
      )}
      <div className="elements-search" role="search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          aria-label="Search elements"
          placeholder="Search artwork"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            if (!search.trim() && event.target.value.trim() && category !== 'digital-cutouts')
              setCategory('all');
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
      {(!studio || collection === 'all') && (
        <div className="elements-theme-chips" role="group" aria-label="Browse by theme">
          {[
            { id: 'all', label: 'All artwork' },
            ...(!studio ? [{ id: 'digital-cutouts', label: 'Digital cutouts' }] : []),
            ...ELEMENT_THEMES,
          ].map((theme) => (
            <Button
              key={theme.id}
              aria-pressed={category === theme.id}
              onClick={() => setCategory(theme.id)}
            >
              {theme.label}
            </Button>
          ))}
        </div>
      )}
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
        : category === 'digital-cutouts'
          ? [{ id: 'digital-cutouts', label: 'Digital cutouts' }]
          : ELEMENT_THEMES.filter((theme) => category === 'all' || theme.id === category)
      ).map((theme) => {
        const themeAssets =
          theme.id === 'search-results' || theme.id === 'digital-cutouts'
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
                <div key={asset.id} className="cutout-card">
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
                      void adapter
                        .insertAsset(asset)
                        .catch((error) => setError(errorMessage(error)));
                    }}
                  >
                    <img
                      src={asset.previewUrl}
                      alt={asset.title}
                      loading="lazy"
                      draggable={false}
                      style={
                        isDigitalCutout(asset)
                          ? { filter: 'url(#visbo-digital-cutout-preview-edge)' }
                          : undefined
                      }
                      className={loaded.has(asset.id) ? undefined : 'gs-skeleton'}
                      onLoad={() => setLoaded((current) => new Set(current).add(asset.id))}
                      onError={() => setLoaded((current) => new Set(current).add(asset.id))}
                    />
                    <span>{asset.title}</span>
                  </Button>
                  {studio && import.meta.env.DEV && asset.id.startsWith('studio-cutout:') && (
                    <Button
                      size="sm"
                      disabled={promoting !== null}
                      aria-label={`${approved.includes(asset.id) ? 'Remove from' : 'Add to'} main app: ${asset.title}`}
                      onClick={async () => {
                        setPromoting(asset.id);
                        setError('');
                        try {
                          const response = await fetch('/api/template-studio', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'approve-cutout',
                              id: asset.id,
                              approved: !approved.includes(asset.id),
                            }),
                          });
                          const result = await response.json();
                          if (!response.ok)
                            throw new Error(result.error || 'Unable to update artwork.');
                          setApproved(result.ids);
                        } catch (error) {
                          setError(errorMessage(error));
                        } finally {
                          setPromoting(null);
                        }
                      }}
                    >
                      {approved.includes(asset.id) ? 'Remove from main app' : 'Add to main app'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
