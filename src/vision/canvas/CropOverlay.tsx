import { useLayoutEffect, useRef } from 'react';
import Konva from 'konva';
import { Group, Image, Rect, Transformer } from 'react-konva';
import type { KonvaCanvasAdapter } from './KonvaCanvasAdapter';
import type { BoardItem } from '../document';
import { cropPreviewGeometry } from '../crop';
import { FrameAdjustOverlay } from './FrameAdjustOverlay';
import { PhotoRotationHandle } from './PhotoRotationHandle';
export function CropOverlay({
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
  const rect = useRef<Konva.Rect>(null),
    transformer = useRef<Konva.Transformer>(null);
  const crop = adapter.cropDraft!.crop;
  const source = item.contentAsset || item.asset;
  const image = adapter.images.get(item.rendition || source?.assetUrl || '');
  const preview = cropPreviewGeometry(
    item,
    image?.naturalWidth || source?.width || 1,
    image?.naturalHeight || source?.height || 1,
  );
  const width = preview.width * scale,
    height = preview.height * scale,
    originX = preview.x * scale,
    originY = preview.y * scale;
  const x = originX + (item.flipX ? 1 - crop.x - crop.width : crop.x) * width;
  const y = originY + (item.flipY ? 1 - crop.y - crop.height : crop.y) * height;
  const w = crop.width * width,
    h = crop.height * height;
  useLayoutEffect(() => {
    if (rect.current) {
      transformer.current?.nodes([rect.current]);
      transformer.current?.getLayer()?.batchDraw();
    }
  }, [item.id]);
  if (adapter.cropDraft?.base)
    return (
      <>
        <FrameAdjustOverlay adapter={adapter} item={item} scale={scale} left={left} top={top} />
        <PhotoRotationHandle adapter={adapter} item={item} scale={scale} left={left} top={top} />
      </>
    );
  const update = () => {
    const node = rect.current!;
    const maxWidth = Math.min(width, height * preview.aspect);
    const nw = Math.max(
      Math.min(maxWidth, Math.max(12, 12 * preview.aspect)),
      Math.min(maxWidth, node.width() * node.scaleX()),
    );
    const nh = nw / preview.aspect;
    const nx = Math.max(originX, Math.min(originX + width - nw, node.x())),
      ny = Math.max(originY, Math.min(originY + height - nh, node.y()));
    node.scale({ x: 1, y: 1 });
    node.size({ width: nw, height: nh });
    node.position({ x: nx, y: ny });
    adapter.updateCropDraft({
      x: item.flipX ? 1 - (nx - originX + nw) / width : (nx - originX) / width,
      y: item.flipY ? 1 - (ny - originY + nh) / height : (ny - originY) / height,
      width: nw / width,
      height: nh / height,
    });
  };
  return (
    <Group
      x={left + item.x * scale}
      y={top + item.y * scale}
      rotation={item.rotation}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
    >
      <Image
        name="crop-source-preview"
        image={image}
        width={width}
        height={height}
        x={originX + (item.flipX ? width : 0)}
        y={originY + (item.flipY ? height : 0)}
        scaleX={item.flipX ? -1 : 1}
        scaleY={item.flipY ? -1 : 1}
        listening={false}
      />
      {[
        [originX, originY, width, y - originY],
        [originX, y, x - originX, h],
        [x + w, y, originX + width - x - w, h],
        [originX, y + h, width, originY + height - y - h],
      ].map(([sx, sy, sw, sh], i) => (
        <Rect
          key={i}
          x={sx}
          y={sy}
          width={Math.max(0, sw)}
          height={Math.max(0, sh)}
          fill="black"
          opacity={0.5}
          listening={false}
        />
      ))}
      <Rect
        ref={rect}
        name="crop-boundary"
        x={x}
        y={y}
        width={w}
        height={h}
        stroke="white"
        strokeWidth={1}
        draggable
        onDragMove={update}
        onTransform={update}
        onDragEnd={update}
        onTransformEnd={update}
      />
      <Transformer
        ref={transformer}
        name="crop-handles"
        rotateEnabled={false}
        flipEnabled={false}
        keepRatio
        enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        ignoreStroke
        borderStroke="white"
        anchorStroke="black"
        anchorFill="white"
        anchorSize={12}
        anchorCornerRadius={0}
        boundBoxFunc={(oldBox, newBox) =>
          Math.abs(newBox.width) < 12 || Math.abs(newBox.height) < 12 ? oldBox : newBox
        }
      />
    </Group>
  );
}
