import { Button } from './ui/Button';
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
            <Button
              key={shape}
              data-tip={`Add ${shape}`}
              aria-label={shape}
              onClick={() => adapter.createShape(shape)}
            >
              <ShapeIcon shape={shape} />
              <span>{shape[0].toUpperCase() + shape.slice(1)}</span>
            </Button>
          ))}
        </div>
        <>
          <Button
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
          </Button>
          {adapter.selectedIds.length !== 2 && (
            <p className="gs-appearance-note">Select two objects to connect them.</p>
          )}
        </>
      </section>
    </div>
  );
}
