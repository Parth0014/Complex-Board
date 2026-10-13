import { Button } from './ui/Button';
import type { EditorAdapter } from '../vision/contracts';
import { ShapeIcon } from './icons';
import { startCreationDrag } from './canvasDrag';

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
  return (
    <div className="create-panel">
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
              draggable
              onDragStart={(event) => startCreationDrag(event, { kind: 'shape', shape })}
              onClick={() => adapter.createShape(shape)}
            >
              <ShapeIcon shape={shape} />
              <span>{shape[0].toUpperCase() + shape.slice(1)}</span>
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
