import { useCallback, useEffect, useState } from 'react';
import { requestAI } from '../vision/aiClient';
export type AIStatus = {
  configured: boolean;
  videoConfigured: boolean;
  backgroundConfigured: boolean;
  upscaleConfigured: boolean;
};
export function useAIStatus(ownerWindow: Window & typeof globalThis) {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setChecking(true);
      setError('');
      try {
        const value = await requestAI(ownerWindow, '/api/ai/status', { signal });
        if (!signal?.aborted)
          setStatus({
            configured: value.configured === true,
            videoConfigured: value.videoConfigured === true,
            backgroundConfigured:
              value.backgroundConfigured === true && value.backgroundAvailable !== false,
            upscaleConfigured: value.upscaleConfigured === true,
          });
      } catch (error) {
        if (!signal?.aborted) {
          setStatus(null);
          setError(error instanceof Error ? error.message : 'Could not check AI availability.');
        }
      } finally {
        if (!signal?.aborted) setChecking(false);
      }
    },
    [ownerWindow],
  );
  useEffect(() => {
    const controller = new ownerWindow.AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [ownerWindow, refresh]);
  return { status, error, checking, refresh };
}
