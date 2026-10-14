import vision2027 from './photoThemes/vision2027.json';
import travel from './photoThemes/travel.json';
import diaries from './photoThemes/diaries.json';
import { createAppearance } from './appearance/defaults';
import type { BoardItem } from './document';
import type { GratitudeAsset } from '../assets/contracts';
export const PHOTO_THEMES = { vision2027, travel, diaries };
export type PhotoTheme = keyof typeof PHOTO_THEMES;
export type PhotoArrangement = 'scrapbook' | 'collage' | 'sticker';
export const PHOTO_STYLES = [
  { id: 'scrapbook', label: 'Scrapbook', description: 'Polaroids, paper & handwritten notes' },
  { id: 'collage', label: 'Collage', description: 'Photo tiles & editorial lettering' },
  { id: 'sticker', label: 'Sticker collage', description: 'White borders & playful lettering' },
] as const;
type Box = { x: number; y: number; width: number; height: number; rotation: number };
type PhotoSlot = Box & { kind: 'photo'; photoIndex: number };
export type PhotoComposition = { layers: Array<BoardItem | PhotoSlot> };
/** Adapted from Vision Forge's scrapbook, collage and sticker recipes with its supplied theme JSON. */
export function photoComposition(
  count: number,
  style: PhotoArrangement,
  width: number,
  height: number,
  ratios: number[] = [],
  theme: PhotoTheme = 'vision2027',
): PhotoComposition {
  if (!Number.isInteger(count) || count < 1 || count > 12)
    throw new Error('Choose 1 to 12 photos.');
  const data = PHOTO_THEMES[theme],
    s = Math.min(width, height) / 1000;
  const margin = 52 * s,
    header = 170 * s,
    footer = 120 * s,
    gap = 24 * s;
  const layers: PhotoComposition['layers'] = [],
    colors = data.palette.colors,
    ink = data.palette.ink;
  const box = (x: number, y: number, w: number, h: number, rotation = 0): Box => ({
    x,
    y,
    width: w,
    height: h,
    rotation,
  });
  const paper = (
    b: Box,
    color: string,
    shape: 'rectangle' | 'star' | 'heart' = 'rectangle',
    shadow = false,
  ) => {
    const appearance = createAppearance('closed-shape');
    appearance.fill.paint = { kind: 'solid', color };
    if (shadow)
      appearance.shadow = {
        enabled: true,
        color: ink,
        opacity: 0.13,
        blur: 10 * s,
        offsetX: 0,
        offsetY: 5 * s,
      };
    layers.push({
      id: `decoration-${layers.length}`,
      kind: 'shape',
      shape,
      ...b,
      appearance,
      radius: style === 'sticker' ? 14 * s : 2 * s,
    });
  };
  const text = (copy: string, b: Box, size: number, hand = false) => {
    const appearance = createAppearance('text');
    appearance.fill.paint = { kind: 'solid', color: ink };
    layers.push({
      id: `decoration-${layers.length}`,
      kind: 'text',
      ...b,
      text: copy,
      fontFamily: hand ? 'caveat-brush' : 'fraunces',
      fontSize: size,
      align: 'center',
      textPadding: 0,
      lineHeight: 1.15,
      appearance,
    });
  };
  paper(box(0, 0, width, height), data.palette.paper);
  if (style === 'sticker') {
    const title = data.title.replace(/\s+/g, ' ').toUpperCase(),
      letterW = Math.min(64 * s, (width - margin * 2) / title.length),
      start = (width - title.length * letterW) / 2;
    [...title].forEach((letter, i) => {
      if (letter === ' ') return;
      const rotation = i % 2 ? 3 : -3,
        b = box(start + i * letterW, margin, letterW * 0.88, 75 * s, rotation);
      paper(b, colors[i % colors.length], 'rectangle', true);
      text(
        letter,
        box(b.x, b.y + 7 * s, b.width, b.height - 14 * s, rotation),
        Math.min(50 * s, letterW * 0.65),
      );
    });
  } else {
    paper(
      box(margin, 26 * s, width - margin * 2, 112 * s),
      style === 'scrapbook' ? colors[1] : colors[0],
    );
    text(
      data.title.replace(/\s+/g, ' '),
      box(margin + 20 * s, 40 * s, width - margin * 2 - 40 * s, 68 * s),
      Math.min(56 * s, (width - margin * 2) / 18),
      style === 'scrapbook',
    );
    text(data.subtitle, box(margin, 111 * s, width - margin * 2, 24 * s), 16 * s);
  }
  const area = box(margin, header, width - margin * 2, height - header - footer);
  if (style === 'collage') {
    const cells = [area];
    while (cells.length < count) {
      cells.sort((a, b) => b.width * b.height - a.width * a.height);
      const a = cells.shift()!,
        f = cells.length % 2 ? 0.44 : 0.56;
      if (a.width > a.height * 1.05)
        cells.push(
          box(a.x, a.y, a.width * f, a.height),
          box(a.x + a.width * f, a.y, a.width * (1 - f), a.height),
        );
      else
        cells.push(
          box(a.x, a.y, a.width, a.height * f),
          box(a.x, a.y + a.height * f, a.width, a.height * (1 - f)),
        );
    }
    cells
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .forEach((cell, i) => {
        const inset = 8 * s;
        paper(cell, colors[i % colors.length]);
        layers.push({
          kind: 'photo',
          photoIndex: i,
          ...box(cell.x + inset, cell.y + inset, cell.width - inset * 2, cell.height - inset * 2),
        });
      });
  } else {
    const meanRatio =
      Array.from({ length: count }, (_, i) => Math.max(0.3, Math.min(3.5, ratios[i] || 1))).reduce(
        (a, b) => a + b,
        0,
      ) / count;
    const targetRatio = meanRatio / (style === 'scrapbook' ? 1.2 : 1);
    const candidates = Array.from({ length: count }, (_, i) => i + 1);
    const cost = (columns: number) => {
      const rows = Math.ceil(count / columns);
      return (
        Math.abs(Math.log(area.width / columns / (area.height / rows) / targetRatio)) +
        ((columns * rows - count) / count) * 2
      );
    };
    const columns = candidates.reduce(
        (best, value) => (cost(value) < cost(best) ? value : best),
        1,
      ),
      rows = Math.ceil(count / columns),
      cw = area.width / columns,
      ch = area.height / rows;
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / columns),
        inRow = Math.min(columns, count - row * columns),
        cellX = area.x + (area.width - inRow * cw) / 2 + (i % columns) * cw,
        cellY = area.y + row * ch;
      const padding = (style === 'scrapbook' ? 13 : 18) * s,
        caption = style === 'scrapbook' ? 44 * s : 0,
        ratio = Math.max(0.3, Math.min(3.5, ratios[i] || 1));
      const pw = Math.min(cw * 0.84 - padding * 2, (ch * 0.82 - padding * 2 - caption) * ratio),
        ph = pw / ratio,
        fw = pw + padding * 2,
        fh = ph + padding * 2 + caption;
      const rotation = i % 2 ? 3 : -3,
        radians = (rotation * Math.PI) / 180,
        centerX = cellX + cw / 2,
        centerY = cellY + ch / 2;
      const originX = centerX - (fw / 2) * Math.cos(radians) + (fh / 2) * Math.sin(radians),
        originY = centerY - (fw / 2) * Math.sin(radians) - (fh / 2) * Math.cos(radians);
      const local = (dx: number, dy: number, w: number, h: number) =>
        box(
          originX + dx * Math.cos(radians) - dy * Math.sin(radians),
          originY + dx * Math.sin(radians) + dy * Math.cos(radians),
          w,
          h,
          rotation,
        );
      paper(local(0, 0, fw, fh), '#fffdf7', 'rectangle', true);
      layers.push({ kind: 'photo', photoIndex: i, ...local(padding, padding, pw, ph) });
      if (caption)
        text(
          data.copy.labels[i % data.copy.labels.length],
          local(padding, padding + ph + 8 * s, pw, caption - 8 * s),
          Math.min(24 * s, pw / 8),
          true,
        );
      if (style === 'scrapbook')
        paper(local(fw / 2 - 36 * s, -7 * s, 72 * s, 23 * s), colors[i % colors.length]);
    }
  }
  const noteW = (width - margin * 2 - gap) / 2,
    noteY = height - footer + 20 * s;
  [0, 1].forEach((i) => {
    paper(box(margin + i * (noteW + gap), noteY, noteW, 70 * s), colors[(i + 2) % colors.length]);
    text(
      data.copy.quotes[i].replace(/\n/g, ' '),
      box(margin + i * (noteW + gap) + 15 * s, noteY + 15 * s, noteW - 30 * s, 50 * s),
      Math.min(24 * s, noteW / 17),
      true,
    );
  });
  if (style === 'sticker') {
    paper(box(width - margin - 30 * s, header - 38 * s, 30 * s, 30 * s, 8), colors[2], 'star');
    paper(box(margin, header - 35 * s, 26 * s, 26 * s, -8), colors[0], 'heart');
  }
  return { layers };
}
export function photoLayout(
  count: number,
  style: PhotoArrangement,
  width: number,
  height: number,
  ratios: number[] = [],
): PhotoSlot[] {
  return photoComposition(count, style, width, height, ratios).layers.filter(
    (layer): layer is PhotoSlot => layer.kind === 'photo',
  );
}
export function compositionItems(
  composition: PhotoComposition,
  assets: GratitudeAsset[],
  id: () => string,
): BoardItem[] {
  return composition.layers.map((layer) =>
    layer.kind === 'photo'
      ? {
          id: id(),
          kind: 'asset',
          asset: assets[layer.photoIndex],
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          rotation: layer.rotation,
          opacity: 1,
          imageFit: 'fill',
        }
      : { ...layer, id: id() },
  );
}
