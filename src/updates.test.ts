import { afterEach, expect, it, vi } from 'vitest';
import { updateUrl, watchForUpdates } from './updates';

afterEach(() => vi.useRealTimers());
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
function setup(fetch: ReturnType<typeof vi.fn>) {
  const win = Object.assign(new EventTarget(), {
    document: Object.assign(new EventTarget(), { visibilityState: 'visible' }),
    fetch,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
  }) as unknown as Window;
  return win;
}
it('bypasses cache, ignores the current build and detects a deployment on focus', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ buildId: 'current' }))
    .mockResolvedValueOnce(Response.json({ buildId: 'new-build' }));
  const win = setup(fetch),
    updated = vi.fn(),
    stop = watchForUpdates(win, 'current', updated);
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await settle();
  expect(fetch.mock.calls[0][1].cache).toBe('no-store');
  expect(updated).not.toHaveBeenCalled();
  win.dispatchEvent(new Event('focus'));
  await vi.waitFor(() => expect(updated).toHaveBeenCalledWith('new-build'));
  stop();
  win.dispatchEvent(new Event('focus'));
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('recovers from offline requests and ignores malformed manifests', async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(Response.json(null))
    .mockResolvedValueOnce(Response.json({ buildId: 'new-build' }));
  const win = setup(fetch),
    updated = vi.fn(),
    stop = watchForUpdates(win, 'current', updated);
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await settle();
  win.dispatchEvent(new Event('focus'));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  await settle();
  expect(updated).not.toHaveBeenCalled();
  win.dispatchEvent(new Event('focus'));
  await vi.waitFor(() => expect(updated).toHaveBeenCalledWith('new-build'));
  stop();
});
it('refreshes the app with a new URL while retaining the board and hash', () => {
  const url = new URL(
    updateUrl('https://example.com/?board=board%3A123&app-version=old#canvas', 'new-build'),
  );
  expect(url.searchParams.get('board')).toBe('board:123');
  expect(url.searchParams.getAll('app-version')).toEqual(['new-build']);
  expect(url.hash).toBe('#canvas');
});
