import { useLayoutEffect, useRef, type ComponentProps, type RefObject } from 'react';
import { createPortal } from 'react-dom';

type Props = ComponentProps<'div'> & {
  anchor: RefObject<HTMLElement | null>;
  side?: 'bottom' | 'right';
  onDismiss: () => void;
  focusOnOpen?: boolean;
  ownedSurfaceSelector?: string;
};
/** Portaled, viewport-clamped surface shared by toolbar controls and nested menus. */
export function Popover({
  anchor,
  side = 'bottom',
  onDismiss,
  focusOnOpen = false,
  ownedSurfaceSelector,
  className = '',
  children,
  ...props
}: Props) {
  const surface = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  useLayoutEffect(() => {
    dismiss.current = onDismiss;
  });
  useLayoutEffect(() => {
    const node = surface.current,
      trigger = anchor.current;
    if (!node || !trigger) return;
    const doc = trigger.ownerDocument,
      win = doc.defaultView!;
    const position = () => {
      const a = trigger.getBoundingClientRect(),
        b = node.getBoundingClientRect();
      let left = side === 'right' ? a.right : a.right - b.width;
      let top = side === 'right' ? a.top : a.bottom + 6;
      let flippedX = false,
        flippedY = false;
      if (side === 'right' && left + b.width > win.innerWidth - 8) {
        left = a.left - b.width;
        flippedX = true;
      }
      if (side === 'bottom' && top + b.height > win.innerHeight - 8) {
        top = a.top - b.height - 6;
        flippedY = true;
      }
      node.style.left = Math.max(8, Math.min(left, win.innerWidth - b.width - 8)) + 'px';
      node.style.top = Math.max(8, Math.min(top, win.innerHeight - b.height - 8)) + 'px';
      // Scale from the trigger side (item 9); flip the origin when clamped.
      const originX = side === 'right' ? (flippedX ? 'right' : 'left') : 'center';
      const originY = side === 'bottom' ? (flippedY ? 'bottom' : 'top') : 'center';
      node.style.transformOrigin = `${originX} ${originY}`;
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (
        !node.contains(target) &&
        !trigger.contains(target) &&
        !(ownedSurfaceSelector && target.closest(ownedSurfaceSelector))
      )
        dismiss.current();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        dismiss.current();
        trigger.focus();
      }
    };
    const observer = new win.ResizeObserver(position);
    observer.observe(node);
    observer.observe(trigger);
    position();
    if (focusOnOpen)
      node.querySelector<HTMLElement>('button:not(:disabled), input, [tabindex="0"]')?.focus();
    doc.addEventListener('pointerdown', outside);
    node.addEventListener('keydown', key);
    win.addEventListener('resize', position);
    doc.addEventListener('scroll', position, true);
    return () => {
      observer.disconnect();
      doc.removeEventListener('pointerdown', outside);
      node.removeEventListener('keydown', key);
      win.removeEventListener('resize', position);
      doc.removeEventListener('scroll', position, true);
    };
  }, [anchor, side, focusOnOpen, ownedSurfaceSelector]);
  const doc = anchor.current?.ownerDocument;
  return doc
    ? createPortal(
        <div {...props} ref={surface} className={`gs-popover gs-pop-enter ${className}`}>
          {children}
        </div>,
        doc.body,
      )
    : null;
}
