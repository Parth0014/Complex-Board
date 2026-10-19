import { useLayoutEffect, useRef } from 'react';
import Konva from 'konva';
import { Group, Rect, Transformer } from 'react-konva';
import type { BoardItem } from '../document';
import type { KonvaCanvasAdapter } from './KonvaCanvasAdapter';
import { photoAperture } from '../crop';
import { canvasColors } from './colors';

/** A rotate-only editing target; the real frame never becomes a transform node. */
export function PhotoRotationHandle({
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
  const target = useRef<Konva.Rect>(null),
    transformer = useRef<Konva.Transformer>(null);
  const aperture = photoAperture(item);
  const width = aperture.width * scale,
    height = aperture.height * scale;
  const inset =
    item.scrapbookPhoto?.style === 'pol'
      ? 14
      : item.scrapbookPhoto?.style === 'cut' || item.scrapbookPhoto?.style === 'round'
        ? 8
        : 0;
  const x = ((item.width - aperture.width) / 2) * scale;
  const y = item.scrapbookPhoto ? ((inset * item.height) / item.scrapbookPhoto.height) * scale : 0;
  const rotation = adapter.cropDraft?.imageRotation || 0;
  const color = canvasColors(adapter.ownerWindow.document).selection;
  useLayoutEffect(() => {
    if (target.current) transformer.current?.nodes([target.current]);
    transformer.current?.getLayer()?.batchDraw();
  }, [item.id]);
  return (
    <Group
      x={left + item.x * scale}
      y={top + item.y * scale}
      rotation={item.rotation}
      onMouseDown={(event) => {
        event.cancelBubble = true;
      }}
      onTouchStart={(event) => {
        event.cancelBubble = true;
      }}
    >
      <Rect
        ref={target}
        name="photo-rotation-target"
        x={x + width / 2}
        y={y + height / 2}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        rotation={rotation}
        listening={false}
        onTransform={() => {
          if (target.current) adapter.rotateImageCrop(target.current.rotation());
        }}
        onTransformEnd={() => {
          if (target.current) adapter.rotateImageCrop(target.current.rotation());
        }}
      />
      <Transformer
        ref={transformer}
        name="photo-rotation-handle"
        resizeEnabled={false}
        enabledAnchors={[]}
        rotateEnabled
        rotateAnchorOffset={28}
        rotateAnchorCursor="grab"
        flipEnabled={false}
        borderStroke={color}
        borderDash={[4, 4]}
        anchorStroke={color}
        anchorFill="white"
        anchorSize={10}
        anchorCornerRadius={5}
        rotationSnaps={[0, 90, 180, 270]}
        rotationSnapTolerance={4}
      />
    </Group>
  );
}
