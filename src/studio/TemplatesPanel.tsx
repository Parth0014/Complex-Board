import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { ArrowRightIcon } from './icons';
import type { VisionTemplate } from '../vision/templates';
import type { StudioAdapter } from '../vision/contracts';
import { publishedTemplates } from '../vision/publishedTemplates';
import './TemplatesPanel.css';

export interface TemplatesPanelProps {
  adapter: StudioAdapter;
  onApplyTemplate: (template: VisionTemplate) => void | Promise<void>;
  onClose?: () => void;
}

/** The library contains designs published from the template maker. */
export const TemplatesPanel = ({ adapter }: TemplatesPanelProps) => {
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const appliedRevision = useRef(-1);
  useEffect(() => {
    if (!applied) return;
    const timer = setTimeout(() => setApplied(false), 8000);
    return () => clearTimeout(timer);
  }, [applied]);

  const apply = async (id: string) => {
    const template = publishedTemplates.find((entry) => entry.id === id);
    if (!template) return;
    setBusy(true);
    setPending(null);
    setError('');
    try {
      await adapter.restore(JSON.stringify(template.project));
      appliedRevision.current = adapter.history.revision;
      setApplied(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to apply template.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="templates-panel">
      {pending &&
        createPortal(
          <div className="vs vs-veil">
            <Dialog
              className="vs-dialog board-size-dialog"
              aria-label="Apply template"
              onClose={() => setPending(null)}
            >
              <h2>Use this template?</h2>
              <p>
                Replace this page with the template, including its board size and background. You
                can undo this.
              </p>
              <div className="review-dialog-actions">
                <Button onClick={() => setPending(null)}>Cancel</Button>
                <Button variant="primary" onClick={() => void apply(pending)}>
                  Replace page
                </Button>
              </div>
            </Dialog>
          </div>,
          adapter.ownerWindow.document.body,
        )}
      {applied && (
        <p className="panel-inline-status" role="status">
          Template added.
          {adapter.history.revision === appliedRevision.current && (
            <Button
              onClick={() => {
                adapter.undo();
                setApplied(false);
              }}
            >
              Undo
            </Button>
          )}
        </p>
      )}
      {error && (
        <p className="panel-inline-error" role="alert">
          {error}
        </p>
      )}
      {!publishedTemplates.length && (
        <div className="gs-empty">
          <h3 className="gs-empty__title">No templates available</h3>
          <p className="gs-empty__body">
            Templates published from the template maker will appear here.
          </p>
        </div>
      )}
      <ul className="templates-panel__list">
        {publishedTemplates.map((template) => (
          <li key={template.id} className="templates-panel__card">
            <div className="templates-panel__visual">
              <img
                className="templates-panel__preview"
                src={template.preview}
                alt={`${template.title} template`}
                decoding="async"
              />
            </div>
            <div className="templates-panel__meta">
              <div className="templates-panel__details">
                <h3>{template.title}</h3>
                <p>
                  {template.project.width} × {template.project.height}
                </p>
              </div>
              {template.description.trim() && <p>{template.description}</p>}
              <Button
                variant="primary"
                className="templates-panel__use"
                disabled={busy}
                onClick={() => setPending(template.id)}
              >
                <span>Use template</span>
                <ArrowRightIcon />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
