import { useEffect } from 'react';
import { Button } from './Button';
import { AlertIcon, InfoIcon } from '../icons';

export function Toast({
  message,
  onDismiss,
  error = false,
}: {
  message: string;
  onDismiss(): void;
  error?: boolean;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, error ? 8000 : 4000);
    return () => clearTimeout(timer);
  }, [message, error, onDismiss]);
  return (
    <div className={`gs-toast${error ? ' gs-toast--error' : ''}`} role={error ? 'alert' : 'status'}>
      {error ? <AlertIcon /> : <InfoIcon />}
      <span>{message}</span>
      <Button variant="secondary" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}
