import { useEffect, useRef } from 'react';
import type { BoardItem } from '../vision/document';
import type { EditorAdapter } from '../vision/contracts';
import { Button } from './ui/Button';
function FitPreview({
  image,
  item,
  mode,
}: {
  image: HTMLImageElement | undefined;
  item: BoardItem;
  mode: 'fit' | 'fill' | 'original';
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || !image) return;
    ctx.clearRect(0, 0, 144, 112);
    const frameScale = Math.min(128 / item.width, 96 / item.height),
      fw = item.width * frameScale,
      fh = item.height * frameScale;
    const fx = (144 - fw) / 2,
      fy = (112 - fh) / 2;
    ctx.save();
    ctx.beginPath();
    if (item.frameShape === 'circle') ctx.ellipse(72, 56, fw / 2, fh / 2, 0, 0, Math.PI * 2);
    else ctx.rect(fx, fy, fw, fh);
    ctx.clip();
    const factor =
      mode === 'fill'
        ? Math.max(fw / image.naturalWidth, fh / image.naturalHeight)
        : Math.min(fw / image.naturalWidth, fh / image.naturalHeight);
    const w = image.naturalWidth * factor,
      h = image.naturalHeight * factor;
    ctx.drawImage(image, (144 - w) / 2, (112 - h) / 2, w, h);
    ctx.restore();
  }, [image, item.width, item.height, item.frameShape, mode]);
  return <canvas ref={ref} width={144} height={112} aria-hidden="true" />;
}
export function ImageFitPresets({ adapter, item }: { adapter: EditorAdapter; item: BoardItem }) {
  const image = adapter.images.get(
    item.rendition || (item.contentAsset || item.asset)?.assetUrl || '',
  );
  const original = adapter.images.get((item.contentAsset || item.asset)?.assetUrl || '');
  return (
    <>
      <div className="image-fit-presets" role="group" aria-label="Image sizing previews">
        {(['fit', 'fill', 'original'] as const).map((mode) => (
          <Button
            key={mode}
            aria-label={
              mode === 'original'
                ? 'Compare original image'
                : mode === 'fit'
                  ? 'Fit image'
                  : 'Fill image'
            }
            aria-pressed={
              mode === 'original'
                ? adapter.originalPreview
                : !adapter.originalPreview && item.imageFit === mode
            }
            onClick={() => {
              if (mode === 'original') adapter.previewOriginalImage(!adapter.originalPreview);
              else {
                adapter.previewOriginalImage(false);
                adapter.setImageFit(mode);
              }
            }}
          >
            <FitPreview image={mode === 'original' ? original : image} item={item} mode={mode} />
            <strong>{mode === 'fit' ? 'Fit' : mode === 'fill' ? 'Fill' : 'Original'}</strong>
            <span>
              {mode === 'fit'
                ? 'Show whole photo'
                : mode === 'fill'
                  ? 'Crop edges to fill'
                  : 'Compare unedited'}
            </span>
          </Button>
        ))}
      </div>
      <p className="ai-tool-help" role="status">
        {adapter.originalPreview
          ? 'Viewing the original. Click Original again to return to your edits.'
          : 'Fit keeps the whole photo visible. Fill covers the frame by cropping the edges.'}
      </p>
    </>
  );
}
