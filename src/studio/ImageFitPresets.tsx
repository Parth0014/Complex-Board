import type { BoardItem } from '../vision/document';
import type { EditorAdapter } from '../vision/contracts';
import { CropIcon, FitIcon } from './icons';
import { Button } from './ui/Button';
export function ImageFitPresets({ adapter, item }: { adapter: EditorAdapter; item: BoardItem }) {
  return (
    <div className="object-inspector-image-fit" role="group" aria-label="Image sizing previews">
      {(['fit', 'fill'] as const).map((mode) => (
        <Button
          key={mode}
          aria-label={mode === 'fit' ? 'Fit image' : 'Fill image'}
          aria-pressed={item.imageFit === mode}
          data-tip={mode === 'fit' ? 'Show the whole photo' : 'Fill the frame'}
          onClick={() => {
            adapter.previewOriginalImage(false);
            adapter.setImageFit(mode);
          }}
        >
          {mode === 'fit' ? <FitIcon /> : <CropIcon />}
          {mode === 'fit' ? 'Fit' : 'Fill'}
        </Button>
      ))}
    </div>
  );
}
