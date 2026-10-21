import type { GratitudeAsset } from '../../assets/contracts';
import type { VisionFontFamily } from '../contracts';
import type { FrameShape } from '../frames';
import type { TextRun } from '../text';

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
  scrapbookEmoji?: boolean;
  collageLayout?: import('../collageAdjustment').CollageLayout;
  scrapbookPhoto?: import('../scrapbookPresets').ScrapbookPhoto;
  scrapbookPaper?: { width: number; height: number };
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
  paperEdge?: import('../paperEdge').PaperEdge;
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
    | 'diamond'
    | 'hexagon'
    | 'octagon'
    | 'badge'
    | 'flower'
    | 'arch'
    | 'line'
    | 'arrow';
  connector?: { from: string; to: string };
  points?: number[];
  strokeTension?: number;
  strokeWidth?: number;
  crop?: { x: number; y: number; width: number; height: number };
  imageFit?: 'fit' | 'fill';
  imageRotation?: number;
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
  boardTheme?: string;
  updatedAt?: number;
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
