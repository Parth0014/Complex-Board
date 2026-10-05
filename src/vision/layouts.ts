export interface VisionLayoutSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  frame?: 'none' | 'rounded' | 'circle' | 'polaroid';
}

export interface VisionLayout {
  id: string;
  title: string;
  description: string;
  slots: VisionLayoutSlot[];
}

const TEMPLATE_CONTENT_TOP = 0.1;
const TEMPLATE_CONTENT_HEIGHT = 0.88;

export const getLayoutSlotBounds = (
  layoutSlot: VisionLayoutSlot,
  reserveTemplateHeading = false,
) =>
  reserveTemplateHeading
    ? {
        x: layoutSlot.x,
        y: TEMPLATE_CONTENT_TOP + layoutSlot.y * TEMPLATE_CONTENT_HEIGHT,
        width: layoutSlot.width,
        height: layoutSlot.height * TEMPLATE_CONTENT_HEIGHT,
      }
    : {
        x: layoutSlot.x,
        y: layoutSlot.y,
        width: layoutSlot.width,
        height: layoutSlot.height,
      };

const slot = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  frame: VisionLayoutSlot['frame'] = 'none',
  rotation = 0,
): VisionLayoutSlot => ({ id, x, y, width, height, frame, rotation });

export const VISION_LAYOUTS: VisionLayout[] = [
  {
    id: 'hero-four',
    title: 'Hero + four',
    description: 'One defining image with four supporting moments',
    slots: [
      slot('hero', 0.02, 0.02, 0.61, 0.64),
      slot('a', 0.638, 0.02, 0.342, 0.316),
      slot('b', 0.638, 0.344, 0.342, 0.316),
      slot('c', 0.02, 0.668, 0.476, 0.312),
      slot('d', 0.504, 0.668, 0.476, 0.312),
    ],
  },
  {
    id: 'editorial',
    title: 'Editorial story',
    description: 'Magazine inspired rhythm',
    slots: [
      slot('a', 0.02, 0.02, 0.54, 0.96),
      slot('b', 0.568, 0.02, 0.412, 0.378),
      slot('c', 0.568, 0.406, 0.412, 0.574),
    ],
  },
  {
    id: 'nine-grid',
    title: 'Nine moments',
    description: 'A balanced memory grid',
    slots: Array.from({ length: 9 }, (_, index) =>
      slot(
        String(index),
        0.02 + (index % 3) * 0.322,
        0.02 + Math.floor(index / 3) * 0.322,
        0.316,
        0.316,
      ),
    ),
  },
  {
    id: 'three-columns',
    title: 'Three paths',
    description: 'Three equal aspirations',
    slots: [
      slot('a', 0.02, 0.02, 0.316, 0.96),
      slot('b', 0.342, 0.02, 0.316, 0.96),
      slot('c', 0.664, 0.02, 0.316, 0.96),
    ],
  },
  {
    id: 'center-focus',
    title: 'Center focus',
    description: 'A central dream surrounded by details',
    slots: [
      slot('center', 0.29, 0.2, 0.42, 0.6, 'circle'),
      slot('a', 0.03, 0.03, 0.24, 0.35, 'rounded'),
      slot('b', 0.73, 0.03, 0.24, 0.35, 'rounded'),
      slot('c', 0.03, 0.62, 0.24, 0.35, 'rounded'),
      slot('d', 0.73, 0.62, 0.24, 0.35, 'rounded'),
    ],
  },
  {
    id: 'postcards',
    title: 'Postcards',
    description: 'A playful travel wall',
    slots: [
      slot('a', 0.04, 0.05, 0.445, 0.42, 'polaroid', -2),
      slot('b', 0.515, 0.04, 0.445, 0.42, 'polaroid', 2),
      slot('c', 0.04, 0.53, 0.445, 0.42, 'polaroid', 2),
      slot('d', 0.515, 0.54, 0.445, 0.42, 'polaroid', -2),
    ],
  },
  {
    id: 'horizon',
    title: 'Horizon',
    description: 'Wide scenes and small details',
    slots: [
      slot('hero', 0.02, 0.02, 0.96, 0.62),
      slot('a', 0.02, 0.648, 0.316, 0.332),
      slot('b', 0.342, 0.648, 0.316, 0.332),
      slot('c', 0.664, 0.648, 0.316, 0.332),
    ],
  },
  {
    id: 'journal',
    title: 'Journal page',
    description: 'Asymmetric scrapbook composition',
    slots: [
      slot('a', 0.06, 0.07, 0.5, 0.42, 'polaroid', -2),
      slot('b', 0.61, 0.1, 0.32, 0.32, 'circle'),
      slot('c', 0.1, 0.57, 0.3, 0.32, 'rounded', 3),
      slot('d', 0.46, 0.51, 0.47, 0.41, 'none', -1),
    ],
  },
  {
    id: 'diptych',
    title: 'Then and next',
    description: 'Two strong side by side images',
    slots: [slot('a', 0.02, 0.02, 0.476, 0.96), slot('b', 0.504, 0.02, 0.476, 0.96)],
  },
  {
    id: 'cascade',
    title: 'Dream cascade',
    description: 'Overlapping inspiration cards',
    slots: [
      slot('a', 0.08, 0.08, 0.42, 0.45, 'polaroid', -5),
      slot('b', 0.47, 0.12, 0.42, 0.45, 'polaroid', 5),
      slot('c', 0.27, 0.48, 0.46, 0.44, 'polaroid', -1),
    ],
  },
];
