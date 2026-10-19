import { useCallback, useEffect, useRef } from 'react';
import type { VisionPoint } from '../contracts';
import { CANVAS_DRAG_END, canvasDragPreview } from '../../studio/canvasDrag';
import { centeredDropPosition, type DropSize } from './dropPlacement';
type DropTarget = DropSize & VisionPoint & { id: string };

export function useCanvasDropPreview(
  win: Window & typeof globalThis,
  board: DropSize,
  geometry: () => { rect: DOMRect; left: number; top: number; scale: number } | null,
  resolveTarget?: (point: VisionPoint) => DropTarget | undefined,
) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const pointer = useRef<VisionPoint | null>(null);
  const dimensions = useRef<DropSize | null>(null);
  const pending = useRef(false);
  const pendingPoint = useRef<VisionPoint | null>(null);
  const target = useRef<DropTarget | undefined>(undefined);
  const current = useRef({ board, geometry });
  useEffect(() => {
    current.current = { board, geometry };
  });

  const clear = useCallback(() => {
    if (frame.current !== null) win.cancelAnimationFrame(frame.current);
    frame.current = null;
    pointer.current = null;
    dimensions.current = null;
    pending.current = false;
    pendingPoint.current = null;
    target.current = undefined;
    if (ref.current) ref.current.hidden = true;
  }, [win]);

  const render = useCallback(() => {
    frame.current = null;
    const node = ref.current,
      point = pointer.current;
    const view = current.current.geometry();
    if (!node || !point || !view) return;
    const world = pendingPoint.current || {
      x: (point.x - view.rect.left - view.left) / view.scale,
      y: (point.y - view.rect.top - view.top) / view.scale,
    };
    const valid =
      world.x >= 0 &&
      world.y >= 0 &&
      world.x <= current.current.board.width &&
      world.y <= current.current.board.height;
    node.hidden = !valid;
    if (!valid) return;
    const size = target.current ||
      dimensions.current || { width: 96 / view.scale, height: 96 / view.scale };
    const position = target.current || centeredDropPosition(world, size, current.current.board);
    const left = view.rect.left + view.left + position.x * view.scale;
    const top = view.rect.top + view.top + position.y * view.scale;
    node.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    node.style.width = `${size.width * view.scale}px`;
    node.style.height = `${size.height * view.scale}px`;
    // Native drag images paint above all DOM layers. Position the hint outside
    // that image as well as the placement outline, rather than raising z-index.
    const ghostHeight = canvasDragPreview(win)?.ghost?.height || 96;
    const above = Math.min(top - 8, point.y - ghostHeight / 2 - 8);
    const below = above < 32;
    const labelY = below ? point.y + ghostHeight / 2 + 8 : above;
    node.style.setProperty(
      '--drop-label-x',
      `${Math.max(64, Math.min(win.innerWidth - 64, point.x)) - left}px`,
    );
    node.style.setProperty('--drop-label-y', `${labelY - top}px`);
    node.style.setProperty('--drop-label-shift', below ? '0%' : '-100%');
    node.dataset.pending = String(pending.current);
    node.dataset.replacing = String(!!target.current);
    node.dataset.label = pending.current
      ? 'Adding…'
      : target.current
        ? 'Replace photo · Alt to add separately'
        : 'Release to add';
  }, [win]);

  const schedule = useCallback(() => {
    if (frame.current === null) frame.current = win.requestAnimationFrame(render);
  }, [win, render]);

  const move = (clientX: number, clientY: number, replace = false) => {
    if (pending.current) return false;
    const view = geometry();
    if (!view) return false;
    const x = (clientX - view.rect.left - view.left) / view.scale;
    const y = (clientY - view.rect.top - view.top) / view.scale;
    const valid = x >= 0 && y >= 0 && x <= board.width && y <= board.height;
    if (!valid) {
      clear();
      return false;
    }
    if (!dimensions.current) dimensions.current = canvasDragPreview(win)?.size(board) || null;
    target.current = replace ? resolveTarget?.({ x, y }) : undefined;
    pointer.current = { x: clientX, y: clientY };
    schedule();
    return true;
  };

  useEffect(() => {
    const end = () => {
      if (!pending.current) clear();
    };
    const scroll = () => {
      if (pointer.current) schedule();
    };
    win.addEventListener(CANVAS_DRAG_END, end);
    win.addEventListener('dragend', end);
    win.addEventListener('blur', end);
    win.addEventListener('scroll', scroll, true);
    return () => {
      clear();
      win.removeEventListener(CANVAS_DRAG_END, end);
      win.removeEventListener('dragend', end);
      win.removeEventListener('blur', end);
      win.removeEventListener('scroll', scroll, true);
    };
  }, [win, clear, schedule]);

  return {
    ref,
    move,
    clear,
    pending,
    target,
    leave: () => {
      if (!pending.current) clear();
    },
    begin: () => {
      if (frame.current !== null) win.cancelAnimationFrame(frame.current);
      const view = geometry(),
        point = pointer.current;
      if (view && point)
        pendingPoint.current = {
          x: (point.x - view.rect.left - view.left) / view.scale,
          y: (point.y - view.rect.top - view.top) / view.scale,
        };
      pending.current = true;
      render();
    },
  };
}
