import { BACKGROUND_PALETTE } from './palette';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { CheckIcon } from './icons';
import { Button } from './ui/Button';
import { ColorPicker } from './ColorPicker';
import type { EditorAdapter } from '../vision/contracts';

const BACKGROUND_GRADIENT_DEFAULT = '#f2d7c4';

export function BackgroundPanel({ adapter }: { adapter: EditorAdapter }) {
  const document = adapter.history.document;
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const setColor = (color: string) => {
    setRecentColors((current) =>
      [color, ...current.filter((entry) => entry !== color)].slice(0, 6),
    );
    adapter.commit({ ...document, color, background: undefined });
  };
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
        <Button
          className={!document.gradient ? 'is-active' : ''}
          aria-pressed={!document.gradient}
          onClick={() =>
            adapter.commit({ ...document, gradient: undefined, background: undefined })
          }
        >
          Solid color
        </Button>
        <Button
          className={document.gradient ? 'is-active' : ''}
          aria-pressed={!!document.gradient}
          onClick={() =>
            adapter.commit({
              ...document,
              gradient: document.gradient || BACKGROUND_GRADIENT_DEFAULT,
              background: undefined,
            })
          }
        >
          Gradient
        </Button>
      </div>
      <div className="panel-section-heading">
        <h3>{document.gradient ? 'Start color' : 'Choose a color'}</h3>
      </div>
      <div className="background-color-grid">
        {BACKGROUND_PALETTE.map((swatch) => (
          <Button
            key={swatch.hex}
            className="background-preset"
            aria-label={swatch.name}
            aria-pressed={document.color.toLowerCase() === swatch.hex}
            onClick={() => setColor(swatch.hex)}
            style={{ '--gs-swatch-color': swatch.hex } as CSSProperties}
          >
            <span className="background-preset__color" aria-hidden="true">
              {document.color.toLowerCase() === swatch.hex && <CheckIcon />}
            </span>
            <span>{swatch.name}</span>
          </Button>
        ))}
      </div>
      {recentColors.length > 0 && (
        <div
          role="group"
          aria-label="Recent background colors"
          className="background-recent-colors"
        >
          {recentColors.map((color) => (
            <Button
              key={color}
              aria-label={`Use recent color ${color}`}
              data-tip={color}
              onClick={() => setColor(color)}
              style={{
                background: color,
                width: 28,
                height: 28,
                border: '1px solid var(--gs-control-line)',
                borderRadius: '50%',
              }}
            />
          ))}
        </div>
      )}
      <label className="background-color-label">
        <span>Custom color</span>
        <span className="background-color-value">
          <ColorPicker
            allowAlpha={false}
            label="Board color"
            value={document.color}
            onChange={setColor}
            palette={BACKGROUND_PALETTE}
          />
          <span>{document.color.toUpperCase()}</span>
        </span>
      </label>
      {document.gradient && (
        <section className="background-gradient-card">
          <label>
            <span>End color</span>
            <ColorPicker
              allowAlpha={false}
              label="Gradient end color"
              palette={BACKGROUND_PALETTE}
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
