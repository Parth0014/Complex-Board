import { useState } from 'react';
import type { EditorAdapter } from '../vision/contracts';
import { compositionGoals } from '../vision/compositions';
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

const COMPOSITIONS = [
  '2027 Vision',
  'Dream Life',
  'Career',
  'Fitness',
  'Travel',
  'Financial Goals',
  'Relationships',
  'Personal Growth',
  'Education',
  'Manifestation',
  'Minimal',
  'Aesthetic',
  'Scrapbook',
  'Pinterest',
  'Polaroid',
  'Dark',
  'Luxury',
] as const;

export function CreatePanel({ adapter }: { adapter: EditorAdapter }) {
  const [card, setCard] = useState('I am building the life I love');
  const [template, setTemplate] = useState('Dream Life');
  const [replaceTemplate, setReplaceTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const applyComposition = async () => {
    setBusy(true);
    setError('');
    try {
      await adapter.composeBoard(template, compositionGoals(template), template.toLowerCase());
      setReplaceTemplate(false);
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(false);
    }
  };

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
          <p>Choose a shape to add to your board.</p>
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
          <h3>Goal cards</h3>
          <p>Write a goal or choose a ready-made affirmation.</p>
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
          <button
            className="panel-secondary-action"
            onClick={() => adapter.createCard('Today I will take one small step toward my dream.')}
          >
            Add affirmation
          </button>
        </div>
      </section>

      <details className="create-panel__section create-extra">
        <summary>Build a complete board</summary>
        <div className="panel-section-heading">
          <h3>Choose a theme</h3>
          <p>
            Creates a whole board. If you already have content, you?ll be asked before replacing it.
          </p>
        </div>
        <label className="create-composition-select">
          <span>Theme</span>
          <select
            className="vs-select"
            aria-label="Composition theme"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
          >
            {COMPOSITIONS.map((theme) => (
              <option key={theme}>{theme}</option>
            ))}
          </select>
        </label>
        <button
          className="panel-action"
          disabled={busy || replaceTemplate}
          onClick={() => {
            if (adapter.history.document.items.length) setReplaceTemplate(true);
            else void applyComposition();
          }}
        >
          {busy ? 'Building composition…' : 'Apply composition'}
        </button>
        {replaceTemplate && (
          <div
            className="create-replace-warning"
            role="group"
            aria-label="Replace current composition"
          >
            <strong>Replace current board?</strong>
            <p>Your current composition will be replaced. You can undo this action.</p>
            <div>
              <button
                className="panel-action"
                disabled={busy}
                onClick={() => void applyComposition()}
              >
                Replace composition
              </button>
              <button className="panel-secondary-action" onClick={() => setReplaceTemplate(false)}>
                Keep current board
              </button>
            </div>
          </div>
        )}
      </details>

      <details className="create-panel__section create-panel__section--utility create-extra">
        <summary>Clipboard tools</summary>
        <div className="panel-section-heading">
          <h3>Clipboard</h3>
          <p>Move editable objects between boards or browser tabs.</p>
        </div>
        <div className="create-clipboard-actions">
          <button className="panel-secondary-action" onClick={() => void adapter.copyToSystem()}>
            Copy to clipboard
          </button>
          <button className="panel-secondary-action" onClick={() => void adapter.pasteFromSystem()}>
            Paste from clipboard
          </button>
        </div>
        {adapter.clipboardStatus && (
          <p className="create-clipboard-status" role="status">
            {adapter.clipboardStatus}
          </p>
        )}
      </details>

      <details className="create-panel__section create-panel__section--assist create-extra">
        <summary>Drawing options</summary>
        <label className="create-assist-toggle vs-switch">
          <span>
            <strong>Shape assist</strong>
            <small>Clean up freehand geometry while drawing.</small>
          </span>
          <input
            type="checkbox"
            aria-label="Shape assist"
            defaultChecked={adapter.shapeAssist}
            onChange={(event) => {
              adapter.shapeAssist = event.target.checked;
            }}
          />
          <span className="vs-switch__track" aria-hidden="true" />
        </label>
        <p className="create-drawing-note">
          Choose Draw in the left sidebar to use a pen, marker, highlighter or eraser.
        </p>
      </details>
    </div>
  );
}
