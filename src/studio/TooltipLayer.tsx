import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function TooltipLayer({ ownerWindow }: { ownerWindow: Window }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useEffect(() => {
    const document = ownerWindow.document;
    let timer = 0;
    const hide = () => {
      ownerWindow.clearTimeout(timer);
      setTarget(null);
    };
    const show = (event: Event) => {
      const node =
        (event.target as Element | null)?.nodeType === 1
          ? (event.target as Element).closest<HTMLElement>('.vs [data-tip]')
          : null;
      if (
        !node ||
        node.matches(':disabled') ||
        node.closest('details[open]')?.querySelector('summary') === node
      )
        return;
      ownerWindow.clearTimeout(timer);
      timer = ownerWindow.setTimeout(() => setTarget(node), event.type === 'focusin' ? 0 : 300);
    };
    document.addEventListener('pointerover', show);
    document.addEventListener('focusin', show);
    document.addEventListener('pointerout', hide);
    document.addEventListener('focusout', hide);
    document.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', hide);
    ownerWindow.addEventListener('resize', hide);
    return () => {
      hide();
      document.removeEventListener('pointerover', show);
      document.removeEventListener('focusin', show);
      document.removeEventListener('pointerout', hide);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('scroll', hide, true);
      document.removeEventListener('keydown', hide);
      ownerWindow.removeEventListener('resize', hide);
    };
  }, [ownerWindow]);
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
        <div ref={tip} className="vs-tooltip" role="tooltip" style={position}>
          {target.dataset.tip}
        </div>,
        ownerWindow.document.body,
      )
    : null;
}
