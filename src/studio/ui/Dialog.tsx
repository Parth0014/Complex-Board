import { useLayoutEffect, useRef, type ComponentProps } from 'react';
export function Dialog({
  onClose,
  children,
  ...props
}: ComponentProps<'div'> & { onClose: () => void; 'aria-label': string }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
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
        close.current();
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
    <div {...props} ref={ref} role="dialog" aria-modal="true" tabIndex={-1}>
      {children}
    </div>
  );
}
