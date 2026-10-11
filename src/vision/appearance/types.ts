import type { BoardDocument, BoardItem, BoardPage } from './legacy';

export const APPEARANCE_VERSION = 1 as const;
export const CANONICAL_DOCUMENT_VERSION = 3 as const;

export type Paint =
  | { kind: 'solid'; color: string }
  | { kind: 'linear' | 'radial'; stops: readonly [string, string] };
/** Disabled fill retains its paint, rather than losing an old no-fill gradient. */
export interface Fill {
  enabled: boolean;
  paint: Paint;
}
export interface Stroke {
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  cap: 'butt' | 'round' | 'square';
  join: 'miter' | 'round' | 'bevel';
  scaling: 'transform' | 'fixed';
}
export interface Shadow {
  enabled: boolean;
  color: string;
  opacity: number;
  blur: number;
  offsetX: number;
  offsetY: number;
}
export type Effect = 'none' | 'glow' | 'echo' | 'outline' | 'glitch';
interface AppearanceBase {
  version: typeof APPEARANCE_VERSION;
  opacity: number;
  shadow: Shadow;
  effect: Effect;
  /** Existing alpha-silhouette outline, distinct from geometric/glyph stroke. */
  silhouette: { width: number; color: string };
}
export interface TextAppearance extends AppearanceBase {
  kind: 'text';
  fill: Fill;
  stroke: Stroke;
  background: string | null;
}
export interface ClosedShapeAppearance extends AppearanceBase {
  kind: 'closed-shape';
  fill: Fill;
  stroke: Stroke;
}
export interface OpenShapeAppearance extends AppearanceBase {
  kind: 'open-shape';
  stroke: Stroke;
}
export interface DrawingAppearance extends AppearanceBase {
  kind: 'drawing';
  stroke: Stroke;
}
export type Appearance =
  TextAppearance | ClosedShapeAppearance | OpenShapeAppearance | DrawingAppearance;

export const LEGACY_APPEARANCE_FIELDS = [
  'color',
  'fill',
  'gradient',
  'gradientType',
  'noFill',
  'borderWidth',
  'borderColor',
  'borderStyle',
  'strokeWidth',
  'opacity',
  'shadow',
  'shadowColor',
  'shadowOpacity',
  'shadowBlur',
  'shadowOffsetX',
  'shadowOffsetY',
  'effect',
  'textBackground',
  'stickerWidth',
  'stickerColor',
] as const satisfies readonly (keyof BoardItem)[];
type LegacyAppearanceField = (typeof LEGACY_APPEARANCE_FIELDS)[number];
type ObjectData = Omit<BoardItem, LegacyAppearanceField | 'kind'> &
  Partial<Record<LegacyAppearanceField, never>>;
export type EditableItem =
  | (ObjectData & { kind: 'text'; appearance: TextAppearance })
  | (ObjectData & { kind: 'shape'; appearance: ClosedShapeAppearance | OpenShapeAppearance })
  | (ObjectData & { kind: 'drawing'; appearance: DrawingAppearance });
export type CanonicalItem = EditableItem | (BoardItem & { kind: 'asset'; appearance?: never });
export type CanonicalPage = Omit<BoardPage, 'items'> & { items: CanonicalItem[] };
export type CanonicalDocument = Omit<BoardDocument, 'version' | 'items' | 'pages'> & {
  version: typeof CANONICAL_DOCUMENT_VERSION;
  items: CanonicalItem[];
  pages?: CanonicalPage[];
};
