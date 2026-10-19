import type { DragEvent } from 'react';
import type { BoardItem } from '../vision/document';
import type { VisionTextPreset } from '../vision/contracts';
import { assetDropSize, shapeDropSize, textDropSize, type DropSize } from '../vision/dropPlacement';

export const CANVAS_CREATION_DRAG_TYPE = 'application/x-visbo-creation';
export type CanvasCreation =
  | { kind: 'shape'; shape: NonNullable<BoardItem['shape']> }
  | { kind: 'text'; preset: VisionTextPreset }
  | { kind: 'generated-image'; image: string; prompt: string };

type CanvasDragPreview = { size: (board: DropSize) => DropSize; ghost?: DropSize; photo?: boolean };
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
  const textSample = source.querySelector<HTMLElement>('.text-panel__sample');
  let ghost: HTMLElement;
  let ghostWidth: number;
  let ghostHeight: number;

  if (textSample) {
    ghost = textSample.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('id');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.classList.add('canvas-drag-ghost', 'canvas-drag-ghost--text');
    // Ensure clean inline styling matching the rendered sample text
    ghost.style.position = 'fixed';
    ghost.style.left = '-10000px';
    ghost.style.top = '0';
    ghost.style.margin = '0';
    ghost.style.padding = '8px 16px';
    ghost.style.background = 'transparent';
    ghost.style.boxShadow = 'none';
    ghost.style.border = 'none';
    ghost.style.width = 'auto';
    ghost.style.height = 'auto';
    ghost.style.maxWidth = '360px';
    ghost.style.whiteSpace = 'nowrap';
    ghost.style.overflow = 'visible';
    ghost.style.display = 'inline-block';
    ghost.style.pointerEvents = 'none';

    // Copy font styles from the source sample element if present
    const computed = win.getComputedStyle(textSample);
    ghost.style.fontFamily = computed.fontFamily;
    ghost.style.fontSize = computed.fontSize;
    ghost.style.fontWeight = computed.fontWeight;
    ghost.style.fontStyle = computed.fontStyle;
    ghost.style.letterSpacing = computed.letterSpacing;
    ghost.style.color = computed.color;

    source.ownerDocument.body.appendChild(ghost);
    const rect = ghost.getBoundingClientRect();
    ghostWidth = Math.max(rect.width, 40);
    ghostHeight = Math.max(rect.height, 24);
  } else {
    ghost = (image || source).cloneNode(true) as HTMLElement;
    ghost.removeAttribute('id');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.classList.add('canvas-drag-ghost');
    ghostWidth = image
      ? (88 * width) / Math.max(width, height)
      : Math.min(180, source.getBoundingClientRect().width);
    ghostHeight = image
      ? (88 * height) / Math.max(width, height)
      : Math.min(96, source.getBoundingClientRect().height);
    ghost.style.width = `${ghostWidth}px`;
    ghost.style.height = `${ghostHeight}px`;
    source.ownerDocument.body.appendChild(ghost);
  }

  activeDrags.set(win, {
    ...(preview || { size: () => assetDropSize(width, height) }),
    ghost: { width: ghostWidth, height: ghostHeight },
    photo:
      type === 'application/x-gratitude-asset' &&
      (() => {
        try {
          return JSON.parse(value).type === 'photo';
        } catch {
          return false;
        }
      })(),
  });
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
