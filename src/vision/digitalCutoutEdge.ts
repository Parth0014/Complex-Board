import type { GratitudeAsset } from '../assets/contracts';
import type { BoardItem } from './document';

export const DIGITAL_CUTOUT_EDGE_WIDTH = 8;
export const DIGITAL_CUTOUT_EDGE_COLOR = '#ffffff';

export const isDigitalCutout = (asset?: GratitudeAsset) =>
  asset?.provider === 'curated-v1' && asset.id.startsWith('studio-cutout:digital-');

/** Fill only absent settings: an explicit zero means the user removed the edge. */
export function withDigitalCutoutEdge<T extends BoardItem>(item: T): T {
  if (item.kind !== 'asset' || !isDigitalCutout(item.asset) || item.stickerWidth !== undefined)
    return item;
  return {
    ...item,
    stickerWidth: DIGITAL_CUTOUT_EDGE_WIDTH,
    stickerColor: item.stickerColor ?? DIGITAL_CUTOUT_EDGE_COLOR,
  };
}
