import { useEffect, useRef } from 'react';
import { Dialog } from './ui/Dialog';
import { BoardSizeControl } from './BoardSizeControl';
import { createPortal } from 'react-dom';
import { Button } from './ui/Button';
import React, { useState } from 'react';

import { ArrowRightIcon } from './icons';
import { VISION_TEMPLATES } from '../vision/templates';
import type { VisionTemplate } from '../vision/templates';
import type { StudioAdapter } from '../vision/contracts';
import { SCRAPBOOK_PRESETS, presetsForResolution } from '../vision/scrapbookPresets';

export interface TemplatesPanelProps {
  adapter: StudioAdapter;
  onApplyTemplate: (template: VisionTemplate) => void | Promise<void>;
  onClose?: () => void;
}

/** Schematic preview of a template's layout slots. */
const TemplatePreview = ({ template }: { template: VisionTemplate }) =>
  template.elements ? (
    <svg
      className="templates-panel__preview"
      viewBox={`0 0 ${template.canvas?.width || 1000} ${template.canvas?.height || 1000}`}
      aria-hidden="true"
    >
      <rect
        width={template.canvas?.width || 1000}
        height={template.canvas?.height || 1000}
        fill={template.backgroundColor}
      />
      {template.elements.map((item, i) => (
        <g
          key={i}
          transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
          opacity={item.opacity}
        >
          {item.kind === 'asset' ? (
            <svg width={item.width} height={item.height} overflow="hidden">
              <image
                href={item.asset?.previewUrl}
                width={item.width}
                height={item.height}
                preserveAspectRatio="xMidYMid slice"
              />
            </svg>
          ) : item.kind === 'text' ? (
            <text
              x={item.width / 2}
              y={(item.fontSize || 20) + 5}
              textAnchor="middle"
              fontSize={item.fontSize}
              fill={item.color}
              fontFamily={
                item.fontFamily === 'georgia'
                  ? 'Georgia'
                  : item.fontFamily === 'virgil'
                    ? 'Virgil'
                    : 'Arial'
              }
            >
              {item.text?.split('\n').map((line, j) => (
                <tspan key={j} x={item.width / 2} dy={j ? (item.fontSize || 20) * 1.15 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
          ) : item.shape === 'star' ? (
            <text fontSize={item.width} fill={item.color} y={item.height}>
              ✦
            </text>
          ) : item.shape === 'heart' ? (
            <text fontSize={item.width} fill={item.color} y={item.height}>
              ♥
            </text>
          ) : (
            <rect width={item.width} height={item.height} fill={item.color} />
          )}
        </g>
      ))}
    </svg>
  ) : (
    <svg className="templates-panel__preview" viewBox="0 0 100 80" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="98"
        height="78"
        rx="6"
        fill={template.backgroundColor}
        stroke="var(--gs-line)"
        strokeWidth="1.5"
      />
      {template.layout.slots.map((slot) => (
        <rect
          key={slot.id}
          x={2 + slot.x * 96}
          y={4 + slot.y * 72}
          width={Math.max(2, slot.width * 96)}
          height={Math.max(2, slot.height * 72)}
          rx="3"
          fill={template.accent}
          opacity="0.28"
          stroke={template.accent}
          strokeWidth="1"
        />
      ))}
    </svg>
  );

/**
 * Guided board structures. Applying a template re-themes the board and adds
 * new slots while preserving existing pieces.
 */
export const TemplatesPanel = ({ adapter, onApplyTemplate }: TemplatesPanelProps) => {
  const { width, height } = adapter.history.document;
  const scrapbookTemplates = presetsForResolution(SCRAPBOOK_PRESETS, { width, height });
  const [previews, setPreviews] = useState<Record<string, string>>(
    () => adapter.cachedScrapbookTemplatePreviews?.() || {},
  );
  const [applied, setApplied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [resizeOpen, setResizeOpen] = useState(false);
  const appliedRevision = useRef(-1);
  const applyScrapbook = async (id: string, mode: 'add' | 'replace') => {
    setBusy(true);
    setPending(null);
    setError('');
    try {
      await adapter.applyScrapbookTemplate(id, mode);
      appliedRevision.current = adapter.history.revision;
      setApplied(id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to apply template.');
    } finally {
      setBusy(false);
    }
  };
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!applied) return;
    const timer = setTimeout(() => setApplied(null), 8000);
    return () => clearTimeout(timer);
  }, [applied]);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setError('');
    const cached = adapter.cachedScrapbookTemplatePreviews?.() || {};
    setPreviews((old) =>
      Object.keys(cached).every((key) => old[key] === cached[key]) &&
      Object.keys(old).length === Object.keys(cached).length
        ? old
        : cached,
    );
    const templates = presetsForResolution(SCRAPBOOK_PRESETS, { width, height }).filter(
      (preset) => !cached[preset.id],
    );
    let index = 0;
    const worker = async () => {
      while (live && index < templates.length) {
        const preset = templates[index++];
        try {
          const preview = await adapter.previewScrapbookTemplate(preset.id);
          if (live) setPreviews((old) => ({ ...old, [preset.id]: preview }));
        } catch (error) {
          if (live) setError(error instanceof Error ? error.message : 'Unable to load templates.');
        }
      }
    };
    // Paint the sidebar before cold canvas previews can flush React work.
    // Warm openings do not schedule any preview jobs.
    let timer: number | undefined;
    const frame = templates.length
      ? adapter.ownerWindow.requestAnimationFrame(() => {
          timer = adapter.ownerWindow.setTimeout(() => {
            void Promise.all([worker(), worker()]);
          }, 0);
        })
      : undefined;
    return () => {
      live = false;
      if (frame !== undefined) adapter.ownerWindow.cancelAnimationFrame(frame);
      if (timer !== undefined) adapter.ownerWindow.clearTimeout(timer);
    };
  }, [adapter, width, height, retry]);
  return (
    <div className="templates-panel">
      {resizeOpen && (
        <BoardSizeControl
          adapter={adapter}
          initialSize="1080x1920"
          onClose={() => setResizeOpen(false)}
        />
      )}
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
                Replace the current page’s objects, or add the template alongside them. Both can be
                undone.
              </p>
              <div className="review-dialog-actions">
                <Button onClick={() => setPending(null)}>Cancel</Button>
                <Button variant="secondary" onClick={() => void applyScrapbook(pending, 'add')}>
                  Add to board
                </Button>
                <Button variant="primary" onClick={() => void applyScrapbook(pending, 'replace')}>
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
                setApplied(null);
              }}
            >
              Undo
            </Button>
          )}
        </p>
      )}
      {error && (
        <div className="templates-panel__error">
          <p className="panel-inline-error" role="alert">
            {error}
          </p>
          <Button size="sm" variant="secondary" onClick={() => setRetry((value) => value + 1)}>
            Retry previews
          </Button>
        </div>
      )}
      {VISION_TEMPLATES.length === 0 && scrapbookTemplates.length === 0 && (
        <div className="gs-empty">
          <h3 className="gs-empty__title">No templates for this board size</h3>
          <p className="gs-empty__body">
            Scrapbook templates are available for 1080 × 1920 boards.
          </p>
          <Button variant="primary" size="sm" onClick={() => setResizeOpen(true)}>
            Switch to portrait
          </Button>
        </div>
      )}
      <ul className="templates-panel__list">
        {scrapbookTemplates.map((template) => (
          <li key={template.id} className="templates-panel__card">
            <div className="templates-panel__visual">
              {previews[template.id] ? (
                <img
                  className="templates-panel__preview"
                  src={previews[template.id]}
                  alt={`${template.label} template`}
                  decoding="async"
                  draggable={false}
                />
              ) : (
                <div className="templates-panel__placeholder" role="status">
                  <span className="gs-skeleton" aria-hidden="true" />
                  <span>Preparing template…</span>
                </div>
              )}
            </div>
            <div className="templates-panel__meta">
              <h3>{template.label}</h3>
              <Button
                className="templates-panel__apply"
                disabled={busy || !previews[template.id]}
                onClick={async () => {
                  if (adapter.history.document.items.length) setPending(template.id);
                  else await applyScrapbook(template.id, 'add');
                }}
              >
                Use template <ArrowRightIcon />
              </Button>
            </div>
          </li>
        ))}
        {[
          ...VISION_TEMPLATES.filter((t) => t.elements),
          ...VISION_TEMPLATES.filter((t) => !t.elements),
        ].map((template) => (
          <li key={template.id} className="templates-panel__card">
            <div className="templates-panel__visual">
              <TemplatePreview template={template} />
            </div>
            <div className="templates-panel__meta">
              <h3>{template.title}</h3>
              <Button
                type="button"
                className="templates-panel__apply"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await onApplyTemplate(template);
                    setApplied(template.id);
                  } catch (error) {
                    setError(error instanceof Error ? error.message : 'Unable to apply template.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Use template <ArrowRightIcon />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
