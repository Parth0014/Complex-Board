import { useState } from 'react';
import { curatedAssets } from '../assets/curatedPack';
import { GRATITUDE_ASSET_DRAG_TYPE } from '../assets/contracts';
import type { EditorAdapter } from '../vision/contracts';
export function CuratedPanel({ adapter }: { adapter: EditorAdapter }) {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState('all'),
    [error, setError] = useState('');
  const assets = curatedAssets.filter(
    (asset) =>
      (category === 'all' || asset.category === category) &&
      [asset.title, ...asset.tags].join(' ').includes(search.toLowerCase()),
  );
  return (
    <div className="elements-panel">
      <p>Pack elements are fixed artwork. Add your own text and shapes to customize your board.</p>
      <input
        className="vs-input"
        aria-label="Search elements"
        placeholder="Search elements"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        className="vs-input"
        aria-label="Element category"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
      >
        <option value="all">All categories</option>
        {[...new Set(curatedAssets.map((asset) => asset.category))].map((name) => (
          <option key={name} value={name}>
            {name?.replace(/-/g, ' ')}
          </option>
        ))}
      </select>
      <p>{assets.length} elements</p>
      {error && <p role="alert">{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {assets.map((asset) => (
          <button
            key={asset.id}
            type="button"
            title={asset.title}
            draggable
            onDragStart={(event) =>
              event.dataTransfer.setData(GRATITUDE_ASSET_DRAG_TYPE, JSON.stringify(asset))
            }
            onClick={() => {
              setError('');
              void adapter.insertAsset(asset).catch((error) => setError(String(error)));
            }}
            style={{
              padding: 8,
              background: 'var(--vs-surface, #fff)',
              border: '1px solid var(--vs-border, #ddd)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <img
              src={asset.previewUrl}
              alt={asset.title}
              loading="lazy"
              style={{ width: '100%', height: 100, objectFit: 'contain' }}
            />
            <span>{asset.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
