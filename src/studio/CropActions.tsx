import { Slider } from './ui/Slider';
import type { EditorAdapter } from '../vision/contracts';
import { Button } from './ui/Button';
import { CheckIcon } from './icons';

export function CropActions({
  onCancel,
  onApply,
  adapter,
}: {
  onCancel: () => void;
  onApply: () => void;
  adapter?: EditorAdapter;
}) {
  const draft = adapter?.cropDraft;
  const zoom = draft?.base ? draft.base.width / draft.crop.width : 1;
  return (
    <div className="vs-crop-actions" role="group" aria-label="Crop actions">
      {draft?.base && adapter && (
        <div className="vs-frame-adjust" role="group" aria-label="Adjust photo inside frame">
          <label>
            Zoom
            <Slider
              aria-label="Photo zoom"
              aria-valuetext={`${Math.round(zoom * 100)}%`}
              min="1"
              max="5"
              step="0.01"
              value={zoom}
              onChange={(event) => adapter.zoomImageCrop(Number(event.target.value))}
            />
            <output>{Math.round(zoom * 100)}%</output>
          </label>
          <Button onClick={() => adapter.resetImageCrop()}>Reset</Button>
        </div>
      )}
      <Button className="vs-crop-cancel" onClick={onCancel}>
        Cancel crop
      </Button>
      <Button className="vs-crop-apply" variant="primary" onClick={onApply}>
        <CheckIcon /> Apply crop
      </Button>
    </div>
  );
}
