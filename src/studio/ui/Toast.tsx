import { readDuration } from './motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { AlertIcon, InfoIcon } from '../icons';

const INFO_MS = 4000;

export function Toast({
  message,
  onDismiss,
  error = false,
  warning = false,
  action,
  duration = INFO_MS,
}: {
  message: string;
  onDismiss(): void;
  error?: boolean;
  warning?: boolean;
  action?: { label: string; onClick(): void };
  duration?: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const exitTimer = useRef<number | null>(null);
  const [exiting, setExiting] = useState(false);
  const remaining = useRef(duration);
  const deadline = useRef(0);
  const timer = useRef(0);

  const dismiss = useCallback(() => {
    const node = root.current;
    const ownerWindow = node?.ownerDocument.defaultView;
    if (!node || !ownerWindow || exitTimer.current !== null) return;
    setExiting(true);
    exitTimer.current = ownerWindow.setTimeout(onDismiss, readDuration(node));
  }, [onDismiss]);

  const start = useCallback(() => {
    const ownerWindow = root.current?.ownerDocument.defaultView;
    if (!ownerWindow || error || exitTimer.current !== null) return;
    ownerWindow.clearTimeout(timer.current);
    deadline.current = Date.now() + remaining.current;
    timer.current = ownerWindow.setTimeout(dismiss, remaining.current);
  }, [dismiss, error]);

  const pause = useCallback(() => {
    root.current?.ownerDocument.defaultView?.clearTimeout(timer.current);
    remaining.current = Math.max(0, deadline.current - Date.now());
  }, []);

  // Reset the clock when the message changes (a new toast replaces the old).
  useEffect(() => {
    const ownerWindow = root.current?.ownerDocument.defaultView;
    remaining.current = duration;
    setExiting(false);
    start();
    return () => {
      ownerWindow?.clearTimeout(timer.current);
      if (exitTimer.current !== null) ownerWindow?.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    };
  }, [message, error, start, duration]);

  // Pause while the tab is hidden.
  useEffect(() => {
    const ownerDocument = root.current?.ownerDocument;
    if (!ownerDocument) return;
    const onVis = () => {
      if (ownerDocument.hidden) pause();
      else start();
    };
    ownerDocument.addEventListener('visibilitychange', onVis);
    return () => ownerDocument.removeEventListener('visibilitychange', onVis);
  }, [pause, start]);

  const Icon = error || warning ? AlertIcon : InfoIcon;
  return (
    <div
      ref={root}
      className={`gs-toast${error ? ' gs-toast--error' : ''}${warning ? ' gs-toast--warning' : ''}${exiting ? ' is-exiting' : ''}`}
      role={error || warning ? 'alert' : 'status'}
      onPointerEnter={pause}
      onPointerLeave={start}
      onFocus={pause}
      onBlur={start}
    >
      <Icon />
      <span>{message}</span>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      <Button variant="secondary" onClick={dismiss}>
        Dismiss
      </Button>
    </div>
  );
}
