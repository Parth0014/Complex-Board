import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

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
  useLayoutEffect(() => {
    const returnFocus = trigger.current;
    dock.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    return () => {
      queueMicrotask(() => returnFocus?.isConnected && returnFocus.focus());
    };
  }, [trigger]);
  const root = ownerWindow.document.querySelector('.vs-body') ?? ownerWindow.document.body;
  const keys = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (/INPUT|TEXTAREA|SELECT/.test((event.target as Element).tagName)) return;
    event.stopPropagation();
    onClose();
    trigger.current?.focus();
  };
  return createPortal(
    <aside
      ref={dock}
      data-appearance-surface
      className="gs-object-dock gs-formatting-popover"
      role="complementary"
      aria-label={label}
      onKeyDown={keys}
    >
      {children}
    </aside>,
    root,
  );
}
