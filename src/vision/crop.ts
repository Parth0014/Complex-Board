import type { BoardItem } from './document';

/** Rotate only the photo, compensating its scale so the fixed frame stays
 * covered at every angle. The image offset remains at its own center. */
export function photoRotationTransform(
  width: number,
  height: number,
  rotation = 0,
  flipX = false,
  flipY = false,
  displayWidth = width,
  displayHeight = height,
) {
  const angle = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle)),
    sin = Math.abs(Math.sin(angle));
  const scale = Math.max(cos + (sin * height) / width, cos + (sin * width) / height);
  return {
    x: width / 2,
    y: height / 2,
    offsetX: displayWidth / 2,
    offsetY: displayHeight / 2,
    rotation,
    scaleX: (flipX ? -1 : 1) * scale,
    scaleY: (flipY ? -1 : 1) * scale,
  };
}

export function photoAperture(item: BoardItem) {
  const photo = item.scrapbookPhoto;
  if (!photo) return { width: item.width, height: item.height };
  const inset =
    photo.style === 'pol' ? 14 : photo.style === 'cut' || photo.style === 'round' ? 8 : 0;
  return {
    width: ((photo.width - inset * 2) * item.width) / photo.width,
    height:
      ((photo.height - inset - (photo.style === 'pol' ? 56 : inset)) * item.height) / photo.height,
  };
}

export function coverCrop(sourceRatio: number, targetRatio: number) {
  return sourceRatio > targetRatio
    ? { x: (1 - targetRatio / sourceRatio) / 2, y: 0, width: targetRatio / sourceRatio, height: 1 }
    : { x: 0, y: (1 - sourceRatio / targetRatio) / 2, width: 1, height: sourceRatio / targetRatio };
}

/** Map the full source around the viewport already displayed by ItemContent.
 * This reference stays fixed throughout a crop gesture, rather than stretching
 * the full original into the (potentially square) cropped frame. */
export function cropPreviewGeometry(item: BoardItem, sourceWidth: number, sourceHeight: number) {
  const frame = item.contentSize && !item.imageFit ? item.contentSize : item;
  const initial =
    item.crop ||
    (item.imageFit === 'fill'
      ? coverCrop(sourceWidth / sourceHeight, frame.width / frame.height)
      : { x: 0, y: 0, width: 1, height: 1 });
  const fit =
    item.imageFit === 'fit'
      ? Math.min(
          frame.width / (sourceWidth * initial.width),
          frame.height / (sourceHeight * initial.height),
        )
      : 1;
  const displayWidth = item.imageFit === 'fit' ? sourceWidth * initial.width * fit : frame.width;
  const displayHeight =
    item.imageFit === 'fit' ? sourceHeight * initial.height * fit : frame.height;
  const width = displayWidth / initial.width,
    height = displayHeight / initial.height;
  return {
    width,
    height,
    x:
      (frame.width - displayWidth) / 2 -
      (item.flipX ? 1 - initial.x - initial.width : initial.x) * width,
    y:
      (frame.height - displayHeight) / 2 -
      (item.flipY ? 1 - initial.y - initial.height : initial.y) * height,
    aspect: displayWidth / displayHeight,
  };
}

/** Keep the source aspect ratio and focal point while zooming within a fixed frame. */
export function zoomCrop(
  crop: NonNullable<BoardItem['crop']>,
  base: NonNullable<BoardItem['crop']>,
  zoom: number,
) {
  const factor = Math.max(1, Math.min(5, zoom));
  const width = base.width / factor,
    height = base.height / factor;
  return {
    x: Math.max(0, Math.min(1 - width, crop.x + crop.width / 2 - width / 2)),
    y: Math.max(0, Math.min(1 - height, crop.y + crop.height / 2 - height / 2)),
    width,
    height,
  };
}

/** Keep the source point under the fingers/cursor fixed. Moving the pinch
 * midpoint also pans the photo. Points are normalized in the displayed image. */
export function gestureCrop(
  crop: NonNullable<BoardItem['crop']>,
  base: NonNullable<BoardItem['crop']>,
  factor: number,
  from: { x: number; y: number },
  to = from,
) {
  const next = zoomCrop(crop, base, (base.width / crop.width) * factor);
  return {
    ...next,
    x: Math.max(0, Math.min(1 - next.width, crop.x + from.x * crop.width - to.x * next.width)),
    y: Math.max(0, Math.min(1 - next.height, crop.y + from.y * crop.height - to.y * next.height)),
  };
}

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
