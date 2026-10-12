import { useLayoutEffect, useRef } from 'react';
import Konva from 'konva';
import { Group, Image, Rect, Transformer } from 'react-konva';
import type { KonvaCanvasAdapter } from './KonvaCanvasAdapter';
import type { BoardItem } from '../document';
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
  const width = item.width * scale,
    height = item.height * scale;
  const x = (item.flipX ? 1 - crop.x - crop.width : crop.x) * width;
  const y = (item.flipY ? 1 - crop.y - crop.height : crop.y) * height;
  const w = crop.width * width,
    h = crop.height * height;
  useLayoutEffect(() => {
    if (rect.current) {
      transformer.current?.nodes([rect.current]);
      transformer.current?.getLayer()?.batchDraw();
    }
  }, [item.id]);
  const update = () => {
    const node = rect.current!;
    const nw = Math.max(Math.min(12, width), Math.min(width, node.width() * node.scaleX()));
    const nh = Math.max(Math.min(12, height), Math.min(height, node.height() * node.scaleY()));
    const nx = Math.max(0, Math.min(width - nw, node.x())),
      ny = Math.max(0, Math.min(height - nh, node.y()));
    node.scale({ x: 1, y: 1 });
    node.size({ width: nw, height: nh });
    node.position({ x: nx, y: ny });
    adapter.updateCropDraft({
      x: item.flipX ? 1 - (nx + nw) / width : nx / width,
      y: item.flipY ? 1 - (ny + nh) / height : ny / height,
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
        image={adapter.images.get(
          item.rendition || (item.contentAsset || item.asset)?.assetUrl || '',
        )}
        width={width}
        height={height}
        x={item.flipX ? width : 0}
        y={item.flipY ? height : 0}
        scaleX={item.flipX ? -1 : 1}
        scaleY={item.flipY ? -1 : 1}
        listening={false}
      />
      {[
        [0, 0, width, y],
        [0, y, x, h],
        [x + w, y, width - x - w, h],
        [0, y + h, width, height - y - h],
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
        keepRatio={false}
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
