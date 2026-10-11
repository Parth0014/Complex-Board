import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useSurfaceMotion } from '../ui/useSurfaceMotion';

/**
 * Right-hand docked column for the object formatting panel.
 * Replaces the floating Popover: it is a layout sibling of the canvas, so the
 * board shrinks instead of being covered. The panel content owns its own
 * heading and close button, so this wrapper only provides the column.
 */
export function ObjectDock({
  ownerWindow,
  label,
  trigger,
  onClose,
  children,
}: {
  ownerWindow: Window;
  label: string;
  trigger: RefObject<HTMLElement | null>;
  onClose(): void;
  children: ReactNode;
}) {
  const dock = useRef<HTMLElement>(null);
  const { dismiss, motion } = useSurfaceMotion(onClose);
  const close = useRef(dismiss);
  useLayoutEffect(() => {
    close.current = dismiss;
  });
  useLayoutEffect(() => {
    const returnFocus = trigger.current;
    const key = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        (event.target as Element).closest('.gs-popover, .vs-color-picker')
      )
        return;
      event.preventDefault();
      close.current(true);
    };
    ownerWindow.document.addEventListener('keydown', key);
    return () => {
      ownerWindow.document.removeEventListener('keydown', key);
      queueMicrotask(() => returnFocus?.isConnected && returnFocus.focus());
    };
  }, [trigger, ownerWindow]);
  const root = ownerWindow.document.querySelector('.vs-body') ?? ownerWindow.document.body;
  return createPortal(
    <aside
      ref={dock}
      data-appearance-surface
      className="gs-object-dock gs-formatting-popover"
      role="complementary"
      aria-label={label}
      data-motion={motion}
      onClickCapture={(event) => {
        if (
          (event.target as Element).closest(
            'button[aria-label="Close editor panel"], button[aria-label="Close shape inspector"]',
          )
        ) {
          event.stopPropagation();
          dismiss(event.detail === 0);
        }
      }}
    >
      {children}
    </aside>,
    root,
  );
}
