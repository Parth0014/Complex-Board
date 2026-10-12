import { framePaths } from './frames';
const cache = new Map<string, number>();
/** Largest centered photo rectangle contained by the actual frame silhouette. */
export function fitPhotoScale(
  win: Window & typeof globalThis,
  width: number,
  height: number,
  photoWidth: number,
  photoHeight: number,
  shape?: string,
  slotPath?: string,
  slotWidth = 100,
  slotHeight = 100,
) {
  const base = Math.min(width / photoWidth, height / photoHeight);
  const pathText = slotPath || (shape ? framePaths[shape as keyof typeof framePaths] : undefined);
  if (!pathText) return base;
  const key = [width / height, photoWidth / photoHeight, pathText, slotWidth, slotHeight].join(':');
  let fraction = cache.get(key);
  if (fraction === undefined) {
    const ctx = win.document.createElement('canvas').getContext('2d')!;
    const path = new win.Path2D(pathText);
    const w = ((photoWidth * base) / width) * slotWidth,
      h = ((photoHeight * base) / height) * slotHeight;
    const inside = (factor: number) => {
      for (let i = 0; i <= 32; i++) {
        const t = i / 32;
        for (const [x, y] of [
          [(t - 0.5) * w, -h / 2],
          [(t - 0.5) * w, h / 2],
          [-w / 2, (t - 0.5) * h],
          [w / 2, (t - 0.5) * h],
        ])
          if (!ctx.isPointInPath(path, slotWidth / 2 + x * factor, slotHeight / 2 + y * factor))
            return false;
      }
      return true;
    };
    let low = 0,
      high = 1;
    for (let i = 0; i < 18; i++) {
      const mid = (low + high) / 2;
      if (inside(mid)) low = mid;
      else high = mid;
    }
    fraction = low;
    if (cache.size > 300) cache.clear();
    cache.set(key, fraction);
  }
  return base * fraction;
}
