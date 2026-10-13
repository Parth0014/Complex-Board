import Konva from 'konva';
import type { BoardItem } from '../document';
import type { VisionPoint, VisionTextPreset } from '../contracts';
import { fontFamily } from '../fonts';

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
  const width = ['rectangle', 'cloud', 'line', 'arrow'].includes(shape) ? 240 : 200;
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

export function textDropSize(preset: VisionTextPreset, board: DropSize): DropSize {
  const text = new Konva.Text({
    text: preset.sample,
    fontSize: preset.fontSize,
    fontFamily: fontFamily(preset.fontFamily),
    padding: 8,
    lineHeight: 1.2,
  });
  const width = Math.min(board.width * 0.8, Math.max(40, Math.ceil(text.width())));
  text.width(width);
  const height = Math.ceil(text.height());
  text.destroy();
  return { width, height };
}
