import type { DragEvent } from 'react';
import type { BoardItem } from '../vision/document';
import type { VisionTextPreset } from '../vision/contracts';

export const CANVAS_CREATION_DRAG_TYPE = 'application/x-visbo-creation';
export type CanvasCreation =
  | { kind: 'shape'; shape: NonNullable<BoardItem['shape']> }
  | { kind: 'text'; preset: VisionTextPreset }
  | { kind: 'generated-image'; image: string; prompt: string };

export function startCanvasDrag(event: DragEvent, type: string, value: string) {
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(type, value);
}

export function startCreationDrag(event: DragEvent, creation: CanvasCreation) {
  startCanvasDrag(event, CANVAS_CREATION_DRAG_TYPE, JSON.stringify(creation));
}
