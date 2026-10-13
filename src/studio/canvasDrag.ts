import type { DragEvent } from 'react';
import type { BoardItem } from '../vision/document';
import type { VisionTextPreset } from '../vision/contracts';
import {
  assetDropSize,
  shapeDropSize,
  textDropSize,
  type DropSize,
} from '../vision/canvas/dropPlacement';

export const CANVAS_CREATION_DRAG_TYPE = 'application/x-visbo-creation';
export type CanvasCreation =
  | { kind: 'shape'; shape: NonNullable<BoardItem['shape']> }
  | { kind: 'text'; preset: VisionTextPreset }
  | { kind: 'generated-image'; image: string; prompt: string };

type CanvasDragPreview = { size: (board: DropSize) => DropSize };
const activeDrags = new WeakMap<Window, CanvasDragPreview>();
export const CANVAS_DRAG_END = 'visbo-canvas-drag-end';

export function canvasDragPreview(win: Window) {
  return activeDrags.get(win);
}

export function startCanvasDrag(
  event: DragEvent,
  type: string,
  value: string,
  preview?: CanvasDragPreview,
) {
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData(type, value);
  const source = event.currentTarget as HTMLElement;
  const win = source.ownerDocument.defaultView;
  if (!win) return;
  const image =
    source.tagName === 'IMG' ? (source as HTMLImageElement) : source.querySelector('img');
  const width = image?.naturalWidth || 240,
    height = image?.naturalHeight || 240;
  activeDrags.set(win, preview || { size: () => assetDropSize(width, height) });
  const ghost = (image || source).cloneNode(true) as HTMLElement;
  ghost.removeAttribute('id');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.classList.add('canvas-drag-ghost');
  const ghostWidth = image
    ? (88 * width) / Math.max(width, height)
    : Math.min(180, source.getBoundingClientRect().width);
  const ghostHeight = image
    ? (88 * height) / Math.max(width, height)
    : Math.min(96, source.getBoundingClientRect().height);
  ghost.style.width = `${ghostWidth}px`;
  ghost.style.height = `${ghostHeight}px`;
  source.ownerDocument.body.appendChild(ghost);
  event.dataTransfer.setDragImage(ghost, ghostWidth / 2, ghostHeight / 2);
  source.classList.add('is-canvas-dragging');
  // The browser captures the ghost synchronously; remove it on the next frame.
  win.requestAnimationFrame(() => ghost.remove());
  source.addEventListener(
    'dragend',
    () => {
      source.classList.remove('is-canvas-dragging');
      ghost.remove();
      activeDrags.delete(win);
      win.dispatchEvent(new Event(CANVAS_DRAG_END));
    },
    { once: true },
  );
}

export function startCreationDrag(event: DragEvent, creation: CanvasCreation) {
  const image = event.currentTarget as HTMLImageElement;
  const ratio =
    image.naturalHeight && image.naturalWidth ? image.naturalHeight / image.naturalWidth : 1;
  startCanvasDrag(event, CANVAS_CREATION_DRAG_TYPE, JSON.stringify(creation), {
    size: (board) =>
      creation.kind === 'shape'
        ? shapeDropSize(creation.shape, board)
        : creation.kind === 'text'
          ? textDropSize(creation.preset, board)
          : { width: 400, height: 400 * ratio },
  });
}
