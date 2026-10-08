import type { GratitudeAsset } from '../assets/contracts';
import type { VisionFontFamily } from './contracts';
import type { FrameShape } from './frames';
import type { TextRun } from './text';

export interface BoardItem {
  id: string;
  kind: 'asset' | 'text' | 'shape' | 'drawing';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  fixedBounds?: boolean;
  contentSize?: { width: number; height: number };
  text?: string;
  fontFamily?: VisionFontFamily;
  fontSize?: number;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  flipX?: boolean;
  flipY?: boolean;
  borderWidth?: number;
  borderColor?: string;
  stickerWidth?: number;
  stickerColor?: string;
  shadow?: 'none' | 'soft' | 'medium' | 'hard';
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  radius?: number;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  fill?: string;
  gradient?: string;
  gradientType?: 'linear' | 'radial';
  effect?: 'none' | 'glow' | 'echo' | 'outline' | 'glitch';
  fontWeight?: number;
  noFill?: boolean;
  textBackground?: string;
  textPadding?: number;
  strike?: boolean;
  curve?: number;
  textRuns?: TextRun[];
  kerning?: boolean;
  ligatures?: boolean;
  vectorPath?: string;
  vectorClip?: number[];
  vectorBox?: { x: number; y: number; width: number; height: number };
  shape?:
    | 'rectangle'
    | 'circle'
    | 'triangle'
    | 'star'
    | 'heart'
    | 'cloud'
    | 'blob'
    | 'burst'
    | 'line'
    | 'arrow';
  connector?: { from: string; to: string };
  points?: number[];
  strokeTension?: number;
  strokeWidth?: number;
  crop?: { x: number; y: number; width: number; height: number };
  imageFit?: 'fit' | 'fill';
  rendition?: string;
  colorOverrides?: Record<string, string>;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  warmth?: number;
  tint?: number;
  filter?: 'original' | 'mono' | 'film' | 'dreamy' | 'warm' | 'vintage';
  contentAsset?: GratitudeAsset;
  frameShape?: FrameShape;
  groupPath?: string[];
  hidden?: boolean;
  asset?: GratitudeAsset;
  slotId?: string;
  templateId?: string;
  templatePlaceholder?: boolean;
  goalId?: string;
  groupId?: string;
  locked?: boolean;
}
export interface BoardPage {
  id: string;
  width: number;
  height: number;
  color: string;
  gradient?: string;
  gradientType?: 'linear' | 'radial';
  background?: GratitudeAsset;
  items: BoardItem[];
}
export interface BoardDocument {
  version: 2;
  title: string;
  width: number;
  height: number;
  color: string;
  background?: GratitudeAsset;
  gradient?: string;
  gradientType?: 'linear' | 'radial';
  items: BoardItem[];
  pages?: BoardPage[];
  activePageId?: string;
}
export const newBoard = (): BoardDocument => ({
  version: 2,
  title: 'My beautiful life',
  width: 1080,
  height: 1080,
  color: '#fffaf6',
  items: [],
});

/** Every user command is one immutable document snapshot. Selection is transient. */
export class DocumentHistory {
  document = newBoard();
  revision = 0;
  private past: BoardDocument[] = [];
  private future: BoardDocument[] = [];
  private gestureStart?: BoardDocument;
  beginGesture() {
    if (!this.gestureStart) this.gestureStart = this.document;
  }
  endGesture() {
    if (!this.gestureStart) return;
    const start = this.gestureStart;
    this.gestureStart = undefined;
    if (start !== this.document) {
      this.past = [...this.past.slice(-99), start];
      this.future = [];
    }
  }
  cancelGesture() {
    if (!this.gestureStart) return;
    this.document = this.gestureStart;
    this.gestureStart = undefined;
    this.revision++;
  }
  get canUndo() {
    return this.past.length > 0 || (!!this.gestureStart && this.gestureStart !== this.document);
  }
  get canRedo() {
    return this.future.length > 0;
  }
  commit(next: BoardDocument) {
    if (!this.gestureStart) this.past = [...this.past.slice(-99), this.document];
    this.document = next;
    if (!this.gestureStart) this.future = [];
    this.revision++;
  }
  undo() {
    this.endGesture();
    const previous = this.past.pop();
    if (!previous) return;
    this.future.push(this.document);
    this.document = previous;
    this.revision++;
  }
  redo() {
    this.endGesture();
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.document);
    this.document = next;
    this.revision++;
  }
}
