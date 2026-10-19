import Konva from 'konva';
import type { VisionTextPreset } from '../contracts';
import { fontFamily } from '../fonts';
import type { DropSize } from '../dropPlacement';
export * from '../dropPlacement';

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
