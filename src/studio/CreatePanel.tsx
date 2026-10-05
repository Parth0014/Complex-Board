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
      {error && <p className="panel-inline-error" role="alert">{error}</p>}

      <section className="create-panel__section create-panel__section--primary">
        <div className="panel-section-heading">
          <h3>Quick shapes</h3>
          <p>Add a primitive, then refine it from Properties.</p>
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
            </button>
          ))}
        </div>
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
      </section>

      <section className="create-panel__section">
        <div className="panel-section-heading">
          <h3>Goal cards</h3>
          <p>Useful building blocks for intentions and affirmations.</p>
        </div>
        <textarea
          className="create-card-copy vs-textarea"
          aria-label="Card text"
          value={card}
          onChange={(event) => setCard(event.target.value)}
        />
        <div className="create-card-actions">
          <button className="panel-action" onClick={() => adapter.createCard(card)}>
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

      <section className="create-panel__section">
        <div className="panel-section-heading">
          <h3>Compositions</h3>
          <p>Populate the canvas with a complete starting direction.</p>
        </div>
        <label className="create-composition-select">
          <span>Theme</span>
          <select
            className="vs-select"
            aria-label="Composition theme"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
          >
            {COMPOSITIONS.map((theme) => <option key={theme}>{theme}</option>)}
          </select>
        </label>
        <button
          className="panel-action"
          disabled={busy}
          onClick={() => {
            if (adapter.history.document.items.length) setReplaceTemplate(true);
            else void applyComposition();
          }}
        >
          {busy ? 'Building composition…' : 'Apply composition'}
        </button>
        {replaceTemplate && (
          <div className="create-replace-warning" role="group" aria-label="Replace current composition">
            <strong>Replace current board?</strong>
            <p>Your current composition will be replaced. You can undo this action.</p>
            <div>
              <button className="panel-action" onClick={() => void applyComposition()}>
                Replace composition
              </button>
              <button className="panel-secondary-action" onClick={() => setReplaceTemplate(false)}>
                Keep current board
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="create-panel__section create-panel__section--utility">
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
        {adapter.clipboardStatus && <p className="create-clipboard-status" role="status">{adapter.clipboardStatus}</p>}
      </section>

      <section className="create-panel__section create-panel__section--assist">
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
        <p className="create-drawing-note">Pen, marker, highlighter and eraser live beside the canvas so drawing modes stay one click away.</p>
      </section>
    </div>
  );
}
