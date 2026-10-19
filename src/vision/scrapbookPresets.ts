import data from './scrapbookPresets.json';
import metrics from './scrapbookMetrics.json';
import { createAppearance } from './appearance/defaults';
import type { BoardItem } from './document';
import type { GratitudeAsset } from '../assets/contracts';
import type { VisionFontFamily } from './contracts';

export type PresetResolution = { width: number; height: number };
export const SCRAPBOOK_PRESETS = data.templates.map((template) => ({
  id: template.id,
  label: template.name,
  slots: template.it.filter((part) => part.k === 'photo').length,
  resolution: template.resolution,
  canvas: template.canvas,
}));
export type ScrapbookPresetId = (typeof SCRAPBOOK_PRESETS)[number]['id'];
export function matchesResolution(preset: PresetResolution, board: PresetResolution) {
  return preset.width === board.width && preset.height === board.height;
}
export function presetsForResolution<T extends { resolution: PresetResolution }>(
  presets: readonly T[],
  resolution: PresetResolution,
): T[] {
  return presets.filter((preset) => matchesResolution(preset.resolution, resolution));
}
export function isScrapbookPreset(id: string): id is ScrapbookPresetId {
  return SCRAPBOOK_PRESETS.some((preset) => preset.id === id);
}
export interface ScrapbookPhoto {
  width: number;
  height: number;
  style: string;
  colors: string[];
  clip?: number[];
}
// These are the original HTML's Park-Miller generator and jagged-paper recipe.
export function tornPoints(seed: number, amplitude = 1.6, n = 26): number[] {
  let state = seed * 7 + 3;
  const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const points: number[] = [];
  for (let i = 0; i <= n; i++) points.push((i / n) * 100, random() * amplitude);
  for (let i = 1; i <= n; i++) points.push(100 - random() * amplitude, (i / n) * 100);
  for (let i = n - 1; i >= 0; i--) points.push((i / n) * 100, 100 - random() * amplitude);
  for (let i = n - 1; i > 0; i--) points.push(random() * amplitude, (i / n) * 100);
  return points;
}
const polygonPath = (points: number[]) =>
  'M' +
  points
    .reduce<string[]>((out, value, i) => {
      if (i % 2 === 0) out.push(`${i ? 'L' : ''}${value} ${points[i + 1]}`);
      return out;
    }, [])
    .join(' ') +
  'Z';
const transparent =
  'data:image/svg+xml,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
export const SCRAPBOOK_PHOTO_PLACEHOLDER: GratitudeAsset = {
  id: 'scrapbook-photo-placeholder',
  provider: 'template-photo',
  type: 'photo',
  title: 'Add photo',
  tags: [],
  assetUrl: transparent,
  previewUrl: transparent,
  license: {
    tier: 'A',
    id: 'user-template',
    label: 'User supplied template',
    attributionRequired: false,
  },
  editable: { crop: true, filters: true },
};
type Part = {
  k: string;
  x: number;
  y: number;
  w: number;
  h?: number;
  r?: number;
  z: number;
  t?: string;
  ch?: string;
  c?: string;
  ink?: string;
  bgc?: string;
  f?: string;
  size?: number;
  s?: string;
  torn?: number;
  g?: string[];
  n?: string;
};
const fonts: Record<string, VisionFontFamily> = {
  Caveat: 'scrapbook-caveat',
  Poppins: 'scrapbook-poppins',
  'Playfair Display': 'scrapbook-playfair',
  Georgia: 'georgia',
  Impact: 'impact',
  'Courier New': 'courier-new',
};
/** Preserve each template's source coordinates and proportions when placing it on a board. */
export function scrapbookItems(
  preset: ScrapbookPresetId,
  assets: GratitudeAsset[],
  id: () => string,
  width?: number,
  height?: number,
): BoardItem[] {
  const presetIndex = SCRAPBOOK_PRESETS.findIndex((p) => p.id === preset);
  const template = data.templates[presetIndex];
  const source = template.canvas;
  const targetWidth = width ?? source.width,
    targetHeight = height ?? source.height;
  const scale = Math.min(targetWidth / source.width, targetHeight / source.height);
  const offsetX = (targetWidth - source.width * scale) / 2,
    offsetY = (targetHeight - source.height * scale) / 2;
  const layers: BoardItem[] = [];
  const box = (
    part: Part,
    h = part.h ||
      metrics[presetIndex]?.[(template.it as Part[]).indexOf(part)]?.height ||
      (part.size || 30) * 1.1 * (part.t || '').split('\n').length,
  ) => {
    // CSS rotates around the center; Konva rotates around the top-left.
    const angle = ((part.r || 0) * Math.PI) / 180;
    return {
      x:
        offsetX +
        (part.x + part.w / 2 - (Math.cos(angle) * part.w) / 2 + (Math.sin(angle) * h) / 2) * scale,
      y:
        offsetY +
        (part.y + h / 2 - (Math.sin(angle) * part.w) / 2 - (Math.cos(angle) * h) / 2) * scale,
      width: part.w * scale,
      height: h * scale,
      rotation: part.r || 0,
    };
  };
  const shape = (part: Part, color: string, path?: string, shadow = false, texture = false) => {
    const appearance = createAppearance('closed-shape');
    appearance.fill.paint = { kind: 'solid', color };
    if (shadow)
      appearance.shadow = {
        enabled: true,
        color: '#000000',
        opacity: 0.2,
        blur: (part.k === 'rs' ? 8 : 10) * scale,
        offsetX: 0,
        offsetY: (part.k === 'rs' ? 3 : 5) * scale,
      };
    layers.push({
      id: id(),
      kind: 'shape',
      shape: 'rectangle',
      ...box(part),
      appearance,
      ...(path ? { vectorPath: path, vectorBox: { x: 0, y: 0, width: 100, height: 100 } } : {}),
      ...(texture ? { scrapbookPaper: { width: part.w, height: part.h! } } : {}),
    });
  };
  shape({ k: 'paper', x: 0, y: 0, w: source.width, h: source.height, z: 0 }, template.bg);
  const original = template.it as Part[];
  // Keep the HTML stacking order, but fill its prominent frames before background tiles.
  const photos = original.filter((part) => part.k === 'photo');
  const photoOrder = [
    ...photos.filter((part) => part.s !== 'raw'),
    ...photos.filter((part) => part.s === 'raw'),
  ];
  const photoIndices = new Map(photoOrder.map((part, index) => [part, index]));
  original
    .map((part, index) => ({ part, index }))
    .sort((a, b) => a.part.z - b.part.z || a.index - b.index)
    .forEach(({ part: p, index }) => {
      const seed = index + presetIndex * 100;
      if (p.k === 'photo') {
        const asset = assets[photoIndices.get(p)!];
        layers.push({
          id: id(),
          kind: 'asset',
          ...box(p),
          asset: asset || SCRAPBOOK_PHOTO_PLACEHOLDER,
          imageFit: 'fill',
          opacity: 1,
          templatePlaceholder: !asset,
          scrapbookPhoto: {
            width: p.w,
            height: p.h!,
            style: p.s!,
            colors: p.g!,
            ...(p.torn ? { clip: tornPoints(seed) } : {}),
          },
        });
        return;
      }
      if (p.k === 'paper') {
        shape(p, p.c!, polygonPath(tornPoints(seed, 2, 30)), true, true);
        return;
      }
      if (p.k === 'doodle') {
        const appearance = createAppearance('closed-shape');
        appearance.fill.enabled = false;
        appearance.stroke = {
          ...appearance.stroke,
          color: p.c!,
          width: 1.5,
          cap: 'round',
          join: 'round',
          scaling: 'transform',
        };
        layers.push({
          id: id(),
          kind: 'shape',
          shape: 'rectangle',
          ...box(p),
          appearance,
          vectorPath: data.doodles[p.n as keyof typeof data.doodles],
          vectorBox: { x: 0, y: 0, width: 24, height: 24 },
        });
        return;
      }
      if (p.k === 'tape') {
        shape(
          p,
          '#ebe1c8bf',
          'M0 0 L3 20 L0 40 L3 60 L0 80 L0 100 L100 100 L97 80 L100 60 L97 40 L100 20 L100 0 Z',
        );
        return;
      }
      if (p.k === 'note') shape(p, p.c!, polygonPath(tornPoints(seed, 0.8, 14)));
      if (p.k === 'brush')
        shape(
          p,
          p.c!,
          'M48 0 C76.719 0 100 17.909 100 40 C100 73.137 82.091 100 60 100 C26.863 100 0 82.091 0 60 C0 26.863 21.49 0 48 0 Z',
        );
      if (p.k === 'rs') shape(p, p.bgc!, undefined, true);
      const appearance = createAppearance('text');
      appearance.fill.paint = { kind: 'solid', color: p.ink || p.c || '#000000' };
      if (p.k === 'text' && p.c === '#fff')
        appearance.shadow = {
          enabled: true,
          color: '#000000',
          opacity: 0.47,
          blur: 6 * scale,
          offsetX: 0,
          offsetY: scale,
        };
      if (p.k === 'emoji') {
        appearance.silhouette = { width: 3 * scale, color: '#ffffff' };
        appearance.shadow = {
          enabled: true,
          color: '#000000',
          opacity: 0.27,
          blur: 6 * scale,
          offsetX: 0,
          offsetY: 4 * scale,
        };
      }
      const padding = p.k === 'note' ? 16 : 0;
      const textBox = box(p);
      // Note text is centered inside the original 14px/16px padding.
      const angle = ((p.r || 0) * Math.PI) / 180;
      layers.push({
        id: id(),
        kind: 'text',
        ...textBox,
        x: textBox.x + padding * scale * Math.cos(angle),
        y: textBox.y + padding * scale * Math.sin(angle),
        width: textBox.width - padding * 2 * scale,
        text: p.t || p.ch || '',
        ...(p.k === 'emoji' ? { scrapbookEmoji: true } : {}),
        fontFamily: p.k === 'emoji' ? 'scrapbook-poppins' : fonts[p.f || 'Caveat'],
        fontSize: (p.size || 30) * scale,
        fontWeight: p.f === 'Impact' || p.k === 'emoji' ? 400 : 700,
        lineHeight:
          p.k === 'emoji'
            ? 1
            : (metrics[presetIndex]?.[index]?.textHeight ??
                (p.size || 30) * 1.25 * (p.t || p.ch || '').split('\n').length) /
              ((p.size || 30) * (p.t || p.ch || '').split('\n').length),
        align: 'center',
        fixedBounds: true,
        appearance,
      });
    });
  return fillScrapbookEdges(layers, targetWidth, targetHeight);
}

/** Extend background tiles into the margins without scaling foreground artwork. Also
 * recognizes untouched backgrounds on boards saved before the full-bleed fitting. */
export function fillScrapbookEdges(items: BoardItem[], width: number, height: number): BoardItem[] {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.001;
  let result = items;
  for (const template of data.templates) {
    const scale = Math.min(width / template.canvas.width, height / template.canvas.height);
    const coreWidth = template.canvas.width * scale;
    const coreHeight = template.canvas.height * scale;
    const left = (width - coreWidth) / 2;
    const top = (height - coreHeight) / 2;
    if (near(left, 0) && near(top, 0)) continue;
    const backgrounds = result.filter((item) => {
      const paint =
        item.appearance && 'fill' in item.appearance ? item.appearance.fill.paint : undefined;
      return (
        item.kind === 'shape' &&
        !item.vectorPath &&
        !item.rotation &&
        paint?.kind === 'solid' &&
        paint.color === template.bg &&
        near(item.x, left) &&
        near(item.y, top) &&
        near(item.width, coreWidth) &&
        near(item.height, coreHeight)
      );
    });
    if (!backgrounds.length || !result.some((item) => item.scrapbookPhoto?.style === 'raw'))
      continue;
    result = result.map((item) => {
      if (backgrounds.includes(item)) return { ...item, x: 0, y: 0, width, height };
      const photo = item.scrapbookPhoto;
      const paper = item.scrapbookPaper;
      const source = photo?.style === 'raw' ? photo : paper;
      // A custom crop or edited size/rotation should retain the user's placement.
      if (
        !source ||
        item.rotation ||
        item.crop ||
        !near(item.width / source.width, scale) ||
        !near(item.height / source.height, scale)
      )
        return item;
      const x = near(item.x, left) ? 0 : item.x;
      const y = near(item.y, top) ? 0 : item.y;
      const right = near(item.x + item.width, left + coreWidth) ? width : item.x + item.width;
      const bottom = near(item.y + item.height, top + coreHeight) ? height : item.y + item.height;
      if (
        near(x, item.x) &&
        near(y, item.y) &&
        near(right - x, item.width) &&
        near(bottom - y, item.height)
      )
        return item;
      const dimensions = { width: (right - x) / scale, height: (bottom - y) / scale };
      return {
        ...item,
        x,
        y,
        width: right - x,
        height: bottom - y,
        ...(photo ? { scrapbookPhoto: { ...photo, ...dimensions } } : {}),
        ...(paper ? { scrapbookPaper: dimensions } : {}),
      };
    });
  }
  return result;
}
