import { useLayoutEffect, useRef, type ComponentProps } from 'react';
import { useSurfaceMotion } from './useSurfaceMotion';
export function Dialog({
  onClose,
  children,
  ...props
}: ComponentProps<'div'> & { onClose: () => void; 'aria-label': string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { dismiss, motion } = useSurfaceMotion(onClose);
  const close = useRef(dismiss);
  useLayoutEffect(() => {
    close.current = dismiss;
  });
  useLayoutEffect(() => {
    const node = ref.current!;
    const previous = node.ownerDocument.activeElement as HTMLElement | null;
    const focusable = () =>
      [
        ...node.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length);
    (focusable()[0] ?? node).focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target as HTMLElement).closest('.gs-popover')) {
        event.preventDefault();
        event.stopPropagation();
        close.current(true);
      }
      if (event.key === 'Tab') {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (!first) {
          event.preventDefault();
          node.focus();
        } else if (event.shiftKey && node.ownerDocument.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && node.ownerDocument.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    node.addEventListener('keydown', key);
    return () => {
      node.removeEventListener('keydown', key);
      previous?.isConnected && previous.focus();
    };
  }, []);
  return (
    <div
      {...props}
      ref={ref}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      data-motion={motion}
      onClickCapture={(event) => {
        if ((event.target as Element).closest('[data-dialog-close]')) {
          event.stopPropagation();
          dismiss(event.detail === 0);
        }
      }}
    >
      {children}
    </div>
  );
}
