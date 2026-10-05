import type { BoardItem } from './document';

/** Convert a screen gesture to unrotated, unflipped source coordinates. */
export function dragCrop(
  crop: NonNullable<BoardItem['crop']>,
  item: Pick<BoardItem, 'width' | 'height' | 'rotation' | 'flipX' | 'flipY'>,
  dx: number,
  dy: number,
  scale: number,
) {
  const radians = (item.rotation * Math.PI) / 180;
  const x = (dx * Math.cos(radians) + dy * Math.sin(radians)) / scale;
  const y = (-dx * Math.sin(radians) + dy * Math.cos(radians)) / scale;
  return {
    ...crop,
    x: Math.max(
      0,
      Math.min(1 - crop.width, crop.x - (x / item.width) * crop.width * (item.flipX ? -1 : 1)),
    ),
    y: Math.max(
      0,
      Math.min(1 - crop.height, crop.y - (y / item.height) * crop.height * (item.flipY ? -1 : 1)),
    ),
  };
}
