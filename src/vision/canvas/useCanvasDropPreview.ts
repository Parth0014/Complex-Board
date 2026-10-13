import { useCallback, useEffect, useRef } from 'react';
import type { VisionPoint } from '../contracts';
import { CANVAS_DRAG_END, canvasDragPreview } from '../../studio/canvasDrag';
import { centeredDropPosition, type DropSize } from './dropPlacement';

export function useCanvasDropPreview(
  win: Window & typeof globalThis,
  board: DropSize,
  geometry: () => { rect: DOMRect; left: number; top: number; scale: number } | null,
) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const pointer = useRef<VisionPoint | null>(null);
  const dimensions = useRef<DropSize | null>(null);
  const pending = useRef(false);
  const pendingPoint = useRef<VisionPoint | null>(null);
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
    const size = dimensions.current || { width: 96 / view.scale, height: 96 / view.scale };
    const position = centeredDropPosition(world, size, current.current.board);
    node.style.transform = `translate3d(${view.rect.left + view.left + position.x * view.scale}px, ${view.rect.top + view.top + position.y * view.scale}px, 0)`;
    node.style.width = `${size.width * view.scale}px`;
    node.style.height = `${size.height * view.scale}px`;
    node.dataset.pending = String(pending.current);
    node.dataset.label = pending.current ? 'Adding…' : 'Release to add';
  }, []);

  const schedule = useCallback(() => {
    if (frame.current === null) frame.current = win.requestAnimationFrame(render);
  }, [win, render]);

  const move = (clientX: number, clientY: number) => {
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
