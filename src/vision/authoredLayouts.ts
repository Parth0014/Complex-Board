import portrait from './generatedLayouts/portrait.json';
import square from './generatedLayouts/square.json';
import landscape from './generatedLayouts/landscape.json';
import palettes from './generatedLayouts/palettes.json';
import { createAppearance } from './appearance/defaults';
import type { BoardItem } from './document';
import type { GratitudeAsset } from '../assets/contracts';
import { SCRAPBOOK_PHOTO_PLACEHOLDER } from './scrapbookPresets';

type Layer = {
  id: string;
  kind: string;
  z: number;
  role?: string;
  text?: string;
  poly_normalized: number[][];
  style: {
    fill?: string;
    color?: string;
    stroke?: string | null;
    shadow?: boolean;
    width?: number;
    font?: string;
    fontSize?: number;
    align?: string;
  };
};
type Recipe = { id: string; name: string; image_count: number; layers: Layer[] };
const datasets = {
  portrait: portrait.templates,
  square: square.templates,
  landscape: landscape.templates,
} as unknown as Record<string, Record<string, Recipe>>;
const title = (value: string) =>
  value
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
const presets = Object.entries(datasets.portrait).map(([key, recipe], index) => ({
  id: `authored:${key}`,
  key,
  label: `${title(recipe.id)} ${key.slice(-2)}`,
  slots: recipe.image_count,
  family: recipe.id,
  palette: Object.keys(palettes)[Math.floor(index / 2) % Object.keys(palettes).length],
}));
export const AUTHORED_LAYOUT_VERSION = 'authored-smart-count-v3';
export const isAuthoredLayout = (id: string) => presets.some((p) => p.id === id);
function recipeFor(id: string, width: number, height: number) {
  const preset = presets.find((p) => p.id === id);
  if (!preset) throw new Error('Unknown layout.');
  const ratio = height / width;
  const dataset = ratio > 1.3 ? 'portrait' : ratio < 0.8 ? 'landscape' : 'square';
  return { preset, recipe: datasets[dataset][preset.key] };
}
export function authoredCollagesForBoard(width: number, height: number, count?: number) {
  const list = presets.map((p) => {
    const naturalCount = recipeFor(p.id, width, height).recipe.image_count;
    const distance = count ? Math.abs(naturalCount - count) : 0;
    return {
      ...p,
      naturalSlots: naturalCount,
      slots: count || naturalCount,
      resolution: { width, height },
      isExactMatch: count ? naturalCount === count : true,
      distance,
    };
  });
  if (count && count > 0) {
    return list.sort((a, b) => a.distance - b.distance);
  }
  return list;
}

type Point = number[];
const polygonArea = (p: Point[]) => {
  let sum = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
};

function hull(points: Point[]) {
  if (points.length <= 4) return points;
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (a: Point, b: Point, c: Point) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function cutPolygon(poly: Point[], axis: number, cut: number, before: boolean) {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    const insideA = before ? a[axis] <= cut : a[axis] >= cut,
      insideB = before ? b[axis] <= cut : b[axis] >= cut;
    if (insideA) out.push(a);
    if (insideA !== insideB) {
      const t = (cut - a[axis]) / (b[axis] - a[axis]);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}
const smartLayersCache = new Map<string, Layer[]>();

/** Merge nearby slots for smaller batches; split large polygons for larger batches.
 * Original masks and decorative layers remain authored rather than replaced by a grid. */
function smartLayers(layers: Layer[], count: number, aspect: number, cacheKey?: string) {
  if (!count) return layers;
  const key = cacheKey ? `${cacheKey}:${count}:${aspect.toFixed(4)}` : undefined;
  if (key && smartLayersCache.has(key)) {
    return smartLayersCache.get(key)!;
  }
  const originals = layers.filter((l) => l.kind === 'photo');
  const photos = originals.map((l) => ({ ...l }));
  let serial = 0;
  const areas = new Map<string, number>();
  const getArea = (id: string, poly: Point[]) => {
    let a = areas.get(id);
    if (a === undefined) {
      a = polygonArea(poly);
      areas.set(id, a);
    }
    return a;
  };

  const bboxes = new Map<string, [number, number, number, number]>();
  const getBBox = (id: string, poly: Point[]) => {
    let b = bboxes.get(id);
    if (!b) {
      let minX = 1,
        minY = 1,
        maxX = 0,
        maxY = 0;
      for (const p of poly) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      }
      b = [minX, minY, maxX, maxY];
      bboxes.set(id, b);
    }
    return b;
  };

  while (photos.length > count) {
    let best: { a: number; b: number; poly: Point[]; score: number } | undefined;
    for (let a = 0; a < photos.length; a++) {
      const areaA = getArea(photos[a].id, photos[a].poly_normalized);
      const bboxA = getBBox(photos[a].id, photos[a].poly_normalized);
      for (let b = a + 1; b < photos.length; b++) {
        const bboxB = getBBox(photos[b].id, photos[b].poly_normalized);
        const dist = Math.max(
          0,
          bboxB[0] - bboxA[2],
          bboxA[0] - bboxB[2],
          bboxB[1] - bboxA[3],
          bboxA[1] - bboxB[3],
        );
        if (dist > 0.08) continue;
        const areaB = getArea(photos[b].id, photos[b].poly_normalized);
        const poly = hull([...photos[a].poly_normalized, ...photos[b].poly_normalized]);
        const polyA = polygonArea(poly);
        const inflation = Math.max(0, polyA - areaA - areaB);
        const score =
          inflation * 10 +
          polyA +
          (['hero', 'feature'].includes(photos[a].role || '') &&
          ['hero', 'feature'].includes(photos[b].role || '')
            ? 0.1
            : 0);
        if (!best || score < best.score) best = { a, b, poly, score };
      }
    }
    if (!best) {
      // Fallback if no pair passed the proximity filter
      for (let a = 0; a < photos.length; a++) {
        const areaA = getArea(photos[a].id, photos[a].poly_normalized);
        for (let b = a + 1; b < photos.length; b++) {
          const areaB = getArea(photos[b].id, photos[b].poly_normalized);
          const poly = hull([...photos[a].poly_normalized, ...photos[b].poly_normalized]);
          const polyA = polygonArea(poly);
          const inflation = Math.max(0, polyA - areaA - areaB);
          const score =
            inflation * 10 +
            polyA +
            (['hero', 'feature'].includes(photos[a].role || '') &&
            ['hero', 'feature'].includes(photos[b].role || '')
              ? 0.1
              : 0);
          if (!best || score < best.score) best = { a, b, poly, score };
        }
      }
    }
    const { a, b, poly } = best!;
    const newId = `${photos[a].id}+${photos[b].id}`;
    areas.set(newId, polygonArea(poly));
    photos[a] = {
      ...photos[a],
      id: newId,
      poly_normalized: poly,
      z: Math.min(photos[a].z, photos[b].z),
    };
    photos.splice(b, 1);
  }
  while (photos.length < count) {
    const largest = photos.reduce(
      (best, p, i) =>
        polygonArea(p.poly_normalized) > polygonArea(photos[best].poly_normalized) ? i : best,
      0,
    );
    const layer = photos[largest],
      poly = layer.poly_normalized;
    const minX = Math.min(...poly.map((p) => p[0])),
      maxX = Math.max(...poly.map((p) => p[0])),
      minY = Math.min(...poly.map((p) => p[1])),
      maxY = Math.max(...poly.map((p) => p[1]));
    const axis = maxX - minX > (maxY - minY) * aspect ? 0 : 1,
      cut = axis === 0 ? (minX + maxX) / 2 : (minY + maxY) / 2;
    const gap = 0.001;
    const first = cutPolygon(poly, axis, cut - gap / 2, true),
      second = cutPolygon(poly, axis, cut + gap / 2, false);
    photos.splice(
      largest,
      1,
      { ...layer, id: `${layer.id}-a${serial}`, poly_normalized: first },
      { ...layer, id: `${layer.id}-b${serial++}`, poly_normalized: second },
    );
  }
  const unchanged = new Set(
    photos
      .filter((p) =>
        originals.some((o) => o.id === p.id && o.poly_normalized === p.poly_normalized),
      )
      .map((p) => p.id),
  );
  const decor = layers.filter(
    (layer, i) =>
      layer.kind !== 'photo' &&
      !(
        layer.kind === 'frame' &&
        layers[i + 1]?.kind === 'photo' &&
        !unchanged.has(layers[i + 1].id)
      ),
  );
  const result = [
    ...decor,
    ...photos.sort(
      (a, b) => a.z - b.z || polygonArea(b.poly_normalized) - polygonArea(a.poly_normalized),
    ),
  ];
  if (key) smartLayersCache.set(key, result);
  return result;
}
export function authoredItems(
  id: string,
  assets: GratitudeAsset[],
  width: number,
  height: number,
  newId: () => string,
  photoOnly = false,
): BoardItem[] {
  const { preset, recipe } = recipeFor(id, width, height);
  const colors = Object.fromEntries(
    Object.entries(palettes[preset.palette as keyof typeof palettes]).map(([key, value]) => [
      key,
      value.toLowerCase(),
    ]),
  ) as Record<string, string>;
  const color = (name: string | undefined, fallback = 'ink') =>
    colors[name || fallback] || name?.toLowerCase() || colors[fallback];
  const bg = createAppearance('closed-shape');
  bg.fill.paint = { kind: 'solid', color: colors.bg };
  const items: BoardItem[] = [
    {
      id: newId(),
      kind: 'shape',
      shape: 'rectangle',
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      appearance: bg,
    },
  ];
  const ratio = height / width;
  const dataset = ratio > 1.3 ? 'portrait' : ratio < 0.8 ? 'landscape' : 'square';
  let index = 0;
  for (const layer of smartLayers(
    recipe.layers,
    assets.length,
    height / width,
    `${dataset}:${preset.key}`,
  ).sort((a, b) => a.z - b.z)) {
    if (photoOnly && layer.kind !== 'photo') continue;
    const points = layer.poly_normalized.map(([x, y]) => [
      Math.max(0, Math.min(1, x)) * width,
      Math.max(0, Math.min(1, y)) * height,
    ]);
    const x = Math.min(...points.map((p) => p[0])),
      y = Math.min(...points.map((p) => p[1]));
    const w = Math.max(1, Math.max(...points.map((p) => p[0])) - x),
      h = Math.max(1, Math.max(...points.map((p) => p[1])) - y);
    const local = points.map(([px, py]) => [((px - x) / w) * 100, ((py - y) / h) * 100]);
    const box = { x, y, width: w, height: h, rotation: 0 };
    const slotId = `${id}:${layer.id}:${layer.role || ''}`;
    const path =
      'M' +
      local.map(([px, py], i) => `${i ? 'L' : ''}${px} ${py}`).join(' ') +
      (layer.kind === 'line' ? '' : 'Z');
    if (layer.kind === 'photo') {
      const asset = assets[index++];
      items.push({
        id: newId(),
        kind: 'asset',
        asset: asset || SCRAPBOOK_PHOTO_PLACEHOLDER,
        ...box,
        slotId,
        opacity: 1,
        imageFit: 'fill',
        templatePlaceholder: !asset,
        scrapbookPhoto: {
          width: w,
          height: h,
          style: 'raw',
          colors: [colors.light, colors.light],
          clip: local.flat(),
        },
      });
      continue;
    }
    if (layer.kind === 'text') {
      if (layer.style.fill) {
        const a = createAppearance('closed-shape');
        a.fill.paint = { kind: 'solid', color: color(layer.style.fill) };
        items.push({
          id: newId(),
          kind: 'shape',
          shape: 'rectangle',
          ...box,
          appearance: a,
          vectorPath: path,
          vectorBox: { x: 0, y: 0, width: 100, height: 100 },
        });
      }
      const a = createAppearance('text');
      a.fill.paint = {
        kind: 'solid',
        color:
          layer.style.color === 'white'
            ? '#ffffff'
            : layer.style.fill === 'paper' || layer.style.color === 'dark'
              ? '#2d3330'
              : color(layer.style.color),
      };
      const text = layer.text || '';
      const factor =
        layer.style.font === 'display' ? 0.061 : layer.style.font === 'small' ? 0.03 : 0.026;
      const size = Math.min(
        width * factor * (layer.style.fontSize || 1),
        h * 0.7,
        (w / Math.max(1, ...text.split('\n').map((t) => t.length))) * 1.4,
      );
      items.push({
        id: newId(),
        kind: 'text',
        ...box,
        slotId,
        text,
        fontFamily: layer.style.font === 'display' ? 'georgia' : 'scrapbook-poppins',
        fontWeight: layer.style.font === 'display' ? 700 : 400,
        fontSize: Math.max(4, size),
        align: layer.style.align === 'left' ? 'left' : 'center',
        fixedBounds: true,
        appearance: a,
      });
      continue;
    }
    const a = createAppearance('closed-shape');
    a.fill.paint = { kind: 'solid', color: color(layer.style.fill, 'paper') };
    if (layer.kind === 'line') {
      a.fill.enabled = false;
      a.stroke.color = color(layer.style.stroke || 'accent');
      a.stroke.width = ((layer.style.width || 2) * width) / 500;
      a.stroke.scaling = 'fixed';
      a.stroke.cap = 'round';
      a.stroke.join = 'round';
    }
    if (layer.style.shadow)
      a.shadow = {
        enabled: true,
        color: '#000000',
        opacity: 0.2,
        blur: width * 0.008,
        offsetX: width * 0.004,
        offsetY: width * 0.006,
      };
    items.push({
      id: newId(),
      kind: 'shape',
      shape: 'rectangle',
      ...box,
      slotId,
      appearance: a,
      vectorPath: path,
      vectorBox: { x: 0, y: 0, width: 100, height: 100 },
    });
  }
  return items;
}
