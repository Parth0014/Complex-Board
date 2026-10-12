import { useEffect, useRef } from 'react';
import Konva from 'konva';
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
    const width = 144,
      height = 112,
      ratio = width / height,
      source = image.naturalWidth / image.naturalHeight;
    const cw = source > ratio ? image.naturalHeight * ratio : image.naturalWidth;
    const ch = source > ratio ? image.naturalHeight : image.naturalWidth / ratio;
    const node = new Konva.Image({
      image,
      width,
      height,
      crop: {
        x: (image.naturalWidth - cw) / 2,
        y: (image.naturalHeight - ch) / 2,
        width: cw,
        height: ch,
      },
      brightness: preset.brightness,
      contrast: preset.contrast,
      saturation: preset.saturation,
      filters: [
        Konva.Filters.Brighten,
        Konva.Filters.Contrast,
        Konva.Filters.HSL,
        ...(preset.filter === 'mono' ? [Konva.Filters.Grayscale] : []),
      ],
    });
    try {
      node.cache({ pixelRatio: 1 });
      canvas.current.getContext('2d')?.drawImage(node.toCanvas({ pixelRatio: 1 }), 0, 0);
    } finally {
      node.destroy();
    }
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
