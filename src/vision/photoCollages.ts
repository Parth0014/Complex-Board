import type { GratitudeAsset } from '../assets/contracts';
import type { BoardItem } from './document';
import { COLLAGE_REFERENCES } from './collageReferences';
import { createAppearance } from './appearance/defaults';
import { SCRAPBOOK_PHOTO_PLACEHOLDER } from './scrapbookPresets';
export const PHOTO_COLLAGE_VERSION = 'full-bleed-grids-v3';

/** Close margins and holes by partitioning the board around the reference frames.
 * Each frame gets one rectangular region; their union is exactly the whole board. */
export function packedCollageFrames(frames: number[][], width: number, height: number) {
  const result: Array<{ x: number; y: number; width: number; height: number }> = [];
  const left = Math.min(...frames.map((f) => f[0])),
    top = Math.min(...frames.map((f) => f[1]));
  const sourceWidth = Math.max(...frames.map((f) => f[0] + f[2])) - left;
  const sourceHeight = Math.max(...frames.map((f) => f[1] + f[3])) - top;
  const normalized = frames.map(([x, y, w, h], index) => ({
    index,
    x: (x - left) / sourceWidth,
    y: (y - top) / sourceHeight,
    width: w / sourceWidth,
    height: h / sourceHeight,
  }));
  type Region = { x: number; y: number; width: number; height: number };
  const divide = (parts: typeof normalized, region: Region) => {
    if (parts.length === 1) {
      const x = Math.round(region.x * width),
        y = Math.round(region.y * height);
      result[parts[0].index] = {
        x,
        y,
        width: Math.round((region.x + region.width) * width) - x,
        height: Math.round((region.y + region.height) * height) - y,
      };
      return;
    }
    let best:
      | { sorted: typeof normalized; index: number; axis: 'x' | 'y'; cut: number; score: number }
      | undefined;
    for (const axis of ['x', 'y'] as const) {
      const dimension = axis === 'x' ? 'width' : 'height';
      const sorted = [...parts].sort(
        (a, b) => a[axis] + a[dimension] / 2 - b[axis] - b[dimension] / 2,
      );
      for (let index = 1; index < sorted.length; index++) {
        const first = sorted.slice(0, index),
          second = sorted.slice(index);
        const edgeA = Math.max(...first.map((p) => p[axis] + p[dimension])),
          edgeB = Math.min(...second.map((p) => p[axis]));
        const cut = Math.max(
          region[axis] + region[dimension] * 0.12,
          Math.min(region[axis] + region[dimension] * 0.88, (edgeA + edgeB) / 2),
        );
        const crossing = parts.filter((p) => p[axis] < cut && p[axis] + p[dimension] > cut).length;
        const score = crossing * 10 + Math.abs(index - parts.length / 2) / parts.length;
        if (!best || score < best.score) best = { sorted, index, axis, cut, score };
      }
    }
    const { sorted, index, axis, cut } = best!;
    if (axis === 'x') {
      divide(sorted.slice(0, index), { ...region, width: cut - region.x });
      divide(sorted.slice(index), { ...region, x: cut, width: region.x + region.width - cut });
    } else {
      divide(sorted.slice(0, index), { ...region, height: cut - region.y });
      divide(sorted.slice(index), { ...region, y: cut, height: region.y + region.height - cut });
    }
  };
  divide(normalized, { x: 0, y: 0, width: 1, height: 1 });
  return result;
}

export const COLLAGE_PRESETS = COLLAGE_REFERENCES.map((reference) => ({
  ...reference,
  slots: reference.frames.length,
}));
export type CollagePresetId = string;
export const isPhotoCollage = (id: string): id is CollagePresetId =>
  COLLAGE_PRESETS.some((preset) => preset.id === id);

/** Similar reference grids with native editable photo slots, adapted to the board. */
export function photoCollageItems(
  preset: CollagePresetId,
  assets: GratitudeAsset[],
  width: number,
  height: number,
  id: () => string,
): BoardItem[] {
  if (!assets.length || assets.length > 20) throw new Error('Select 1 to 20 photos.');
  const reference = COLLAGE_PRESETS.find((entry) => entry.id === preset);
  if (!reference) throw new Error('Unknown collage.');
  const appearance = createAppearance('closed-shape');
  appearance.fill.paint = { kind: 'solid', color: '#ffffff' };
  const items: BoardItem[] = [
    {
      id: id(),
      kind: 'shape',
      shape: 'rectangle',
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      appearance,
    },
  ];
  packedCollageFrames(reference.frames, width, height).forEach((frame, index) => {
    const asset = assets[index];
    const box = { ...frame, rotation: 0 };
    items.push({
      id: id(),
      kind: 'asset',
      asset: asset || SCRAPBOOK_PHOTO_PLACEHOLDER,
      ...box,
      imageFit: 'fill',
      opacity: 1,
      templatePlaceholder: !asset,
      scrapbookPhoto: {
        width: box.width,
        height: box.height,
        style: 'raw',
        colors: ['#d9d9df', '#d9d9df'],
      },
    });
  });
  return items;
}
