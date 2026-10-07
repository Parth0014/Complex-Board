import { VISION_TEXT_PRESETS } from '../vision/typography';
import type { VisionTextPreset } from '../vision/contracts';
import { fontFamily } from '../vision/fonts';
import { PlusIcon } from './icons';

export interface TextPanelProps {
  onInsertText: (preset: VisionTextPreset) => void;
}

/** Typographic presets that insert editable text at the board center. */
export const TextPanel = ({ onInsertText }: TextPanelProps) => (
  <div className="text-panel">
    <ul className="text-panel__list">
      {VISION_TEXT_PRESETS.map((preset) => (
        <li key={preset.id}>
          <button
            type="button"
            className="text-panel__item"
            onClick={() => onInsertText(preset)}
            title={`Add ${preset.label}`}
          >
            <span className="text-panel__label">{preset.label}</span>
            <span
              className="text-panel__sample"
              style={{ color: preset.color, fontFamily: fontFamily(preset.fontFamily) }}
              data-font={preset.fontFamily}
            >
              {preset.sample}
            </span>
            <span className="text-panel__add" aria-hidden="true">
              <PlusIcon />
            </span>
          </button>
        </li>
      ))}
    </ul>
  </div>
);
