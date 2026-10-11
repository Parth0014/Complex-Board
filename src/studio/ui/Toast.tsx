import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { AlertIcon, InfoIcon } from '../icons';
import { useSurfaceMotion } from './useSurfaceMotion';

export function Toast({
  message,
  onDismiss,
  error = false,
  warning = false,
}: {
  message: string;
  onDismiss(): void;
  error?: boolean;
  warning?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(error ? 10000 : 4000);
  const { dismiss, motion } = useSurfaceMotion(onDismiss);
  const close = useRef(dismiss);
  useEffect(() => {
    close.current = dismiss;
  });
  useEffect(() => {
    const visibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (paused) return;
    const start = performance.now();
    const timer = setTimeout(() => close.current(), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= performance.now() - start;
    };
  }, [paused]);
  return (
    <div
      className={`gs-toast${error ? ' gs-toast--error' : warning ? ' gs-toast--warning' : ''}`}
      role={error ? 'alert' : 'status'}
      data-motion={motion}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={(event) =>
        setPaused(document.hidden || event.currentTarget.contains(document.activeElement))
      }
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(document.hidden);
      }}
    >
      {error ? <AlertIcon /> : <InfoIcon />}
      <span>{message}</span>
      <Button variant="secondary" onClick={(event) => dismiss(event.detail === 0)}>
        Dismiss
      </Button>
    </div>
  );
}
