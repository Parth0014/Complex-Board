import { useEffect, useRef } from 'react';
import type { BoardItem } from '../vision/document';
import { Button } from './ui/Button';
const presets = [
  { label: 'Mono', filter: 'mono', brightness: 0, contrast: 10, saturation: 0 },
  { label: 'Dreamy', filter: 'dreamy', brightness: 0.1, contrast: -15, saturation: -0.3 },
  { label: 'Film', filter: 'film', brightness: -0.05, contrast: 25, saturation: -0.5 },
  { label: 'Original', filter: 'original', brightness: 0, contrast: 0, saturation: 0 },
] as const;
function Preview({
  image,
  preset,
}: {
  image: HTMLImageElement | undefined;
  preset: (typeof presets)[number];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const ctx = canvas.current.getContext('2d');
    if (!ctx) return;
    const width = 144,
      height = 112,
      ratio = width / height,
      source = image.naturalWidth / (image.naturalHeight || 1);
    const cw = source > ratio ? image.naturalHeight * ratio : image.naturalWidth;
    const ch = source > ratio ? image.naturalHeight : image.naturalWidth / ratio;
    const sx = (image.naturalWidth - cw) / 2;
    const sy = (image.naturalHeight - ch) / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    // Build canvas filter string equivalent to preset
    const brightnessPct = Math.round((1 + preset.brightness) * 100);
    const contrastPct = Math.round((1 + preset.contrast / 100) * 100);
    const saturatePct = Math.round(Math.max(0, (1 + preset.saturation) * 100));
    const grayscale = preset.filter === 'mono' ? ' grayscale(100%)' : '';
    ctx.filter = `brightness(${brightnessPct}%) contrast(${contrastPct}%) saturate(${saturatePct}%)${grayscale}`;
    ctx.drawImage(image, sx, sy, cw, ch, 0, 0, width, height);
    ctx.restore();
  }, [image, preset]);
  return <canvas ref={canvas} width={144} height={112} aria-hidden="true" />;
}
export function ImageFilterPresets({
  image,
  value,
  onChange,
}: {
  image: HTMLImageElement | undefined;
  value: BoardItem['filter'];
  onChange: (patch: Partial<BoardItem>) => void;
}) {
  return (
    <div className="image-filter-presets" role="group" aria-label="Image filter previews">
      {presets.map((preset) => (
        <Button
          key={preset.filter}
          aria-label={`Apply ${preset.label} filter`}
          aria-pressed={(value || 'original') === preset.filter}
          onClick={() =>
            onChange({
              filter: preset.filter,
              brightness: preset.brightness,
              contrast: preset.contrast,
              saturation: preset.saturation,
              blur: 0,
              warmth: 0,
              tint: 0,
            })
          }
        >
          <Preview image={image} preset={preset} />
          <span>{preset.label}</span>
        </Button>
      ))}
    </div>
  );
}
