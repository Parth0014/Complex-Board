import type { GratitudeAsset } from '../assets/contracts';
import type { VisionLayout } from './layouts';
import type { VisionTemplate } from './templates';
import type { BoardDocument, BoardItem, DocumentHistory } from './document';

export type GeneratedBoardVisuals = {
  images: { image: string; prompt: string }[];
  palette?: { background: string; text: string; card: string };
};

export type VisionTheme = 'light' | 'dark';
export type VisionFontFamily =
  | 'cascadia'
  | 'georgia'
  | 'nunito'
  | 'lilita-one'
  | 'helvetica'
  | 'virgil'
  | 'assistant'
  | 'comic-shanns'
  | 'playfair-display'
  | 'dm-serif-display'
  | 'cormorant-garamond'
  | 'libre-baskerville'
  | 'inter'
  | 'poppins'
  | 'montserrat'
  | 'raleway'
  | 'caveat'
  | 'dancing-script'
  | 'patrick-hand'
  | 'kalam'
  | 'fredoka'
  | 'pacifico';

export interface VisionTextPreset {
  id: string;
  label: string;
  sample: string;
  category: 'editorial' | 'handwritten' | 'playful' | 'minimal' | 'reflection';
  fontFamily: VisionFontFamily;
  fontSize: number;
  color: string;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export type VisionSelectionKind =
  'none' | 'text' | 'note' | 'image' | 'shape' | 'drawing' | 'item' | 'multiple';

export type VisionImageFilter =
  'original' | 'warm' | 'film' | 'soft' | 'mono' | 'dreamy' | 'vintage';

export type VisionImageFrame =
  | 'none'
  | 'rounded'
  | 'circle'
  | 'polaroid'
  | 'film'
  | 'arch'
  | 'heart'
  | 'blob'
  | 'organic'
  | 'torn';

export interface VisionImageEdits {
  filter: VisionImageFilter;
  frame: VisionImageFrame;
  brightness: number;
  exposure: number;
  contrast: number;
  saturation: number;
  highlights: number;
  shadows: number;
  fade: number;
  grain: number;
  borderWidth: number;
  borderColor: string;
  shadow: number;
  glow: number;
  warmth: number;
  blur: number;
  flipX: boolean;
  flipY: boolean;
}

export interface VisionSelection {
  ids: string[];
  count: number;
  kind: VisionSelectionKind;
  style: {
    fontFamily?: VisionFontFamily;
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    strokeColor?: string;
    backgroundColor?: string;
    strokeWidth?: number;
    opacity?: number;
    width?: number;
    height?: number;
    rounded?: boolean;
    imageEdits?: VisionImageEdits;
  };
}

export type VisionSelectionPatch = Partial<VisionSelection['style']>;

export interface VisionPoint {
  x: number;
  y: number;
  constrainToBoard?: boolean;
}

/** Product-facing canvas API. No Excalidraw types may cross this boundary. */
export interface CanvasAdapter {
  createImage(
    blob: Blob,
    ownerWindow: Window & typeof globalThis,
    sourceAsset?: GratitudeAsset,
    position?: VisionPoint,
  ): Promise<string>;
  replaceSelectedImage(
    blob: Blob,
    ownerWindow: Window & typeof globalThis,
    sourceAsset?: GratitudeAsset,
  ): Promise<string | null>;
  getSelection(): VisionSelection;
  updateSelection(patch: VisionSelectionPatch): void;
  updateImageEdits(patch: Partial<VisionImageEdits>, ownerDocument: Document): Promise<void>;
  resetImageEdits(ownerDocument: Document): Promise<void>;
  previewOriginalImage(show: boolean): void;
  startImageCrop(): void;
  setImageFit(mode: 'fit' | 'fill'): void;
  rotateSelection(degrees: number): void;
  select(ids: string[]): void;
  delete(ids: string[]): void;
  /** Remove every content element, keeping the board page and background. Undoable. */
  clearBoard(): void;
  duplicateSelection(): void;
  arrangeSelection(position: 'front' | 'back'): void;
  activateTool(tool: 'image' | 'note' | 'text'): void;
  createTextPreset(preset: VisionTextPreset): void;
  applyLayout(layout: VisionLayout): void;
  applyTemplate(template: VisionTemplate): void;
  fitBoard(): void;
  exportImage(): void;
  exportSelection(): void;
  downloadSelectedPrint(ownerDocument: Document, scale?: number): Promise<void>;
  downloadHighResolution(ownerDocument: Document, scale?: number): Promise<void>;
  printBoard(ownerDocument: Document): Promise<void>;
  downloadReelVideo(ownerDocument: Document): Promise<void>;
  downloadAttributions(ownerDocument: Document): void;
  downloadReelPlan(ownerDocument: Document): void;
  downloadReel(ownerDocument: Document): void;
}

export const EMPTY_VISION_SELECTION: VisionSelection = {
  ids: [],
  count: 0,
  kind: 'none',
  style: {},
};

/** Studio uses only this product-facing interface; engine types stay in canvas/. */
export interface StudioAdapter extends CanvasAdapter {
  saveStatus: string;
  backup(): Promise<void>;
  uploadPhotos(files: File[], position?: VisionPoint): Promise<void>;
  replaceImageFile(id: string, file: File): Promise<void>;
  downloadOriginalPhoto(): Promise<void>;
  restore(text: string): Promise<void>;
  exportFormat(format: 'jpeg' | 'transparent' | 'pdf' | '4k' | 'pdf-all'): Promise<void>;
  history: DocumentHistory;
  ownerWindow: Window & typeof globalThis;
  selectedIds: string[];
  subscribe(listener: () => void): () => void;
  getSnapshot(): number;
  commit(document: BoardDocument): void;
  patchItems(patches: Array<{ id: string; patch: Partial<BoardItem> }>): void;
  insertAsset(asset: GratitudeAsset): Promise<string>;
  undo(): void;
  redo(): void;
}
export interface EditorAdapter extends StudioAdapter {
  applyReferenceTemplate(
    layout: import('./referenceTemplate').ReferenceLayout,
    revision: number,
  ): Promise<void>;
  replaceAsset(id: string): Promise<string | null>;
  shapeAssist: boolean;
  cleanSelectedDrawings(): void;
  clipboardStatus: string;
  copyToSystem(cut?: boolean): Promise<void>;
  pasteFromSystem(): Promise<void>;
  copyStyle(): void;
  pasteStyle(): void;
  canPasteStyle: boolean;
  recolorAsset(from: string, to: string): Promise<void>;
  removeBackground(): Promise<void>;
  upscaleImage(): Promise<void>;
  upscaleAI(): Promise<void>;
  editingSource(): { image: string; id: string; revision: number; width: number; height: number };
  applyEditedImage(id: string, revision: number, url: string): Promise<void>;
  splitImageLayers(): Promise<void>;
  matchImageStyle(): Promise<void>;
  cropDraft?: { id: string; crop: NonNullable<BoardItem['crop']> };
  updateCropDraft(crop: NonNullable<BoardItem['crop']>): void;
  applyCrop(): void;
  cancelCrop(): void;
  insertGeneratedImage(url: string, prompt: string, background?: boolean): Promise<void>;
  composeBoard(
    title: string,
    goals: string[],
    theme?: string,
    visuals?: GeneratedBoardVisuals,
  ): Promise<void>;
  composeGeneratedBoard(
    title: string,
    goals: string[],
    visuals: GeneratedBoardVisuals,
  ): Promise<void>;
  groupScope: string[];
  path(item: BoardItem): string[];
  unitKey(item: BoardItem): string;
  reorderLayer(source: string, target: string, parent: string[]): void;
  enterGroup(id: string): void;
  exitGroup(): void;
  arrangeSelection(position: 'front' | 'back' | 'forward' | 'backward'): void;
  createShape(shape: NonNullable<BoardItem['shape']>): void;
  connectSelection(): void;
  createCard(text: string, context?: 'goal' | 'affirmation'): void;
  attachFrameContent(assetId: string): Promise<void>;
  detachFrameContent(): void;
}
