import React, { useState } from 'react';

import { ArrowRightIcon } from './icons';
import { VISION_TEMPLATES } from '../vision/templates';
import type { VisionTemplate } from '../vision/templates';

export interface TemplatesPanelProps {
  onApplyTemplate: (template: VisionTemplate) => void;
}

/** Schematic preview of a template's layout slots. */
const TemplatePreview = ({ template }: { template: VisionTemplate }) => (
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
  return (
    <div className="templates-panel">
      <p className="library-help">
        Choose a layout to add photo spaces and a matching background. Your existing pieces stay on
        the board.
      </p>
      {applied && (
        <p className="panel-inline-status" role="status">
          Layout added. Choose a space on the board to add your photo.
        </p>
      )}
      <ul className="templates-panel__list">
        {VISION_TEMPLATES.map((template) => (
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
                onClick={() => {
                  onApplyTemplate(template);
                  setApplied(template.id);
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
