import {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Dialog } from '../ui/Dialog';
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
}: {
  children: ReactNode;
  title: string;
  onClose(): void;
  trigger: RefObject<HTMLButtonElement | null>;
  ownerWindow: Window;
}) {
  const query = useRef(ownerWindow.matchMedia('(max-width: 700px)')).current;
  const mobile = useSyncExternalStore(
    (notify) => {
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => query.matches,
  );
  const [viewport, setViewport] = useState({ height: ownerWindow.innerHeight, offset: 0 });
  const surface = useRef<HTMLElement>(null);
  const dismiss = useRef(onClose);
  useLayoutEffect(() => {
    dismiss.current = onClose;
  });
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
  useLayoutEffect(() => {
    if (mobile) return;
    const node = surface.current!;
    node.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target as Element).closest('[data-gesture-owner]')) {
        event.preventDefault();
        dismiss.current();
      }
    };
    node.addEventListener('keydown', key);
    const previous = trigger.current;
    return () => {
      node.removeEventListener('keydown', key);
      previous?.isConnected && previous.focus();
    };
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
  const root = ownerWindow.document.querySelector('.vs')!;
  return createPortal(
    mobile ? (
      <div
        className="gs-appearance-backdrop"
        style={{ top: viewport.offset, height: viewport.height }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <Dialog className="gs-appearance-sheet" aria-label="Appearance inspector" onClose={onClose}>
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
      >
        {content}
      </section>
    ),
    root,
  );
}
