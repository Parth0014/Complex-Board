import React, { useState } from 'react';

import { ArrowRightIcon } from './icons';
import { VISION_TEMPLATES } from '../vision/templates';
import type { VisionTemplate } from '../vision/templates';

export interface TemplatesPanelProps {
  onApplyTemplate: (template: VisionTemplate) => void | Promise<void>;
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
        stroke="var(--vs-line)"
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
export const TemplatesPanel = ({ onApplyTemplate }: TemplatesPanelProps) => {
  const [applied, setApplied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="templates-panel">
      <p className="library-help">
        Start with a layered photo collage or a simple layout. Edit every photo, note and title to
        tell your story.
      </p>
      {applied && (
        <p className="panel-inline-status" role="status">
          Template added. Make the words yours and replace the photos with your own.
        </p>
      )}
      {error && (
        <p className="panel-inline-error" role="alert">
          {error}
        </p>
      )}
      <ul className="templates-panel__list">
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
              <p className="templates-panel__desc">{template.description}</p>
              <button
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
                Use this template <ArrowRightIcon />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
