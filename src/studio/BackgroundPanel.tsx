import { ColorPicker } from './ColorPicker';
import type { EditorAdapter } from '../vision/contracts';

const COLORS = [
  ['#ffffff', 'White'],
  ['#fffaf6', 'Cream'],
  ['#fce4ec', 'Blush'],
  ['#efe8ff', 'Lavender'],
  ['#e6f4ec', 'Sage'],
  ['#e7efff', 'Sky'],
  ['#fff3cd', 'Butter'],
  ['#25263a', 'Midnight'],
] as const;

export function BackgroundPanel({ adapter }: { adapter: EditorAdapter }) {
  const document = adapter.history.document;
  const setColor = (color: string) => adapter.commit({ ...document, color, background: undefined });
  return (
    <div className="background-panel">
      <div
        className="background-live-preview"
        aria-label="Current background preview"
        style={{
          background: document.gradient
            ? `${document.gradientType === 'radial' ? 'radial-gradient(circle' : 'linear-gradient(135deg'}, ${document.color}, ${document.gradient})`
            : document.color,
        }}
      >
        <span>Background preview</span>
      </div>
      <div className="vs-segmented background-modes" aria-label="Background style">
        <button
          className={!document.gradient ? 'is-active' : ''}
          aria-pressed={!document.gradient}
          onClick={() =>
            adapter.commit({ ...document, gradient: undefined, background: undefined })
          }
        >
          Solid color
        </button>
        <button
          className={document.gradient ? 'is-active' : ''}
          aria-pressed={!!document.gradient}
          onClick={() =>
            adapter.commit({
              ...document,
              gradient: document.gradient || '#f2d7c4',
              background: undefined,
            })
          }
        >
          Gradient
        </button>
      </div>
      <div className="panel-section-heading">
        <h3>{document.gradient ? 'Start color' : 'Choose a color'}</h3>
      </div>
      <div className="background-color-grid">
        {COLORS.map(([color, name]) => (
          <button
            key={color}
            aria-label={`Set background ${color}`}
            aria-pressed={document.color.toLowerCase() === color}
            onClick={() => setColor(color)}
          >
            <span style={{ background: color }} />
            <span>{name}</span>
          </button>
        ))}
      </div>
      <label className="background-color-label">
        <span>Custom color</span>
        <span className="background-color-value">
          <ColorPicker label="Board color" value={document.color} onChange={setColor} />
          <span>{document.color.toUpperCase()}</span>
        </span>
      </label>
      {document.gradient && (
        <section className="background-gradient-card">
          <label>
            <span>End color</span>
            <ColorPicker
              label="Gradient end color"
              value={document.gradient}
              onChange={(value) =>
                adapter.commit({ ...document, gradient: value, background: undefined })
              }
            />
          </label>
          <label className="vs-field">
            <span>Gradient direction</span>
            <select
              className="vs-select"
              aria-label="Background gradient type"
              value={document.gradientType || 'linear'}
              onChange={(event) =>
                adapter.commit({
                  ...document,
                  gradientType: event.target.value as 'linear' | 'radial',
                })
              }
            >
              <option value="linear">Across the board</option>
              <option value="radial">From the center</option>
            </select>
          </label>
        </section>
      )}
    </div>
  );
}
