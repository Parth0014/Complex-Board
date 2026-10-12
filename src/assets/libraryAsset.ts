import { normalizeGratitudeAsset, type GratitudeAsset } from './contracts';
/** Accept only the image formats and origins used by the server image library. */
export function libraryAsset(input: GratitudeAsset): GratitudeAsset | null {
  const asset = normalizeGratitudeAsset(input);
  if (!asset || asset.type !== 'photo' || !asset.id.startsWith(`${asset.provider}:`)) return null;
  if (asset.provider === 'unsplash') {
    try {
      const url = new URL(asset.assetUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'images.unsplash.com') return null;
    } catch {
      return null;
    }
  } else if (asset.provider === 'pixabay') {
    if (
      !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(asset.assetUrl) ||
      asset.assetUrl.length > 14000000
    )
      return null;
  } else return null;
  return { ...asset, previewUrl: asset.assetUrl };
}
