import { beforeEach, expect, it, vi } from 'vitest';
import { loadMedia } from '../../vision/media';
import { loadPreviewMedia, previewAssetUrl } from './previewMedia';
import type { GratitudeAsset } from '../../assets/contracts';
vi.mock('../../vision/media', () => ({ loadMedia: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
const asset = {
  id: 'upload:photo',
  mediaId: 'upload:photo',
  provider: 'upload',
  previewUrl: 'media:upload:photo',
} as GratitudeAsset;
const setup = () =>
  ({
    URL: { createObjectURL: vi.fn(() => 'blob:resolved-photo'), revokeObjectURL: vi.fn() },
  }) as unknown as Window & typeof globalThis;
it('resolves upload references once and revokes their URLs on cleanup', async () => {
  vi.mocked(loadMedia).mockResolvedValue({ working: new Blob(['photo']) } as Awaited<
    ReturnType<typeof loadMedia>
  >);
  const win = setup(),
    ready = vi.fn(),
    stop = loadPreviewMedia(win, [asset, asset, undefined], ready);
  await vi.waitFor(() =>
    expect(ready).toHaveBeenCalledWith({ 'upload:photo': 'blob:resolved-photo' }),
  );
  expect(loadMedia).toHaveBeenCalledTimes(1);
  expect(previewAssetUrl(asset, ready.mock.calls[0][0])).toBe('blob:resolved-photo');
  stop();
  expect(win.URL.revokeObjectURL).toHaveBeenCalledWith('blob:resolved-photo');
});
it('does not create URLs or update an unmounted preview when media loads late', async () => {
  let resolve!: (record: Awaited<ReturnType<typeof loadMedia>>) => void;
  vi.mocked(loadMedia).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const win = setup(),
    ready = vi.fn(),
    stop = loadPreviewMedia(win, [asset], ready);
  stop();
  resolve({ working: new Blob(['photo']) } as Awaited<ReturnType<typeof loadMedia>>);
  await new Promise((done) => setTimeout(done, 0));
  expect(win.URL.createObjectURL).not.toHaveBeenCalled();
  expect(ready).not.toHaveBeenCalled();
});
it('missing media does not prevent other preview content from rendering', async () => {
  vi.mocked(loadMedia).mockRejectedValue(new Error('missing'));
  const ready = vi.fn(),
    stop = loadPreviewMedia(setup(), [asset], ready);
  await vi.waitFor(() => expect(ready).toHaveBeenCalledWith({}));
  stop();
});
it('shows remote and embedded artwork without treating media references as browser URLs', () => {
  expect(
    previewAssetUrl(
      { ...asset, provider: 'unsplash', previewUrl: 'https://images.unsplash.com/photo' },
      {},
    ),
  ).toBe('https://images.unsplash.com/photo');
  expect(
    previewAssetUrl(
      { ...asset, provider: 'generated', previewUrl: 'data:image/png;base64,abc' },
      {},
    ),
  ).toBe('data:image/png;base64,abc');
  expect(previewAssetUrl(asset, {})).toBeUndefined();
});
