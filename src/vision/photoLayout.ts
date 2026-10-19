import { canonicalFontId } from './fonts';
import type { ScrapbookPresetId } from './scrapbookPresets';
import type { CollagePresetId } from './photoCollages';
import vision2027 from './photoThemes/vision2027.json';
import travel from './photoThemes/travel.json';
import diaries from './photoThemes/diaries.json';
import manifestation from './photoThemes/manifestation.json';
import studycore from './photoThemes/studycore.json';
import selfcare from './photoThemes/selfcare.json';
import wanderlust from './photoThemes/wanderlust.json';
import { createAppearance } from './appearance/defaults';
import type { BoardItem } from './document';
import type { GratitudeAsset } from '../assets/contracts';
export const PHOTO_THEMES = {
  vision2027,
  travel,
  diaries,
  manifestation,
  studycore,
  selfcare,
  wanderlust,
};
export type PhotoTheme = keyof typeof PHOTO_THEMES;
export type PhotoArrangement =
  | ScrapbookPresetId
  | CollagePresetId
  | 'scrapbook'
  | 'collage'
  | 'sticker'
  | 'moodboard'
  | 'pinterest'
  | 'editorial';
export const PHOTO_STYLES = [
  { id: 'scrapbook', label: 'Scrapbook', description: 'Polaroids, paper & handwritten notes' },
  { id: 'collage', label: 'Collage', description: 'Photo tiles & editorial lettering' },
  { id: 'sticker', label: 'Sticker collage', description: 'White borders & playful lettering' },
  { id: 'moodboard', label: 'Moodboard', description: 'Dense mosaic, edge-to-edge photos' },
  { id: 'pinterest', label: 'Pinterest', description: 'Layered & overlapping with depth' },
  { id: 'editorial', label: 'Editorial', description: 'Hero image + magazine grid' },
] as const;
type Box = { x: number; y: number; width: number; height: number; rotation: number };
type PhotoSlot = Box & { kind: 'photo'; photoIndex: number };
export type PhotoComposition = { layers: Array<BoardItem | PhotoSlot> };

/* ───────────────── Seeded random for deterministic layouts ────────────────── */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Adapted from Vision Forge's scrapbook, collage and sticker recipes with its supplied theme JSON. */
export function photoComposition(
  count: number,
  style: PhotoArrangement,
  width: number,
  height: number,
  ratios: number[] = [],
  theme: PhotoTheme = 'vision2027',
): PhotoComposition {
  if (!Number.isInteger(count) || count < 1 || count > 20)
    throw new Error('Choose 1 to 20 photos.');
  const data = PHOTO_THEMES[theme],
    s = Math.min(width, height) / 1000;

  if (style === 'moodboard') return moodboardComposition(count, width, height, ratios, data, s);
  if (style === 'pinterest') return pinterestComposition(count, width, height, ratios, data, s);
  if (style === 'editorial') return editorialComposition(count, width, height, ratios, data, s);

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

/* ═══════════════════════════════════════════════════════════════════════════
   MOODBOARD — Dense mosaic, edge-to-edge photos, varied sizes, NO white space.
   Inspired by Pinterest vision board collages (image 1 & 3).

   Algorithm: Mosaic packing with "size classes".
   - Divide board into a grid of cells (columns × rows)
   - Assign each photo a size class: 1×1, 2×1, 1×2, or 2×2
   - Pack greedily into the grid using an occupancy map
   - Photos fill their allocated cells with small gaps
   - Scatter quote cards in remaining gaps
   ═══════════════════════════════════════════════════════════════════════════ */
function moodboardComposition(
  count: number,
  width: number,
  height: number,
  ratios: number[],
  data: (typeof PHOTO_THEMES)[PhotoTheme],
  s: number,
): PhotoComposition {
  const layers: PhotoComposition['layers'] = [];
  const colors = data.palette.colors,
    ink = data.palette.ink;
  const rand = seededRandom(count * 7 + Math.round(width) * 3);

  const box = (x: number, y: number, w: number, h: number, rotation = 0): Box => ({
    x,
    y,
    width: w,
    height: h,
    rotation,
  });
  const addPaper = (b: Box, color: string, radius = 0) => {
    const appearance = createAppearance('closed-shape');
    appearance.fill.paint = { kind: 'solid', color };
    layers.push({
      id: `decoration-${layers.length}`,
      kind: 'shape',
      shape: 'rectangle',
      ...b,
      appearance,
      radius,
    });
  };
  const addText = (
    copy: string,
    b: Box,
    size: number,
    color: string,
    font: string = 'fraunces',
  ) => {
    const appearance = createAppearance('text');
    appearance.fill.paint = { kind: 'solid', color };
    layers.push({
      id: `decoration-${layers.length}`,
      kind: 'text',
      ...b,
      text: copy,
      fontFamily: canonicalFontId(font),
      fontSize: size,
      align: 'center',
      textPadding: 0,
      lineHeight: 1.15,
      appearance,
    });
  };

  // Background
  addPaper(box(0, 0, width, height), data.palette.paper);

  // Decide size classes first, then compute grid size from total cells needed.
  type SizeClass = [number, number]; // [rowSpan, colSpan]
  const sizeClasses: SizeClass[] = [];
  let totalCellsNeeded = 0;
  for (let i = 0; i < count; i++) {
    const r = rand();
    let sc: SizeClass;
    if (i === 0 && count >= 6) {
      sc = [2, 2]; // Hero photo
    } else if (i <= 2 && count >= 8 && r > 0.5) {
      const ratio = ratios[i] || 1;
      sc = ratio > 1.3 ? [1, 2] : ratio < 0.7 ? [2, 1] : [1, 2];
    } else if (r > 0.75 && count >= 7) {
      const ratio = ratios[i] || 1;
      sc = ratio > 1.2 ? [1, 2] : [2, 1];
    } else {
      sc = [1, 1];
    }
    sizeClasses.push(sc);
    totalCellsNeeded += sc[0] * sc[1];
  }
  // Add slots for quote cards
  const extraSlots = Math.min(4, Math.ceil(count / 3));
  totalCellsNeeded += extraSlots;

  // Grid calculation: ensure cols*rows >= totalCellsNeeded
  const aspect = width / height;
  const cols = Math.max(3, Math.round(Math.sqrt(totalCellsNeeded * aspect)));
  const rows = Math.max(3, Math.ceil(totalCellsNeeded / cols));
  const gap = 3 * s; // minimal gap between photos
  const cellW = (width - gap) / cols;
  const cellH = (height - gap) / rows;

  // Occupancy grid (true = occupied)
  const occupied: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

  const canPlace = (r: number, c: number, spanR: number, spanC: number) => {
    if (r + spanR > rows || c + spanC > cols) return false;
    for (let dr = 0; dr < spanR; dr++)
      for (let dc = 0; dc < spanC; dc++) if (occupied[r + dr][c + dc]) return false;
    return true;
  };
  const markOccupied = (r: number, c: number, spanR: number, spanC: number) => {
    for (let dr = 0; dr < spanR; dr++)
      for (let dc = 0; dc < spanC; dc++) occupied[r + dr][c + dc] = true;
  };

  // Place photos greedily
  const photoSlots: Array<{
    r: number;
    c: number;
    spanR: number;
    spanC: number;
    photoIndex: number;
  }> = [];
  for (let i = 0; i < count; i++) {
    let [spanR, spanC] = sizeClasses[i];
    let placed = false;
    // Try preferred size, then fall back to 1×1
    for (const trySize of [
      [spanR, spanC],
      [1, 1],
    ] as SizeClass[]) {
      [spanR, spanC] = trySize;
      for (let r = 0; r < rows && !placed; r++) {
        for (let c = 0; c < cols && !placed; c++) {
          if (canPlace(r, c, spanR, spanC)) {
            markOccupied(r, c, spanR, spanC);
            photoSlots.push({ r, c, spanR, spanC, photoIndex: i });
            placed = true;
          }
        }
      }
      if (placed) break;
    }
    // If still can't place (shouldn't happen with correct grid), force into first empty cell
    if (!placed) {
      for (let r = 0; r < rows && !placed; r++) {
        for (let c = 0; c < cols && !placed; c++) {
          if (!occupied[r][c]) {
            markOccupied(r, c, 1, 1);
            photoSlots.push({ r, c, spanR: 1, spanC: 1, photoIndex: i });
            placed = true;
          }
        }
      }
    }
  }

  // Place photo rectangles (no frame, edge-to-edge)
  for (const slot of photoSlots) {
    const x = gap + slot.c * cellW;
    const y = gap + slot.r * cellH;
    const w = slot.spanC * cellW - gap;
    const h = slot.spanR * cellH - gap;
    layers.push({ kind: 'photo', photoIndex: slot.photoIndex, ...box(x, y, w, h, 0) });
  }

  // Fill remaining empty cells with quote cards and decorative elements
  let quoteIdx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!occupied[r][c] && quoteIdx < data.copy.quotes.length) {
        const x = gap + c * cellW;
        const y = gap + r * cellH;
        const w = cellW - gap;
        const h = cellH - gap;
        const color = colors[quoteIdx % colors.length];
        addPaper(box(x, y, w, h), color, 4 * s);
        addText(
          data.copy.quotes[quoteIdx].replace(/\n/g, ' '),
          box(x + 10 * s, y + 10 * s, w - 20 * s, h - 20 * s),
          Math.min(22 * s, w / 10),
          ink,
          'caveat-brush',
        );
        quoteIdx++;
        occupied[r][c] = true;
      }
    }
  }

  // Center title overlay (magazine-cutout style, like Pinterest "Vision Board 2026")
  const titleText = data.title.replace(/\n/g, ' ').toUpperCase();
  const titleW = Math.min(width * 0.7, titleText.length * 42 * s);
  const titleH = 80 * s;
  const titleX = (width - titleW) / 2;
  const titleY = height * 0.42;

  // Individual letter stickers for the title (magazine-cutout effect)
  const letterW = titleW / titleText.length;
  [...titleText].forEach((letter, i) => {
    if (letter === ' ') return;
    const rotation = (rand() - 0.5) * 10; // random ±5° rotation
    const lx = titleX + i * letterW;
    const ly = titleY + (rand() - 0.5) * 12 * s; // slight vertical jitter
    addPaper(box(lx, ly, letterW * 0.9, titleH, rotation), colors[i % colors.length], 6 * s);
    addText(
      letter,
      box(lx + 2 * s, ly + 8 * s, letterW * 0.9 - 4 * s, titleH - 16 * s, rotation),
      Math.min(46 * s, letterW * 0.8),
      ink,
      'fraunces',
    );
  });

  return { layers };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PINTEREST — Layered overlapping collage with depth.
   Inspired by Pinterest vision board collages (image 2).

   Algorithm: Layered composition.
   - 2-3 large background photos fill most of the board
   - Medium photos layered on top with rotation and overlap
   - Small accent photos and text scattered
   - Decorative shapes (stars, hearts) add character
   - Shadows on everything for depth
   ═══════════════════════════════════════════════════════════════════════════ */
function pinterestComposition(
  count: number,
  width: number,
  height: number,
  ratios: number[],
  data: (typeof PHOTO_THEMES)[PhotoTheme],
  s: number,
): PhotoComposition {
  const layers: PhotoComposition['layers'] = [];
  const colors = data.palette.colors,
    ink = data.palette.ink;
  const rand = seededRandom(count * 13 + Math.round(width) * 7);

  const box = (x: number, y: number, w: number, h: number, rotation = 0): Box => ({
    x,
    y,
    width: w,
    height: h,
    rotation,
  });
  const addPaper = (b: Box, color: string, shadow = false, radius = 2 * s) => {
    const appearance = createAppearance('closed-shape');
    appearance.fill.paint = { kind: 'solid', color };
    if (shadow)
      appearance.shadow = {
        enabled: true,
        color: ink,
        opacity: 0.18,
        blur: 14 * s,
        offsetX: 2 * s,
        offsetY: 6 * s,
      };
    layers.push({
      id: `decoration-${layers.length}`,
      kind: 'shape',
      shape: 'rectangle',
      ...b,
      appearance,
      radius,
    });
  };
  const addShape = (b: Box, color: string, shape: 'star' | 'heart') => {
    const appearance = createAppearance('closed-shape');
    appearance.fill.paint = { kind: 'solid', color };
    layers.push({
      id: `decoration-${layers.length}`,
      kind: 'shape',
      shape,
      ...b,
      appearance,
      radius: 0,
    });
  };
  const addText = (
    copy: string,
    b: Box,
    size: number,
    color: string,
    font = 'caveat-brush',
    shadow = false,
  ) => {
    const appearance = createAppearance('text');
    appearance.fill.paint = { kind: 'solid', color };
    if (shadow)
      appearance.shadow = {
        enabled: true,
        color: '#ffffff',
        opacity: 0.9,
        blur: 6 * s,
        offsetX: 0,
        offsetY: 0,
      };
    layers.push({
      id: `decoration-${layers.length}`,
      kind: 'text',
      ...b,
      text: copy,
      fontFamily: canonicalFontId(font),
      fontSize: size,
      align: 'center',
      textPadding: 0,
      lineHeight: 1.15,
      appearance,
    });
  };

  // Background
  addPaper(box(0, 0, width, height), data.palette.paper);

  // Divide photos into tiers: background (large), midground (medium), foreground (small/accent)
  const bgCount = Math.min(Math.max(1, Math.floor(count * 0.3)), 3);
  const midCount = Math.min(Math.ceil(count * 0.45), count - bgCount);
  const fgCount = count - bgCount - midCount;

  // ── Background layer: large photos covering sections of the board ──
  const bgRegions = [
    { x: 0, y: 0, w: 0.55, h: 0.6 },
    { x: 0.48, y: 0.35, w: 0.55, h: 0.65 },
    { x: 0, y: 0.5, w: 0.52, h: 0.52 },
  ];
  for (let i = 0; i < bgCount; i++) {
    const region = bgRegions[i % bgRegions.length];
    const px = region.x * width;
    const py = region.y * height;
    const pw = region.w * width;
    const ph = region.h * height;
    const rotation = (rand() - 0.5) * 4; // slight ±2° tilt
    layers.push({ kind: 'photo', photoIndex: i, ...box(px, py, pw, ph, rotation) });
  }

  // ── Midground layer: medium photos with white frames and shadows ──
  const midPositions = generateScatteredPositions(midCount, width, height, 0.22, 0.38, rand);
  for (let i = 0; i < midCount; i++) {
    const pi = bgCount + i;
    const pos = midPositions[i];
    const ratio = Math.max(0.5, Math.min(2.5, ratios[pi] || 1));
    const baseSize = Math.min(width, height) * pos.size;
    const pw = ratio > 1 ? baseSize : baseSize * ratio;
    const ph = ratio > 1 ? baseSize / ratio : baseSize;
    const padding = 10 * s;
    const rotation = (rand() - 0.5) * 16; // ±8° rotation

    // White frame
    addPaper(
      box(
        pos.x * width - padding,
        pos.y * height - padding,
        pw + padding * 2,
        ph + padding * 2 + 30 * s,
        rotation,
      ),
      '#fffdf7',
      true,
      3 * s,
    );
    layers.push({
      kind: 'photo',
      photoIndex: pi,
      ...box(pos.x * width, pos.y * height, pw, ph, rotation),
    });
  }

  // ── Foreground layer: small accent photos with rotation ──
  const fgPositions = generateScatteredPositions(fgCount, width, height, 0.14, 0.22, rand);
  for (let i = 0; i < fgCount; i++) {
    const pi = bgCount + midCount + i;
    const pos = fgPositions[i];
    const ratio = Math.max(0.6, Math.min(2, ratios[pi] || 1));
    const baseSize = Math.min(width, height) * pos.size;
    const pw = ratio > 1 ? baseSize : baseSize * ratio;
    const ph = ratio > 1 ? baseSize / ratio : baseSize;
    const rotation = (rand() - 0.5) * 24; // ±12° rotation
    const padding = 8 * s;

    addPaper(
      box(
        pos.x * width - padding,
        pos.y * height - padding,
        pw + padding * 2,
        ph + padding * 2,
        rotation,
      ),
      '#fffdf7',
      true,
      3 * s,
    );
    layers.push({
      kind: 'photo',
      photoIndex: pi,
      ...box(pos.x * width, pos.y * height, pw, ph, rotation),
    });
  }

  // ── Scattered quote cards ──
  const quoteCount = Math.min(3, data.copy.quotes.length);
  const quotePositions = [
    { x: 0.05, y: 0.75, w: 0.35, h: 0.18 },
    { x: 0.55, y: 0.08, w: 0.38, h: 0.16 },
    { x: 0.3, y: 0.5, w: 0.4, h: 0.14 },
  ];
  for (let i = 0; i < quoteCount; i++) {
    const qp = quotePositions[i];
    const qx = qp.x * width;
    const qy = qp.y * height;
    const qw = qp.w * width;
    const qh = qp.h * height;
    const rotation = (rand() - 0.5) * 10;
    addPaper(box(qx, qy, qw, qh, rotation), colors[i % colors.length], true, 6 * s);
    addText(
      data.copy.quotes[i + 2].replace(/\n/g, ' '),
      box(qx + 12 * s, qy + 12 * s, qw - 24 * s, qh - 24 * s, rotation),
      Math.min(26 * s, qw / 12),
      ink,
      'caveat-brush',
    );
  }

  // ── Title with outlined/shadow text ──
  const titleLines = data.title.split('\n');
  const titleY = height * 0.38;
  titleLines.forEach((line, i) => {
    addText(
      line.trim(),
      box(width * 0.1, titleY + i * 55 * s, width * 0.8, 55 * s, (rand() - 0.5) * 6),
      Math.min(52 * s, ((width * 0.8) / line.length) * 1.2),
      ink,
      'caveat-brush',
      true, // shadow for readability
    );
  });

  // ── Decorative shapes ──
  addShape(box(width * 0.08, height * 0.06, 35 * s, 35 * s, 15), colors[0], 'star');
  addShape(box(width * 0.88, height * 0.85, 28 * s, 28 * s, -10), colors[2], 'heart');
  addShape(box(width * 0.75, height * 0.12, 22 * s, 22 * s, 8), colors[3], 'star');
  if (count >= 6) {
    addShape(box(width * 0.15, height * 0.88, 25 * s, 25 * s, -12), colors[1], 'star');
  }

  // ── Year badge ──
  const yearStr = String(new Date().getFullYear());
  addPaper(
    box(width * 0.04, height * 0.04, 70 * s, 35 * s, -5),
    colors[4 % colors.length],
    true,
    18 * s,
  );
  addText(
    yearStr,
    box(width * 0.04 + 6 * s, height * 0.04 + 6 * s, 58 * s, 23 * s, -5),
    20 * s,
    ink,
    'fraunces',
  );

  return { layers };
}

/* ═══════════════════════════════════════════════════════════════════════════
   EDITORIAL — Hero image + magazine-style varied grid.
   Inspired by Pinterest study aesthetic boards (image 3).

   Algorithm: Mixed-size editorial grid.
   - One hero photo takes up ~40% of the board
   - Remaining photos fill a varied grid (some tall, some wide)
   - Quote cards interspersed
   - Clean gaps between photos
   - Title banner at top
   ═══════════════════════════════════════════════════════════════════════════ */
function editorialComposition(
  count: number,
  width: number,
  height: number,
  ratios: number[],
  data: (typeof PHOTO_THEMES)[PhotoTheme],
  s: number,
): PhotoComposition {
  const layers: PhotoComposition['layers'] = [];
  const colors = data.palette.colors,
    ink = data.palette.ink;
  const rand = seededRandom(count * 17 + Math.round(width) * 11);

  const box = (x: number, y: number, w: number, h: number, rotation = 0): Box => ({
    x,
    y,
    width: w,
    height: h,
    rotation,
  });
  const addPaper = (b: Box, color: string, shadow = false, radius = 4 * s) => {
    const appearance = createAppearance('closed-shape');
    appearance.fill.paint = { kind: 'solid', color };
    if (shadow)
      appearance.shadow = {
        enabled: true,
        color: ink,
        opacity: 0.1,
        blur: 8 * s,
        offsetX: 0,
        offsetY: 4 * s,
      };
    layers.push({
      id: `decoration-${layers.length}`,
      kind: 'shape',
      shape: 'rectangle',
      ...b,
      appearance,
      radius,
    });
  };
  const addText = (copy: string, b: Box, size: number, color: string, font = 'fraunces') => {
    const appearance = createAppearance('text');
    appearance.fill.paint = { kind: 'solid', color };
    layers.push({
      id: `decoration-${layers.length}`,
      kind: 'text',
      ...b,
      text: copy,
      fontFamily: canonicalFontId(font),
      fontSize: size,
      align: 'center',
      textPadding: 0,
      lineHeight: 1.15,
      appearance,
    });
  };

  // Background
  addPaper(box(0, 0, width, height), data.palette.paper, false, 0);

  const gap = 6 * s;
  const margin = 16 * s;

  // ── Title banner ──
  const bannerH = 65 * s;
  addPaper(box(margin, margin, width - margin * 2, bannerH), colors[0], false, 8 * s);
  addText(
    data.title.replace(/\n/g, ' '),
    box(margin + 16 * s, margin + 10 * s, width - margin * 2 - 32 * s, bannerH - 20 * s),
    Math.min(36 * s, (width - margin * 2) / 18),
    ink,
    'fraunces',
  );

  const contentY = margin + bannerH + gap;
  const contentH = height - contentY - margin;
  const contentW = width - margin * 2;

  if (count === 1) {
    // Single hero photo
    layers.push({ kind: 'photo', photoIndex: 0, ...box(margin, contentY, contentW, contentH) });
    return { layers };
  }

  // ── Layout depends on photo count ──
  // For editorial, we create a mixed layout with a hero + grid
  const heroPhoto = 0; // first photo is always the hero

  if (count <= 4) {
    // Hero left (60% width) + stack right (40% width)
    const heroW = contentW * 0.58;
    const stackW = contentW - heroW - gap;
    const stackX = margin + heroW + gap;
    layers.push({
      kind: 'photo',
      photoIndex: heroPhoto,
      ...box(margin, contentY, heroW, contentH),
    });

    const stackCount = count - 1;
    const cellH = (contentH - gap * (stackCount - 1)) / stackCount;
    for (let i = 0; i < stackCount; i++) {
      layers.push({
        kind: 'photo',
        photoIndex: i + 1,
        ...box(stackX, contentY + i * (cellH + gap), stackW, cellH),
      });
    }
  } else if (count <= 8) {
    // Hero top-left (takes 2 rows, 2 cols in a 3-col layout)
    const cols = 3;
    const quoteCards = Math.min(2, data.copy.quotes.length);
    const totalItems = count + quoteCards;
    const rowCount = Math.max(3, Math.ceil(totalItems / cols));
    const cellW = (contentW - gap * (cols - 1)) / cols;
    const cellH = (contentH - gap * (rowCount - 1)) / rowCount;

    // Place hero photo spanning 2×2
    layers.push({
      kind: 'photo',
      photoIndex: heroPhoto,
      ...box(margin, contentY, cellW * 2 + gap, cellH * 2 + gap),
    });

    // Place remaining photos and quote cards in remaining cells
    const occupiedCells = new Set<string>();
    // Mark hero cells
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) occupiedCells.add(`${r},${c}`);

    let photoIdx = 1;
    let quoteIdx = 0;
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < cols; c++) {
        if (occupiedCells.has(`${r},${c}`)) continue;
        const cx = margin + c * (cellW + gap);
        const cy = contentY + r * (cellH + gap);

        if (photoIdx < count) {
          layers.push({ kind: 'photo', photoIndex: photoIdx, ...box(cx, cy, cellW, cellH) });
          photoIdx++;
        } else if (quoteIdx < quoteCards) {
          addPaper(box(cx, cy, cellW, cellH), colors[quoteIdx % colors.length], true, 8 * s);
          addText(
            data.copy.quotes[quoteIdx].replace(/\n/g, '\n'),
            box(cx + 12 * s, cy + 12 * s, cellW - 24 * s, cellH - 24 * s),
            Math.min(24 * s, cellW / 10),
            ink,
            'caveat-brush',
          );
          quoteIdx++;
        }
      }
    }
  } else {
    // Large count (9-20): Full magazine grid with varied row heights
    // Row patterns: hero row, then alternating 3 and 4 column rows
    const rows: Array<{ count: number; height: number }> = [];
    let remaining = count;

    // First row: hero + 1 side photo
    rows.push({ count: 2, height: 0.38 });
    remaining -= 2;

    // Subsequent rows alternate between 3 and 4 columns
    let rowType = 0;
    while (remaining > 0) {
      const rowCols = rowType % 2 === 0 ? Math.min(3, remaining) : Math.min(4, remaining);
      const rowH = rowType % 2 === 0 ? 0.22 : 0.18;
      rows.push({ count: rowCols, height: rowH });
      remaining -= rowCols;
      rowType++;
    }

    // Normalize row heights to fit
    const totalH = rows.reduce((sum, r) => sum + r.height, 0);
    const scale = 1 / totalH;

    let currentY = contentY;
    let photoIdx = 0;
    for (const row of rows) {
      const rowH = contentH * row.height * scale - gap;
      const cellW = (contentW - gap * (row.count - 1)) / row.count;

      // First row: hero takes 65% width
      if (photoIdx === 0 && row.count === 2) {
        const heroW = contentW * 0.62;
        const sideW = contentW - heroW - gap;
        layers.push({ kind: 'photo', photoIndex: photoIdx, ...box(margin, currentY, heroW, rowH) });
        photoIdx++;
        layers.push({
          kind: 'photo',
          photoIndex: photoIdx,
          ...box(margin + heroW + gap, currentY, sideW, rowH),
        });
        photoIdx++;
      } else {
        for (let c = 0; c < row.count; c++) {
          if (photoIdx < count) {
            layers.push({
              kind: 'photo',
              photoIndex: photoIdx,
              ...box(margin + c * (cellW + gap), currentY, cellW, rowH),
            });
            photoIdx++;
          }
        }
      }
      currentY += rowH + gap;
    }

    // Scatter quote cards over the layout
    const quoteOverlays = Math.min(3, data.copy.quotes.length);
    const overlayPositions = [
      { x: 0.6, y: 0.65, w: 0.35, h: 0.12 },
      { x: 0.02, y: 0.82, w: 0.38, h: 0.1 },
      { x: 0.35, y: 0.42, w: 0.3, h: 0.1 },
    ];
    for (let i = 0; i < quoteOverlays; i++) {
      const op = overlayPositions[i];
      const qx = margin + op.x * contentW;
      const qy = contentY + op.y * contentH;
      const qw = op.w * contentW;
      const qh = op.h * contentH;
      const rotation = (rand() - 0.5) * 6;
      addPaper(box(qx, qy, qw, qh, rotation), colors[(i + 1) % colors.length], true, 6 * s);
      addText(
        data.copy.quotes[i].replace(/\n/g, ' '),
        box(qx + 10 * s, qy + 8 * s, qw - 20 * s, qh - 16 * s, rotation),
        Math.min(22 * s, qw / 13),
        ink,
        'caveat-brush',
      );
    }
  }

  // Subtitle at bottom
  addText(
    data.subtitle,
    box(margin, height - margin - 24 * s, contentW, 20 * s),
    14 * s,
    ink,
    'fraunces',
  );

  return { layers };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helper: Generate scattered positions that don't bunch together too much.
   Returns positions as fractions of width/height (0..1).
   ═══════════════════════════════════════════════════════════════════════════ */
function generateScatteredPositions(
  count: number,
  _width: number,
  _height: number,
  minSize: number,
  maxSize: number,
  rand: () => number,
): Array<{ x: number; y: number; size: number }> {
  const positions: Array<{ x: number; y: number; size: number }> = [];
  const zones = [
    { x: 0.05, y: 0.1 },
    { x: 0.55, y: 0.05 },
    { x: 0.3, y: 0.3 },
    { x: 0.05, y: 0.55 },
    { x: 0.6, y: 0.5 },
    { x: 0.35, y: 0.7 },
    { x: 0.7, y: 0.25 },
    { x: 0.15, y: 0.78 },
    { x: 0.5, y: 0.8 },
    { x: 0.8, y: 0.65 },
  ];
  for (let i = 0; i < count; i++) {
    const zone = zones[i % zones.length];
    const size = minSize + rand() * (maxSize - minSize);
    // Add jitter to avoid perfect placement
    const jx = (rand() - 0.5) * 0.15;
    const jy = (rand() - 0.5) * 0.15;
    positions.push({
      x: Math.max(0.02, Math.min(0.72, zone.x + jx)),
      y: Math.max(0.02, Math.min(0.72, zone.y + jy)),
      size,
    });
  }
  return positions;
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
