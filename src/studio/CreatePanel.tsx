import { useState } from 'react';
import type { EditorAdapter } from '../vision/contracts';
import { ArrowRightIcon, ShapeIcon } from './icons';

const SHAPES = [
  'rectangle',
  'circle',
  'triangle',
  'star',
  'heart',
  'cloud',
  'blob',
  'burst',
  'line',
  'arrow',
] as const;

export function CreatePanel({ adapter }: { adapter: EditorAdapter }) {
  const [card, setCard] = useState('Plan my next adventure');
  const [affirmation, setAffirmation] = useState(
    'I trust my journey and take one small step each day.',
  );
  const [error, setError] = useState('');

  return (
    <div className="create-panel">
      {error && (
        <p className="panel-inline-error" role="alert">
          {error}
        </p>
      )}

      <section className="create-panel__section create-panel__section--primary">
        <div className="panel-section-heading">
          <h3>Quick shapes</h3>
        </div>
        <div className="create-shape-grid" aria-label="Quick shapes">
          {SHAPES.map((shape) => (
            <button
              key={shape}
              data-tip={`Add ${shape}`}
              aria-label={shape}
              onClick={() => adapter.createShape(shape)}
            >
              <ShapeIcon shape={shape} />
              <span>{shape[0].toUpperCase() + shape.slice(1)}</span>
            </button>
          ))}
        </div>
        {adapter.selectedIds.length === 2 && (
          <button
            className="panel-secondary-action create-connect-action"
            disabled={adapter.selectedIds.length !== 2}
            onClick={() => {
              try {
                adapter.connectSelection();
                setError('');
              } catch (error) {
                setError(String(error));
              }
            }}
          >
            Connect selected objects
            <ArrowRightIcon />
          </button>
        )}
      </section>

      <section className="create-panel__section">
        <div className="panel-section-heading">
          <h3>Drawing cleanup</h3>
        </div>
        <button
          className="panel-secondary-action"
          disabled={
            !adapter.history.document.items.some(
              (item) =>
                adapter.selectedIds.includes(item.id) && item.kind === 'drawing' && !item.locked,
            )
          }
          onClick={() => adapter.cleanSelectedDrawings()}
        >
          Clean up selected drawing
        </button>
      </section>

      <section className="create-panel__section">
        <div className="panel-section-heading">
          <h3>Goal cards</h3>
        </div>
        <textarea
          className="create-card-copy vs-textarea"
          aria-label="Card text"
          value={card}
          onChange={(event) => setCard(event.target.value)}
        />
        <div className="create-card-actions">
          <button
            className="panel-action"
            disabled={!card.trim()}
            onClick={() => adapter.createCard(card.trim())}
          >
            Add goal card
          </button>
        </div>
      </section>
      <section className="create-panel__section">
        <div className="panel-section-heading">
          <h3>Affirmations</h3>
        </div>
        <textarea
          className="create-card-copy vs-textarea"
          aria-label="Affirmation text"
          value={affirmation}
          onChange={(event) => setAffirmation(event.target.value)}
        />
        <button
          className="panel-secondary-action"
          disabled={!affirmation.trim()}
          onClick={() => adapter.createCard(affirmation.trim(), 'affirmation')}
        >
          Add affirmation
        </button>
      </section>
    </div>
  );
}
