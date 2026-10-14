import { Button } from './ui/Button';
import { CheckIcon } from './icons';

export function CropActions({ onCancel, onApply }: { onCancel: () => void; onApply: () => void }) {
  return (
    <div className="vs-crop-actions" role="group" aria-label="Crop actions">
      <Button className="vs-crop-cancel" onClick={onCancel}>
        Cancel crop
      </Button>
      <Button className="vs-crop-apply" variant="primary" onClick={onApply}>
        <CheckIcon /> Apply crop
      </Button>
    </div>
  );
}
