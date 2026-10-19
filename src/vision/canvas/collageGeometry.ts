import { create, build, bounds } from '../structuredDividers';
import { COLLAGE_MIN_PHOTOS, COLLAGE_MAX_PHOTOS } from '../collagePresets';
import { interlockingDesigns } from '../interlockingGeometry';

export interface ResolvedFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  photo: number;
  clip: number[];
}
export function pointInPolygon(points: readonly number[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
    const ax = points[i],
      ay = points[i + 1],
      bx = points[j],
      by = points[j + 1];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
const geometryCache = new Map<string, ResolvedFrame[]>();
export function collageFrames(
  id: string,
  count: number,
  width: number,
  height: number,
): ResolvedFrame[] {
  if (!Number.isInteger(count) || count < COLLAGE_MIN_PHOTOS || count > COLLAGE_MAX_PHOTOS)
    throw Error('Select 5 to 10 photos.');
  if (!(width > 0 && height > 0 && Number.isFinite(width + height)))
    throw Error('Invalid board size.');
  const design = interlockingDesigns.find((d) => `interlocking:${d.id}` === id);
  if (!design) throw Error('Unknown collage.');
  const ratio = width / height;
  const key = `${id}:${count}:${ratio}`;
  const cached = geometryCache.get(key);
  if (cached) return cached;
  const model = create(design, count, ratio);
  const result = build(model, model.initialParams).polygons.map((points, photo) => {
    const frame = bounds(points);
    return {
      x: frame.x,
      y: frame.y,
      w: frame.w,
      h: frame.h,
      photo,
      clip: points.flatMap(([x, y]) => [
        (100 * (x - frame.x)) / frame.w,
        (100 * (y - frame.y)) / frame.h,
      ]),
    };
  });
  if (geometryCache.size >= 128) geometryCache.delete(geometryCache.keys().next().value!);
  geometryCache.set(key, result);
  return result;
}
