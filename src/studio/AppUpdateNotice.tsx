import { useEffect, useState } from 'react';
import { BUILD_ID, updateUrl, watchForUpdates } from '../updates';
import { Button } from './ui/Button';

export function AppUpdateNotice({ save }: { save: () => Promise<void> }) {
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (import.meta.env.DEV) return;
    return watchForUpdates(window, BUILD_ID, setVersion);
  }, []);
  if (!version) return null;
  return (
    <div className="app-update-notice" role="status">
      <span>{error || 'A new version of VisBo is ready.'}</span>
      <Button
        variant="primary"
        loading={busy}
        onClick={() => {
          setBusy(true);
          setError('');
          void save()
            .then(() => window.location.replace(updateUrl(window.location.href, version)))
            .catch(() => {
              setError('Your board could not be saved. Try again before refreshing.');
              setBusy(false);
            });
        }}
      >
        Save &amp; refresh
      </Button>
    </div>
  );
}
