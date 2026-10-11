import { useCallback, useEffect, useState } from 'react';
import { requestAI } from '../vision/aiClient';
export type AIStatus = {
  configured: boolean;
  videoConfigured: boolean;
  backgroundConfigured: boolean;
  upscaleConfigured: boolean;
};

/** Module-level shared cache so multiple components don't re-fetch. */
const statusCache = new WeakMap<
  Window,
  { promise: Promise<AIStatus | null>; value: AIStatus | null }
>();

function fetchStatus(
  ownerWindow: Window & typeof globalThis,
  signal?: AbortSignal,
): Promise<AIStatus | null> {
  const cached = statusCache.get(ownerWindow);
  if (cached) return cached.promise;
  const promise = requestAI(ownerWindow, '/api/ai/status', { signal })
    .then((value): AIStatus => {
      const status: AIStatus = {
        configured: value.configured === true,
        videoConfigured: value.videoConfigured === true,
        backgroundConfigured:
          value.backgroundConfigured === true && value.backgroundAvailable !== false,
        upscaleConfigured: value.upscaleConfigured === true,
      };
      const entry = statusCache.get(ownerWindow);
      if (entry) entry.value = status;
      return status;
    })
    .catch(() => {
      statusCache.delete(ownerWindow);
      return null;
    });
  statusCache.set(ownerWindow, { promise, value: null });
  return promise;
}

export function useAIStatus(ownerWindow: Window & typeof globalThis) {
  const [status, setStatus] = useState<AIStatus | null>(
    () => statusCache.get(ownerWindow)?.value ?? null,
  );
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setChecking(true);
      setError('');
      statusCache.delete(ownerWindow);
      try {
        const value = await fetchStatus(ownerWindow, signal);
        if (!signal?.aborted) setStatus(value);
      } catch (err) {
        if (!signal?.aborted) {
          setStatus(null);
          setError(err instanceof Error ? err.message : 'Could not check AI availability.');
        }
      } finally {
        if (!signal?.aborted) setChecking(false);
      }
    },
    [ownerWindow],
  );
  useEffect(() => {
    const controller = new ownerWindow.AbortController();
    void fetchStatus(ownerWindow, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setStatus(value);
          setChecking(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Could not check AI availability.');
          setChecking(false);
        }
      });
    return () => controller.abort();
  }, [ownerWindow]);
  return { status, error, checking, refresh };
}
