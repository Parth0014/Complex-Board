import type { GratitudeAsset } from '../assets/contracts';

const bundled = import.meta.glob<string>('../../public/template-stickers/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Resolve only installed artwork, never an arbitrary URL from a saved document. */
export function resolveTemplateSticker(asset: GratitudeAsset): GratitudeAsset {
  const name = asset.id.replace(/^template-sticker:/, '');
  const url = bundled[`../../public/template-stickers/${name}.svg`];
  if (asset.provider !== 'template-sticker' || !/^[a-z0-9-]+$/.test(name) || !url)
    throw new Error(`Unknown template sticker: ${asset.id}`);
  return { ...asset, assetUrl: url, previewUrl: url };
}
