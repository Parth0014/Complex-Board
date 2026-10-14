import type { GratitudeAsset } from '../../assets/contracts';
import { loadMedia } from '../../vision/media';

export function previewAssetUrl(
  asset: GratitudeAsset | undefined,
  uploads: Record<string, string>,
) {
  if (!asset) return undefined;
  if (asset.provider === 'upload') return uploads[asset.mediaId || asset.id];
  const url = asset.previewUrl || asset.assetUrl;
  return /^(?:data:image\/|https?:\/\/)/i.test(url) ? url : undefined;
}

/** Resolve persisted photo references without changing boards or retaining Blob URLs. */
export function loadPreviewMedia(
  win: Window & typeof globalThis,
  assets: Array<GratitudeAsset | undefined>,
  ready: (urls: Record<string, string>) => void,
) {
  let active = true;
  const urls: Record<string, string> = {};
  const ids = [
    ...new Set(
      assets
        .filter((asset) => asset?.provider === 'upload')
        .map((asset) => asset!.mediaId || asset!.id),
    ),
  ];
  void Promise.allSettled(
    ids.map(async (id) => {
      const record = await loadMedia(win, id);
      if (active) urls[id] = win.URL.createObjectURL(record.working);
    }),
  ).then(() => {
    if (active) ready(urls);
  });
  return () => {
    active = false;
    Object.values(urls).forEach((url) => win.URL.revokeObjectURL(url));
  };
}
