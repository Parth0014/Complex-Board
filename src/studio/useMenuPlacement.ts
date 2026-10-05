import { useEffect } from 'react';

/** Fit custom menus to the viewport without changing their trigger's layout. */
export function useMenuPlacement(ownerWindow: Window & typeof globalThis) {
  useEffect(() => {
    const place = () => {
      ownerWindow.document
        .querySelectorAll<HTMLDetailsElement>('.vs details[open]:not(.vs-drawing-menu)')
        .forEach((details) => {
          const popup = details.querySelector<HTMLElement>(':scope > .vs-menu__pop');
          const trigger = details.querySelector('summary');
          if (!popup || !trigger) return;
          popup.style.transform = 'none';
          const anchor = trigger.getBoundingClientRect();
          const below = ownerWindow.innerHeight - anchor.bottom - 16;
          const above = anchor.top - 16;
          const upward = below < Math.min(popup.scrollHeight, 260) && above > below;
          popup.style.top = upward ? 'auto' : 'calc(100% + 8px)';
          popup.style.bottom = upward ? 'calc(100% + 8px)' : 'auto';
          popup.style.maxHeight = `${Math.max(80, upward ? above : below)}px`;
          const rect = popup.getBoundingClientRect();
          const dx =
            rect.right > ownerWindow.innerWidth - 8
              ? ownerWindow.innerWidth - 8 - rect.right
              : rect.left < 8
                ? 8 - rect.left
                : 0;
          const dy =
            rect.top < 8
              ? 8 - rect.top
              : rect.bottom > ownerWindow.innerHeight - 8
                ? ownerWindow.innerHeight - 8 - rect.bottom
                : 0;
          popup.style.transform = `translate(${dx}px, ${dy}px)`;
        });
    };
    ownerWindow.document.addEventListener('toggle', place, true);
    ownerWindow.addEventListener('resize', place);
    ownerWindow.document.addEventListener('scroll', place, true);
    return () => {
      ownerWindow.document.removeEventListener('toggle', place, true);
      ownerWindow.removeEventListener('resize', place);
      ownerWindow.document.removeEventListener('scroll', place, true);
    };
  }, [ownerWindow]);
}
