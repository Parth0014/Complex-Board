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
  /** Play the 120ms exit animation, then fire onClose. */
  requestClose: () => void;
};

/** Dialog exit duration (§4): keep in sync with --gs-duration-exit. */
const EXIT_MS = 140;

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
  const [exiting, setExiting] = useState(false);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  const requestClose = useCallback(() => {
    setExiting((was) => {
      if (!was) window.setTimeout(() => close.current(), EXIT_MS);
      return true;
    });
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
