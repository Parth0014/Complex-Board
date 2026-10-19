import type { BoardItem } from './document';
import type { VisionPoint } from './contracts';

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
