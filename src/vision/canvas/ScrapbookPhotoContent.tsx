import { Group, Rect, Ellipse, Image, Text, Line } from 'react-konva';
import type Konva from 'konva';
import type { BoardItem } from '../document';
import type { ImageConfig } from 'konva/lib/shapes/Image';
import type { RefObject } from 'react';
import { photoRotationTransform } from '../crop';

export function ScrapbookPhotoContent({
  item,
  image,
  imageProps,
  imageRef,
}: {
  item: BoardItem;
  image?: HTMLImageElement;
  imageProps: ImageConfig;
  imageRef: RefObject<Konva.Image | null>;
}) {
  const photo = item.scrapbookPhoto!;
  const sx = item.width / photo.width,
    sy = item.height / photo.height;
  const polaroid = photo.style === 'pol',
    outlined = photo.style === 'cut' || photo.style === 'round';
  const inset = polaroid ? 14 : outlined ? 8 : 0;
  const w = photo.width - inset * 2,
    h = photo.height - inset - (polaroid ? 56 : inset);
  const placeholder = item.templatePlaceholder;
  const plusSize = Math.min(46, w * 0.3, h * 0.3);
  const labelSize = Math.min(15, w / 7, h / 8);
  const polygon = photo.clip?.map((value, i) => (value / 100) * (i % 2 ? h : w));
  const shapedBorder = polygon && !!item.borderWidth;
  const ratio = (image?.naturalWidth || 1) / (image?.naturalHeight || 1),
    target = w / h;
  const crop =
    item.crop ||
    (ratio > target
      ? { x: (1 - target / ratio) / 2, y: 0, width: target / ratio, height: 1 }
      : { x: 0, y: (1 - ratio / target) / 2, width: 1, height: ratio / target });
  return (
    <Group scaleX={sx} scaleY={sy}>
      {shapedBorder && (
        <Line
          points={polygon}
          closed
          fill={item.borderColor || '#fffdf8'}
          shadowEnabled={!!item.shadow && item.shadow !== 'none'}
          shadowColor={item.shadowColor}
          shadowOpacity={item.shadowOpacity}
          shadowBlur={item.shadowBlur}
          shadowOffsetX={item.shadowOffsetX}
          shadowOffsetY={item.shadowOffsetY}
          listening={false}
        />
      )}
      {(polaroid || outlined) &&
        (photo.style === 'round' ? (
          <Ellipse
            x={photo.width / 2}
            y={photo.height / 2}
            radiusX={photo.width / 2}
            radiusY={photo.height / 2}
            fill="#fff"
            shadowColor="#000"
            shadowOpacity={0.27}
            shadowBlur={14}
            shadowOffsetY={5}
          />
        ) : (
          <Rect
            width={photo.width}
            height={photo.height}
            cornerRadius={outlined ? 18 : 0}
            fill={polaroid ? '#fbf8f2' : '#fff'}
            shadowColor="#000"
            shadowOpacity={0.27}
            shadowBlur={polaroid ? 22 : 14}
            shadowOffsetY={polaroid ? 8 : 5}
          />
        ))}
      <Group
        x={inset}
        y={inset}
        clipFunc={(ctx) => {
          ctx.beginPath();
          if (photo.clip) {
            ctx.moveTo((photo.clip[0] * w) / 100, (photo.clip[1] * h) / 100);
            for (let i = 2; i < photo.clip.length; i += 2)
              ctx.lineTo((photo.clip[i] * w) / 100, (photo.clip[i + 1] * h) / 100);
            ctx.closePath();
          } else if (photo.style === 'heart') {
            ctx.moveTo(w / 2, h * 0.2);
            ctx.bezierCurveTo(w * 0.2, -h * 0.12, -w * 0.25, h * 0.25, w / 2, h);
            ctx.bezierCurveTo(w * 1.25, h * 0.25, w * 0.8, -h * 0.12, w / 2, h * 0.2);
            ctx.closePath();
          } else if (photo.style === 'circle' || photo.style === 'round')
            ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          else ctx.roundRect(0, 0, w, h, outlined ? 18 : 0);
        }}
      >
        {placeholder ? (
          <>
            <Rect
              width={w}
              height={h}
              fillPriority="linear-gradient"
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: w, y: h }}
              fillLinearGradientColorStops={[0, photo.colors[0], 1, photo.colors[1]]}
            />
            <Text
              text="＋"
              y={h / 2 - plusSize * 0.7}
              width={w}
              height={plusSize}
              align="center"
              fontFamily="Scrapbook Poppins"
              fontSize={plusSize}
              fill="#ffffffd9"
            />
            <Text
              text="Add photo"
              y={h / 2 + plusSize * 0.35}
              width={w}
              height={labelSize * 1.5}
              align="center"
              fontFamily="Scrapbook Poppins"
              fontStyle="600"
              fontSize={labelSize}
              fill="#ffffffd9"
            />
          </>
        ) : (
          <Group scaleX={1 / sx} scaleY={1 / sy}>
            <Image
              {...imageProps}
              {...(shapedBorder ? { strokeEnabled: false, shadowEnabled: false } : {})}
              ref={imageRef}
              image={image}
              width={w * sx}
              height={h * sy}
              {...photoRotationTransform(
                w * sx,
                h * sy,
                item.imageRotation,
                item.flipX,
                item.flipY,
              )}
              crop={{
                x: crop.x * (image?.naturalWidth || 1),
                y: crop.y * (image?.naturalHeight || 1),
                width: crop.width * (image?.naturalWidth || 1),
                height: crop.height * (image?.naturalHeight || 1),
              }}
            />
          </Group>
        )}
      </Group>
      {shapedBorder && (
        <Line
          points={polygon}
          closed
          stroke={item.borderColor || '#fffdf8'}
          strokeWidth={item.borderWidth}
          lineJoin="round"
          listening={false}
        />
      )}
    </Group>
  );
}
