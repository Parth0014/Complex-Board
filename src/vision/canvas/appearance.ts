import type { ShapeConfig } from 'konva/lib/Shape';
import type { EditableItem, Paint } from '../appearance/types';

/** Paint coordinates retain the existing geometry contract, shared by canvas and export. */
export function paintToKonva(paint: Paint, width: number, height: number): ShapeConfig {
  const stops = paint.kind === 'solid' ? undefined : [0, paint.stops[0], 1, paint.stops[1]];
  return {
    fill: paint.kind === 'solid' ? paint.color : paint.stops[0],
    fillPriority: paint.kind === 'solid' ? 'color' : `${paint.kind}-gradient`,
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: width, y: height },
    fillLinearGradientColorStops: stops,
    fillRadialGradientStartPoint: { x: width / 2, y: height / 2 },
    fillRadialGradientEndPoint: { x: width / 2, y: height / 2 },
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndRadius: Math.max(width, height) / 2,
    fillRadialGradientColorStops: stops,
  };
}

/** One canonical mapping. Group opacity is applied once by the canvas/export owner. */
export function appearanceToKonva(item: EditableItem): ShapeConfig {
  const { stroke, shadow } = item.appearance;
  return {
    ...('fill' in item.appearance
      ? paintToKonva(item.appearance.fill.paint, item.width, item.height)
      : { fill: stroke.color }),
    // Open Konva Lines paint only their stroke. Retain their fill flag so
    // Konva's perfect-draw buffer composites stroke opacity/shadow as before.
    fillEnabled: 'fill' in item.appearance ? item.appearance.fill.enabled : item.kind === 'drawing',
    stroke: stroke.color,
    strokeWidth: stroke.width,
    dash: stroke.style === 'dashed' ? [12, 8] : stroke.style === 'dotted' ? [2, 6] : undefined,
    lineCap: stroke.cap,
    lineJoin: stroke.join,
    strokeScaleEnabled: stroke.scaling === 'transform',
    shadowEnabled: shadow.enabled,
    shadowColor: shadow.color,
    shadowOpacity: shadow.opacity,
    shadowBlur: shadow.blur,
    shadowOffsetX: shadow.offsetX,
    shadowOffsetY: shadow.offsetY,
  };
}
