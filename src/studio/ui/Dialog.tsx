import { readDuration } from './motion';
import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type Ref,
} from 'react';

export type DialogHandle = {
  /** Play the configured exit animation, then fire onClose. */
  requestClose: () => void;
};

export function Dialog({
  onClose,
  children,
  ref,
  ...props
}: Omit<ComponentProps<'div'>, 'ref'> & {
  onClose: () => void;
  'aria-label': string;
  ref?: Ref<DialogHandle>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const exitTimer = useRef<number | null>(null);
  const [exiting, setExiting] = useState(false);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  const requestClose = useCallback(() => {
    const node = dialogRef.current;
    const ownerWindow = node?.ownerDocument.defaultView;
    if (!node || !ownerWindow || exitTimer.current !== null) return;
    setExiting(true);
    exitTimer.current = ownerWindow.setTimeout(() => close.current(), readDuration(node));
  }, []);
  useImperativeHandle(ref, () => ({ requestClose }), [requestClose]);

  useLayoutEffect(() => {
    const node = dialogRef.current!;
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
        requestClose();
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
      if (exitTimer.current !== null)
        node.ownerDocument.defaultView?.clearTimeout(exitTimer.current);
      if (previous?.isConnected) previous.focus();
    };
  }, [requestClose]);
  const { className = '', ...rest } = props;
  return (
    <div
      {...rest}
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className={`${className}${exiting ? ' gs-dialog-exit' : ''}`}
    >
      {children}
    </div>
  );
}
