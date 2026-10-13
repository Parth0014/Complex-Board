declare const __VISBO_BUILD_ID__: string;
export const BUILD_ID = typeof __VISBO_BUILD_ID__ === 'string' ? __VISBO_BUILD_ID__ : 'development';

/** Detect deployments without reloading an in-progress board or caching the manifest. */
export function watchForUpdates(win: Window, current: string, onUpdate: (version: string) => void) {
  let stopped = false,
    checking = false;
  let controller: AbortController | undefined;
  const check = async () => {
    if (stopped || checking || win.document.visibilityState === 'hidden') return;
    checking = true;
    controller = new AbortController();
    const timeout = win.setTimeout(() => controller?.abort(), 10_000);
    try {
      const response = await win.fetch(`/version.json?check=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) return;
      const value = await response.json();
      if (
        !stopped &&
        typeof value.buildId === 'string' &&
        /^[a-zA-Z0-9-]{1,100}$/.test(value.buildId) &&
        value.buildId !== current
      )
        onUpdate(value.buildId);
    } catch {
      // Offline tabs and development servers can retry when they regain focus.
    } finally {
      win.clearTimeout(timeout);
      checking = false;
    }
  };
  const focus = () => {
    void check();
  };
  const interval = win.setInterval(focus, 60_000);
  win.addEventListener('focus', focus);
  win.document.addEventListener('visibilitychange', focus);
  void check();
  return () => {
    stopped = true;
    controller?.abort();
    win.clearInterval(interval);
    win.removeEventListener('focus', focus);
    win.document.removeEventListener('visibilitychange', focus);
  };
}

export function updateUrl(href: string, version: string) {
  const url = new URL(href);
  url.searchParams.set('app-version', version);
  return url.href;
}
