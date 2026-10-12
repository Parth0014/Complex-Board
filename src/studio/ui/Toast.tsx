import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { AlertIcon, InfoIcon } from '../icons';

const INFO_MS = 4000;
const ERROR_MS = 10000; // errors persist >= 10s (§4, item 11)
/** Exit duration (§4): keep in sync with --gs-duration-exit. */
const EXIT_MS = 140;

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
  const [exiting, setExiting] = useState(false);
  const remaining = useRef(error ? ERROR_MS : INFO_MS);
  const deadline = useRef(0);
  const timer = useRef(0);

  const dismiss = useCallback(() => {
    setExiting((was) => {
      if (!was) window.setTimeout(onDismiss, EXIT_MS);
      return true;
    });
  }, [onDismiss]);

  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    deadline.current = Date.now() + remaining.current;
    timer.current = window.setTimeout(dismiss, remaining.current);
  }, [dismiss]);

  const pause = useCallback(() => {
    window.clearTimeout(timer.current);
    remaining.current = Math.max(0, deadline.current - Date.now());
  }, []);

  // Reset the clock when the message changes (a new toast replaces the old).
  useEffect(() => {
    remaining.current = error ? ERROR_MS : INFO_MS;
    setExiting(false);
    start();
    return () => window.clearTimeout(timer.current);
  }, [message, error, start]);

  // Pause while the tab is hidden.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) pause();
      else start();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pause, start]);

  const Icon = error || warning ? AlertIcon : InfoIcon;
  return (
    <div
      className={`gs-toast${error ? ' gs-toast--error' : ''}${warning ? ' gs-toast--warning' : ''}${exiting ? ' is-exiting' : ''}`}
      role={error || warning ? 'alert' : 'status'}
      onPointerEnter={pause}
      onPointerLeave={start}
      onFocus={pause}
      onBlur={start}
    >
      <Icon />
      <span>{message}</span>
      <Button variant="secondary" onClick={dismiss}>
        Dismiss
      </Button>
    </div>
  );
}
