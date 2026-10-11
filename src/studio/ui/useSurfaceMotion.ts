import { useEffect, useRef, useState } from 'react';

/** Overlay lifetime only; document and command state remain owned by callers. */
export function useSurfaceMotion(onClose: () => void) {
  const [closing, setClosing] = useState(false);
  const keyboard = useRef(
    typeof document !== 'undefined' && document.activeElement?.matches(':focus-visible'),
  );
  const callback = useRef(onClose);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    callback.current = onClose;
  }, [onClose]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const dismiss = (immediate = false) => {
    if (timer.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (immediate || keyboard.current || reduced) {
      callback.current();
      return;
    }
    setClosing(true);
    const duration = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--gs-duration-exit'),
    );
    timer.current = setTimeout(() => callback.current(), duration);
  };
  return { dismiss, motion: keyboard.current ? 'keyboard' : closing ? 'exit' : 'enter' };
}
