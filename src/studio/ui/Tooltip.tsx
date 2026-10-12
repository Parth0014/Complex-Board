import { useId, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function TooltipProvider({ ownerWindow }: { ownerWindow: Window }) {
  const id = useId();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [instant, setInstant] = useState(false);
  const tip = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  /** Warm-up (§4, item 10): a tooltip hidden less than 400ms ago makes the
      next one appear instantly with no animation. */
  const warmUntil = useRef(0);
  useEffect(() => {
    const document = ownerWindow.document;
    let timer = 0;
    const hide = () => {
      ownerWindow.clearTimeout(timer);
      setTarget((was) => {
        if (was) warmUntil.current = Date.now() + 400;
        return null;
      });
    };
    const show = (event: Event) => {
      const node =
        (event.target as Element | null)?.nodeType === 1
          ? (event.target as Element).closest<HTMLElement>('[data-tip]')
          : null;
      if (
        !node ||
        node.matches(':disabled') ||
        node.closest('details[open]')?.querySelector('summary') === node
      )
        return;
      ownerWindow.clearTimeout(timer);
      const warm = Date.now() < warmUntil.current;
      const delay = event.type === 'focusin' || warm ? 0 : 300;
      timer = ownerWindow.setTimeout(() => {
        setTarget(node);
        setInstant(warm);
      }, delay);
    };
    const leave = (event: Event) => {
      const node = (event.target as Element | null)?.closest?.('[data-tip]');
      if (!node?.contains((event as PointerEvent | FocusEvent).relatedTarget as Node | null))
        hide();
    };
    document.addEventListener('pointerover', show);
    document.addEventListener('focusin', show);
    document.addEventListener('pointerout', leave);
    document.addEventListener('focusout', leave);
    document.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', hide);
    document.addEventListener('click', hide);
    ownerWindow.addEventListener('resize', hide);
    return () => {
      hide();
      document.removeEventListener('pointerover', show);
      document.removeEventListener('focusin', show);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('focusout', leave);
      document.removeEventListener('scroll', hide, true);
      document.removeEventListener('keydown', hide);
      document.removeEventListener('click', hide);
      ownerWindow.removeEventListener('resize', hide);
    };
  }, [ownerWindow]);
  useEffect(() => {
    if (!target || target.dataset.tip === target.getAttribute('aria-label')) return;
    const previous = target.getAttribute('aria-describedby');
    target.setAttribute('aria-describedby', [previous, id].filter(Boolean).join(' '));
    return () => {
      if (previous) target.setAttribute('aria-describedby', previous);
      else target.removeAttribute('aria-describedby');
    };
  }, [target, id]);
  useLayoutEffect(() => {
    if (!target || !tip.current) return;
    const anchor = target.getBoundingClientRect();
    const box = tip.current.getBoundingClientRect();
    let left = anchor.left + (anchor.width - box.width) / 2;
    let top = anchor.top - box.height - 9;
    if (target.dataset.tipPos === 'below' || top < 8) top = anchor.bottom + 9;
    if (target.dataset.tipPos === 'right') {
      left = anchor.right + 9;
      top = anchor.top + (anchor.height - box.height) / 2;
    }
    setPosition({
      left: Math.max(8, Math.min(left, ownerWindow.innerWidth - box.width - 8)),
      top: Math.max(8, Math.min(top, ownerWindow.innerHeight - box.height - 8)),
    });
  }, [target, ownerWindow]);
  return target
    ? createPortal(
        <div
          id={id}
          ref={tip}
          className={`vs-tooltip${instant ? ' vs-tooltip--instant' : ''}`}
          role="tooltip"
          style={position}
        >
          {target.dataset.tip}
        </div>,
        ownerWindow.document.body,
      )
    : null;
}
