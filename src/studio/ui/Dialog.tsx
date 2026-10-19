import { readDuration } from './motion';
import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type Ref,
  type RefObject,
} from 'react';

export type DialogHandle = {
  /** Play the configured exit animation, then fire onClose. */
  requestClose: () => void;
};

export function Dialog({
  onClose,
  children,
  ref,
  dismissible = true,
  initialFocus,
  ...props
}: Omit<ComponentProps<'div'>, 'ref'> & {
  onClose: () => void;
  'aria-label': string;
  ref?: Ref<DialogHandle>;
  /** Keep an in-flight operation visible until it settles. */
  dismissible?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const canDismiss = useRef(dismissible);
  const exitTimer = useRef<number | null>(null);
  const [exiting, setExiting] = useState(false);
  useLayoutEffect(() => {
    close.current = onClose;
    canDismiss.current = dismissible;
  });

  const requestClose = useCallback(() => {
    const node = dialogRef.current;
    const ownerWindow = node?.ownerDocument.defaultView;
    if (!node || !ownerWindow || !canDismiss.current || exitTimer.current !== null) return;
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
      ].filter((el) => el.getClientRects().length && !el.closest('[inert], [hidden]'));
    (initialFocus?.current ?? focusable()[0] ?? node).focus();
    const containFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      // A nested dialog owns focus until it closes. Portaled menus have their own
      // keyboard handling and are owned by the control that opened them.
      const dialogs = node.ownerDocument.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== node || node.contains(target)) return;
      const popover = target.closest('.gs-popover');
      if (
        popover?.id &&
        [...node.querySelectorAll('[aria-controls]')].some(
          (trigger) => trigger.getAttribute('aria-controls') === popover.id,
        )
      )
        return;
      (focusable()[0] ?? node).focus();
    };
    const key = (event: KeyboardEvent) => {
      const dialogs = node.ownerDocument.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== node) return;
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
    node.ownerDocument.addEventListener('keydown', key);
    node.ownerDocument.addEventListener('focusin', containFocus);
    return () => {
      node.ownerDocument.removeEventListener('keydown', key);
      node.ownerDocument.removeEventListener('focusin', containFocus);
      if (exitTimer.current !== null)
        node.ownerDocument.defaultView?.clearTimeout(exitTimer.current);
      if (previous?.isConnected) previous.focus();
    };
  }, [requestClose, initialFocus]);
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
