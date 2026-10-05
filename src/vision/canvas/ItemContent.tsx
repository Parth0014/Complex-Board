import { memo, useEffect, useRef } from 'react';
import Konva from 'konva';
import { Group, Rect, Image, Ellipse, Line, Arrow, Star, Path, Text, TextPath } from 'react-konva';
import type { BoardItem } from '../document';
import type { KonvaCanvasAdapter } from './KonvaCanvasAdapter';
import { fontFamily } from '../fonts';
import { framePaths } from '../frames';
import { shapeGeometry } from '../shapeGeometry';
import { RichText } from './RichText';
const glitchFilter = (data: ImageData) => {
  const original = new Uint8ClampedArray(data.data);
  for (let y = 0; y < data.height; y++)
    for (let x = 0; x < data.width; x++) {
      const index = (y * data.width + x) * 4;
      data.data[index] = original[(y * data.width + Math.max(0, x - 4)) * 4];
      data.data[index + 2] = original[(y * data.width + Math.min(data.width - 1, x + 4)) * 4 + 2];
    }
};
function colorBalance(this: Konva.Node, data: ImageData) {
  const warmth = Number(this.getAttr('warmth') || 0) / 4,
    tint = Number(this.getAttr('tint') || 0) / 10;
  for (let i = 0; i < data.data.length; i += 4) {
    data.data[i] += warmth + tint;
    data.data[i + 1] -= tint;
    data.data[i + 2] -= warmth;
  }
}

function Content({
  item: input,
  adapter,
}: {
  item: BoardItem;
  adapter: KonvaCanvasAdapter;
  imageToken?: HTMLImageElement;
  previewToken?: object | boolean;
}) {
  const item = adapter.originalPreview
    ? {
        ...input,
        crop: undefined,
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0,
        warmth: 0,
        tint: 0,
        filter: 'original' as const,
        effect: 'none' as const,
      }
    : adapter.cropDraft?.id === input.id
      ? { ...input, crop: adapter.cropDraft.crop }
      : input;
  const imageRef = useRef<Konva.Image>(null);
  const image = adapter.images.get(
    (!adapter.originalPreview && item.rendition) ||
      (item.contentAsset || item.asset)?.assetUrl ||
      '',
  );
  const filtered = !!(
    item.brightness ||
    item.contrast ||
    item.saturation ||
    item.blur ||
    item.effect === 'glitch' ||
    item.filter === 'mono' ||
    item.warmth ||
    item.tint
  );
  useEffect(() => {
    const node = imageRef.current;
    if (!node || !image) return;
    if (filtered) node.cache({ pixelRatio: 2 });
    else node.clearCache();
    node.getLayer()?.batchDraw();
  }, [
    image,
    item.width,
    item.height,
    item.crop,
    item.imageFit,
    item.flipX,
    item.flipY,
    item.brightness,
    item.contrast,
    item.saturation,
    item.blur,
    item.effect,
    item.filter,
    item.warmth,
    item.tint,
    filtered,
  ]);
  const dash =
    item.borderStyle === 'dashed' ? [12, 8] : item.borderStyle === 'dotted' ? [2, 6] : undefined;
  const common = {
    fillEnabled: !item.noFill,
    fill: item.color || item.fill || '#b48ce3',
    stroke: item.borderColor || '#33272b',
    strokeWidth:
      item.effect === 'outline' ? Math.max(2, item.borderWidth || 0) : item.borderWidth || 0,
    dash,
    shadowEnabled: (!!item.shadow && item.shadow !== 'none') || item.effect === 'glow',
    shadowColor: item.shadowColor || (item.effect === 'glow' ? item.color || '#b48ce3' : '#000'),
    shadowOpacity: item.shadowOpacity ?? (item.effect === 'glow' ? 0.8 : 0.25),
    shadowBlur:
      item.shadowBlur ??
      (item.effect === 'glow'
        ? 20
        : item.shadow === 'soft'
          ? 20
          : item.shadow === 'medium'
            ? 10
            : 0),
    shadowOffsetX:
      item.shadowOffsetX ?? (item.shadow === 'hard' ? 6 : item.effect === 'glow' ? 0 : 3),
    shadowOffsetY:
      item.shadowOffsetY ?? (item.shadow === 'hard' ? 6 : item.effect === 'glow' ? 0 : 5),
    fillPriority: item.gradient
      ? item.gradientType === 'radial'
        ? 'radial-gradient'
        : 'linear-gradient'
      : 'color',
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: item.width, y: item.height },
    fillLinearGradientColorStops: [
      0,
      item.color || item.fill || '#b48ce3',
      1,
      item.gradient || '#fff',
    ],
    fillRadialGradientStartPoint: { x: item.width / 2, y: item.height / 2 },
    fillRadialGradientEndPoint: { x: item.width / 2, y: item.height / 2 },
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndRadius: Math.max(item.width, item.height) / 2,
    fillRadialGradientColorStops: [
      0,
      item.color || item.fill || '#b48ce3',
      1,
      item.gradient || '#fff',
    ],
  };
  if (item.kind === 'text') {
    if (item.textRuns?.length || item.kerning === false || item.ligatures === false)
      return (
        <Group clipWidth={item.width} clipHeight={item.height}>
          <Rect width={item.width} height={item.height} fill="transparent" listening={false} />
          {item.textBackground && (
            <Rect
              width={item.width}
              height={item.height}
              fill={item.textBackground}
              cornerRadius={item.radius || 0}
            />
          )}
          <RichText item={item} ownerWindow={adapter.ownerWindow} common={common} />
        </Group>
      );
    const textProps = {
      text: item.text,
      padding: item.textPadding || 0,
      verticalAlign: 'middle',
      fontSize: item.fontSize,
      fontFamily: fontFamily(item.fontFamily),
      fontStyle:
        [
          item.bold ? 'bold' : item.fontWeight ? String(item.fontWeight) : '',
          item.italic ? 'italic' : '',
        ]
          .filter(Boolean)
          .join(' ') || 'normal',
      textDecoration: [item.underline ? 'underline' : '', item.strike ? 'line-through' : '']
        .filter(Boolean)
        .join(' '),
      letterSpacing: item.letterSpacing || 0,
      ...common,
      strokeWidth: item.effect === 'outline' ? 2 : 0,
      stroke: item.borderColor || '#33272b',
    };
    return (
      <Group
        clipWidth={item.curve ? undefined : item.width}
        clipHeight={item.curve ? undefined : item.height}
      >
        <Rect width={item.width} height={item.height} fill="transparent" listening={false} />
        {item.textBackground && (
          <Rect
            width={item.width}
            height={item.height}
            fill={item.textBackground}
            cornerRadius={item.radius || 0}
          />
        )}
        {item.effect === 'echo' && (
          <Text {...textProps} x={5} y={5} opacity={0.25} width={item.width} height={item.height} />
        )}
        {item.effect === 'glitch' && (
          <>
            <Text
              {...textProps}
              fillPriority="color"
              fill="#ed5897"
              x={-3}
              opacity={0.6}
              width={item.width}
              height={item.height}
            />
            <Text
              {...textProps}
              fillPriority="color"
              fill="#31b9d0"
              x={3}
              opacity={0.6}
              width={item.width}
              height={item.height}
            />
          </>
        )}
        {item.curve ? (
          <TextPath
            {...textProps}
            data={`M0 ${item.height / 2} Q${item.width / 2} ${item.height / 2 - item.curve} ${item.width} ${item.height / 2}`}
          />
        ) : (
          <Text
            {...textProps}
            width={item.width}
            height={item.height}
            align={item.align}
            lineHeight={item.lineHeight || 1}
          />
        )}
      </Group>
    );
  }
  if (item.kind === 'drawing') {
    const xs = (item.points || []).filter((_, i) => i % 2 === 0),
      ys = (item.points || []).filter((_, i) => i % 2 === 1),
      w = Math.max(...xs, 1),
      h = Math.max(...ys, 1);
    return (
      <Line
        {...common}
        points={(item.points || []).map((n, i) => n * (i % 2 ? item.height / h : item.width / w))}
        stroke={item.color || '#33272b'}
        strokeWidth={item.strokeWidth || 4}
        lineCap="round"
        lineJoin="round"
        tension={0.35}
        hitStrokeWidth={20}
      />
    );
  }
  if (item.kind === 'shape') {
    const geometry = shapeGeometry[item.shape || ''];
    if (geometry && item.shape !== 'rectangle')
      return (
        <Path
          {...common}
          data={geometry.path}
          x={(-geometry.x * item.width) / geometry.width}
          y={(-geometry.y * item.height) / geometry.height}
          scaleX={item.width / geometry.width}
          scaleY={item.height / geometry.height}
          strokeScaleEnabled={false}
        />
      );
    if (item.shape === 'circle')
      return (
        <Ellipse
          {...common}
          x={item.width / 2}
          y={item.height / 2}
          radiusX={item.width / 2}
          radiusY={item.height / 2}
        />
      );
    if (item.shape === 'triangle')
      return (
        <Line
          {...common}
          points={[item.width / 2, 0, item.width, item.height, 0, item.height]}
          closed
        />
      );
    if (item.shape === 'star' || item.shape === 'burst')
      return (
        <Star
          {...common}
          x={item.width / 2}
          y={item.height / 2}
          numPoints={item.shape === 'burst' ? 12 : 5}
          innerRadius={Math.min(item.width, item.height) * 0.22}
          outerRadius={Math.min(item.width, item.height) / 2}
        />
      );
    if (item.shape === 'line' || item.shape === 'arrow') {
      const props = {
        points: [0, item.height / 2, item.width, item.height / 2],
        stroke: item.color || '#33272b',
        fill: item.color || '#33272b',
        strokeWidth: item.borderWidth || item.strokeWidth || 4,
        hitStrokeWidth: Math.max(24, item.borderWidth || item.strokeWidth || 4),
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        dash,
      };
      return (
        <Group>
          <Rect width={item.width} height={item.height} fill="transparent" />
          {item.shape === 'arrow' ? <Arrow {...props} /> : <Line {...props} />}
        </Group>
      );
    }
    if (item.shape === 'heart' || item.shape === 'cloud' || item.shape === 'blob')
      return (
        <Path
          {...common}
          scaleX={item.width / 100}
          scaleY={item.height / 100}
          data={
            item.shape === 'heart'
              ? 'M50 95C-30 35 5-15 50 20C95-15 130 35 50 95Z'
              : item.shape === 'cloud'
                ? 'M20 80C-10 80-5 40 20 40C15 5 65 0 70 30C110 20 120 80 85 80Z'
                : 'M20 10C70-20 120 40 90 85C60 120-20 75 20 10Z'
          }
        />
      );
    return (
      <Rect {...common} width={item.width} height={item.height} cornerRadius={item.radius || 0} />
    );
  }
  const source = item.contentAsset || item.asset,
    sourceRatio = (source?.width || 1) / (source?.height || 1),
    targetRatio = item.width / item.height;
  const cover =
    sourceRatio > targetRatio
      ? {
          x: (1 - targetRatio / sourceRatio) / 2,
          y: 0,
          width: targetRatio / sourceRatio,
          height: 1,
        }
      : {
          x: 0,
          y: (1 - sourceRatio / targetRatio) / 2,
          width: 1,
          height: sourceRatio / targetRatio,
        };
  const crop =
    item.crop || (item.imageFit === 'fill' ? cover : { x: 0, y: 0, width: 1, height: 1 });
  const fit = item.imageFit === 'fit',
    displayWidth = fit ? Math.min(item.width, item.height * sourceRatio) : item.width,
    displayHeight = fit ? Math.min(item.height, item.width / sourceRatio) : item.height;
  const imageProps = {
    ...common,
    fill: 'transparent',
    strokeEnabled: false,
    ref: imageRef,
    image,
    width: displayWidth,
    height: displayHeight,
    crop: {
      x: crop.x * (image?.naturalWidth || source?.width || 1),
      y: crop.y * (image?.naturalHeight || source?.height || 1),
      width: crop.width * (image?.naturalWidth || source?.width || 1),
      height: crop.height * (image?.naturalHeight || source?.height || 1),
    },
    x: (item.width - displayWidth) / 2 + (item.flipX ? displayWidth : 0),
    y: (item.height - displayHeight) / 2 + (item.flipY ? displayHeight : 0),
    scaleX: item.flipX ? -1 : 1,
    scaleY: item.flipY ? -1 : 1,
    filters: filtered
      ? [
          Konva.Filters.Brighten,
          Konva.Filters.Contrast,
          Konva.Filters.HSL,
          Konva.Filters.Blur,
          colorBalance,
          ...(item.filter === 'mono' ? [Konva.Filters.Grayscale] : []),
          ...(item.effect === 'glitch' ? [glitchFilter] : []),
        ]
      : [],
    brightness: item.brightness || 0,
    contrast: item.contrast || 0,
    saturation: item.saturation || 0,
    blurRadius: item.blur || 0,
    warmth: item.warmth || 0,
    tint: item.tint || 0,
  };
  const frame = item.asset?.frameSlot && item.asset.slotPath && item.contentAsset;
  const mask = item.frameShape && framePaths[item.frameShape];
  const path = frame
    ? new adapter.ownerWindow.Path2D(item.asset!.slotPath!)
    : mask
      ? new adapter.ownerWindow.Path2D(mask)
      : undefined;
  const clipWidth = frame ? item.asset!.width! : 100,
    clipHeight = frame ? item.asset!.height! : 100;
  return (
    <>
      <Rect
        width={item.width}
        height={item.height}
        {...common}
        fillPriority="color"
        fillEnabled={false}
        strokeEnabled={false}
      />
      {path ? (
        <Group
          scaleX={item.width / clipWidth}
          scaleY={item.height / clipHeight}
          clipFunc={() => [path]}
        >
          <Image
            {...imageProps}
            width={(displayWidth / item.width) * clipWidth}
            height={(displayHeight / item.height) * clipHeight}
            x={
              ((item.width - displayWidth) / 2 / item.width) * clipWidth +
              (item.flipX ? (displayWidth / item.width) * clipWidth : 0)
            }
            y={
              ((item.height - displayHeight) / 2 / item.height) * clipHeight +
              (item.flipY ? (displayHeight / item.height) * clipHeight : 0)
            }
          />
        </Group>
      ) : item.radius ? (
        <Group
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.roundRect(0, 0, item.width, item.height, item.radius || 0);
          }}
        >
          <Image {...imageProps} />
        </Group>
      ) : (
        <Image {...imageProps} />
      )}
      {frame && (
        <Image
          {...common}
          image={adapter.images.get(item.asset!.assetUrl)}
          width={item.width}
          height={item.height}
          listening={false}
        />
      )}
      {!!item.borderWidth &&
        (mask ? (
          <Path
            {...common}
            data={mask}
            scaleX={item.width / 100}
            scaleY={item.height / 100}
            strokeScaleEnabled={false}
            fillEnabled={false}
            listening={false}
          />
        ) : (
          <Rect
            {...common}
            fillEnabled={false}
            width={item.width}
            height={item.height}
            cornerRadius={item.radius || 0}
            listening={false}
          />
        ))}
    </>
  );
}

// Selection changes do not change artwork. Explicit tokens still refresh image
// loading and non-destructive previews held outside the document.
export const ItemContent = memo(Content);
