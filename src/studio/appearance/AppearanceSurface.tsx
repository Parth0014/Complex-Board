import {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Dialog, type DialogHandle } from '../ui/Dialog';
import { IconButton } from '../ui/Button';
import { CloseIcon } from '../icons';
import './hybrid.css';

/** Layout/focus only. This surface never owns appearance or changes canvas dimensions. */
export function AppearanceSurface({
  children,
  title,
  onClose,
  trigger,
  ownerWindow,
  onUndo,
  onCancel,
}: {
  children: ReactNode;
  title: string;
  onClose(): void;
  trigger: RefObject<HTMLButtonElement | null>;
  ownerWindow: Window;
  onUndo(redo: boolean): void;
  onCancel(): void;
}) {
  const query = useRef(ownerWindow.matchMedia('(max-width: 768px)')).current;
  const dialogRef = useRef<DialogHandle>(null);
  const mobile = useSyncExternalStore(
    (notify) => {
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => query.matches,
  );
  const [viewport, setViewport] = useState({ height: ownerWindow.innerHeight, offset: 0 });
  const surface = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const visual = ownerWindow.visualViewport;
    const update = () =>
      setViewport({
        height: visual?.height ?? ownerWindow.innerHeight,
        offset: visual?.offsetTop ?? 0,
      });
    update();
    visual?.addEventListener('resize', update);
    visual?.addEventListener('scroll', update);
    ownerWindow.addEventListener('resize', update);
    return () => {
      visual?.removeEventListener('resize', update);
      visual?.removeEventListener('scroll', update);
      ownerWindow.removeEventListener('resize', update);
    };
  }, [ownerWindow]);
  useLayoutEffect(
    () => () => {
      // Selection switching can replace the original trigger while a sheet stays open.
      queueMicrotask(() => {
        if (trigger.current?.isConnected) trigger.current.focus();
      });
    },
    [trigger],
  );
  useLayoutEffect(() => {
    if (mobile) return;
    const node = surface.current!;
    node.querySelector<HTMLButtonElement>('button')?.focus();
  }, [mobile, trigger]);
  const content = (
    <>
      <header className="gs-appearance-header">
        <div>
          <p>APPEARANCE</p>
          <h2>{title}</h2>
        </div>
        <IconButton aria-label="Close appearance inspector" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </header>
      {children}
    </>
  );
  const root = (ownerWindow.document.querySelector('.vs-body') ??
    ownerWindow.document.querySelector('.vs'))!;
  const keys = (event: KeyboardEvent) => {
    if ((event.target as Element).closest('[data-gesture-owner]')) return;
    if (event.key === 'Escape' && (event.target as Element).hasAttribute('data-appearance-draft'))
      return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.stopPropagation();
      onUndo(event.shiftKey);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (/INPUT|TEXTAREA|SELECT/.test((event.target as Element).tagName)) {
        onCancel();
        (event.target as HTMLElement).blur();
      } else onClose();
    }
  };
  return createPortal(
    mobile ? (
      <div
        className="gs-appearance-backdrop"
        style={{ top: viewport.offset, height: viewport.height }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.requestClose();
        }}
      >
        <Dialog
          ref={dialogRef}
          className="gs-appearance-sheet"
          aria-label="Appearance inspector"
          onClose={onClose}
          data-appearance-surface
          onKeyDownCapture={keys}
        >
          <div className="gs-sheet-grip" aria-hidden="true" />
          {content}
        </Dialog>
      </div>
    ) : (
      <section
        ref={surface}
        className="gs-appearance-dock"
        role="complementary"
        aria-label="Appearance inspector"
        data-appearance-surface
        onKeyDownCapture={keys}
      >
        {content}
      </section>
    ),
    root,
  );
}
