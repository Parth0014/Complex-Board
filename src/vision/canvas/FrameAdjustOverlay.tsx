import { useLayoutEffect, useRef } from 'react';
import Konva from 'konva';
import { Group } from 'react-konva';
import type { BoardItem } from '../document';
import type { KonvaCanvasAdapter } from './KonvaCanvasAdapter';

/** Editing-only context: reveal the uncropped source beneath an exact copy of
 * the masked frame. Reuse native transforms so every silhouette, flip, inset,
 * rotation and image effect aligns with the artwork instead of approximating it. */
export function FrameAdjustOverlay({
  adapter,
  item,
  scale,
  left,
  top,
}: {
  adapter: KonvaCanvasAdapter;
  item: BoardItem;
  scale: number;
  left: number;
  top: number;
}) {
  const host = useRef<Konva.Group>(null);
  const crop = adapter.cropDraft?.crop;
  const image = adapter.images.get(
    item.rendition || (item.contentAsset || item.asset)?.assetUrl || '',
  );
  useLayoutEffect(() => {
    const group = host.current;
    const original = group?.getStage()?.findOne<Konva.Group>(`#${item.id}`);
    const photo = original?.find<Konva.Image>('Image').find((node) => node.image() === image);
    if (!group || !original || !photo || !image) return;
    const source = photo.crop();
    const sourceWidth = source.width || image.naturalWidth;
    const sourceHeight = source.height || image.naturalHeight;
    const width = (image.naturalWidth * photo.width()) / sourceWidth;
    const height = (image.naturalHeight * photo.height()) / sourceHeight;
    const local = original
      .getAbsoluteTransform()
      .copy()
      .invert()
      .multiply(photo.getAbsoluteTransform());
    const ghost = photo.clone({
      id: '',
      name: 'frame-adjust-source',
      listening: false,
      x: (-(source.x || 0) * photo.width()) / sourceWidth,
      y: (-(source.y || 0) * photo.height()) / sourceHeight,
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
      crop: { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight },
      opacity: 1,
      strokeEnabled: false,
      shadowEnabled: false,
    });
    const context = new Konva.Group({
      ...local.decompose(),
      listening: false,
      opacity: 0.75 * photo.getAbsoluteOpacity(),
    });
    context.add(ghost);
    const framed = original.clone({
      id: '',
      name: 'frame-adjust-kept-area',
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      listening: false,
      draggable: false,
    });
    framed.find('*').forEach((node) => node.id(''));
    const cacheEffects = (node: Konva.Image) => {
      if (node.filters()?.length)
        node.cache({ pixelRatio: Math.min(2, 2000 / Math.max(node.width(), node.height())) });
    };
    cacheEffects(ghost);
    framed.find<Konva.Image>('Image').forEach(cacheEffects);
    group.add(context, framed);
    group.getLayer()?.batchDraw();
    return () => {
      group.destroyChildren();
    };
  }, [adapter, item, crop, adapter.cropDraft?.imageRotation, image, scale, left, top]);
  return (
    <Group
      ref={host}
      name="frame-adjust-overlay"
      x={left + item.x * scale}
      y={top + item.y * scale}
      rotation={item.rotation}
      scaleX={scale}
      scaleY={scale}
      listening={false}
    />
  );
}
