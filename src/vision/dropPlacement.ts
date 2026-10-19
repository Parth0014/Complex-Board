import type { BoardItem } from './document';
import type { VisionPoint } from './contracts';
import type { GratitudeAsset } from '../assets/contracts';

export type DropSize = { width: number; height: number };

export function centeredDropPosition(point: VisionPoint, size: DropSize, board: DropSize) {
  return {
    x: Math.max(0, Math.min(board.width - size.width, point.x - size.width / 2)),
    y: Math.max(0, Math.min(board.height - size.height, point.y - size.height / 2)),
  };
}

export function assetDropSize(width = 240, height = 240): DropSize {
  const displayedWidth = Math.min(320, width);
  return { width: displayedWidth, height: (displayedWidth * height) / width };
}

/** Curated artwork has distinct visual roles; a letter is not a quote card. */
export function elementDropSize(asset: GratitudeAsset, board: DropSize): DropSize {
  if (asset.provider !== 'curated-v1') return assetDropSize(asset.width, asset.height);
  const folder = asset.id.split(':')[1]?.split('/')[0] || '';
  const ratio = (asset.width || 240) / (asset.height || 240);
  const shortSide = Math.min(board.width, board.height);
  const widthRatio = folder.startsWith('letters-')
    ? 0.12
    : folder === 'titles'
      ? ratio > 2
        ? 0.72
        : 0.3
      : ['affirmations', 'gratitude-notes', 'goal-cards', 'life-areas'].includes(folder)
        ? 0.6
        : folder === 'phrases'
          ? 0.56
          : folder === 'stamps'
            ? 0.22
            : folder === 'words'
              ? 0.3
              : folder === 'washi-tape'
                ? 0.4
                : ['ribbons', 'tickets'].includes(folder)
                  ? 0.44
                  : folder === 'calendar-2027'
                    ? 0.42
                    : folder === 'frames'
                      ? 0.48
                      : 0.36;
  const maxHeight = shortSide * (folder.startsWith('letters-') ? 0.16 : 0.46);
  const width = Math.min(shortSide * widthRatio, board.width * 0.78, maxHeight * ratio);
  return { width, height: width / ratio };
}

export function shapeDropSize(shape: NonNullable<BoardItem['shape']>, board: DropSize): DropSize {
  const width = ['line', 'arrow'].includes(shape)
    ? 320
    : ['rectangle', 'cloud'].includes(shape)
      ? 240
      : 200;
  const height = ['line', 'arrow'].includes(shape)
    ? 30
    : shape === 'cloud'
      ? 156
      : shape === 'rectangle'
        ? 160
        : 200;
  const factor = Math.min(1, (board.width * 0.5) / width, (board.height * 0.5) / height);
  return { width: width * factor, height: height * factor };
}

export function textDropSize(
  preset: { sample: string; fontSize: number },
  board: DropSize,
): DropSize {
  const charWidth = preset.fontSize * 0.6;
  const estimatedWidth = Math.max(
    40,
    Math.min(board.width * 0.8, preset.sample.length * charWidth + 16),
  );
  const estimatedHeight = Math.ceil(preset.fontSize * 1.5 + 16);
  return { width: estimatedWidth, height: estimatedHeight };
}
