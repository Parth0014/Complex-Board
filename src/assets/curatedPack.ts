import manifest from '../../public/curated-v1/manifest.json';
import type { AssetProvider, GratitudeAsset } from './contracts';
import { files } from './curatedSources';

let loaded: Promise<GratitudeAsset[]> | undefined;
function getAssets(): Promise<GratitudeAsset[]> {
  if (!loaded)
    loaded = loadAssets().catch((error) => {
      loaded = undefined;
      throw error;
    });
  return loaded;
}
async function loadAssets(): Promise<GratitudeAsset[]> {
  return manifest.assets.map((entry) => {
    const source = files[`../../public/curated-v1/${entry.file}`];
    if (!source) throw new Error(`Missing curated asset: ${entry.file}`);
    const viewBox = source
      .match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      !viewBox ||
      viewBox.length !== 4 ||
      !viewBox.every(Number.isFinite) ||
      viewBox[2] <= 0 ||
      viewBox[3] <= 0
    ) {
      throw new Error(`Invalid curated SVG dimensions: ${entry.file}`);
    }
    // Canvas needs intrinsic SVG dimensions; a viewBox alone can render blank
    // when drawImage crops the artwork under the board's zoom transform.
    const sizedSource = source.replace(/<svg\b([^>]*)>/i, (_, attributes: string) => {
      const withoutSize = attributes.replace(/\s(?:width|height)\s*=\s*["'][^"']*["']/gi, '');
      return `<svg${withoutSize} width="${viewBox[2]}" height="${viewBox[3]}">`;
    });
    const url = `data:image/svg+xml,${encodeURIComponent(sizedSource)}`;
    return {
      ...entry,
      width: viewBox[2],
      height: viewBox[3],
      previewUrl: url,
      assetUrl: url,
    } as GratitudeAsset;
  });
}

export const curatedPackProvider: AssetProvider = {
  id: 'curated-v1',
  capabilities: { search: true, categories: true, pagination: true },
  async search(query) {
    const assets = await getAssets();
    const term = query.search?.trim().toLowerCase() || '';
    const matches = assets.filter(
      (asset) =>
        (!query.type || asset.type === query.type) &&
        (!term || `${asset.title} ${asset.tags.join(' ')}`.toLowerCase().includes(term)) &&
        (!query.license ||
          (query.license === 'credit-required') === asset.license.attributionRequired) &&
        (!query.orientation ||
          (() => {
            const ratio = (asset.width || 1) / (asset.height || 1);
            return (
              query.orientation ===
              (ratio > 1.12 ? 'landscape' : ratio < 0.88 ? 'portrait' : 'square')
            );
          })()),
    );
    const offset = Number(query.cursor || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid curated cursor');
    const limit = Math.max(1, Math.min(250, query.limit || 40));
    return {
      items: matches.slice(offset, offset + limit),
      nextCursor: offset + limit < matches.length ? String(offset + limit) : undefined,
    };
  },
  async resolve(assetId) {
    const assets = await getAssets();
    const asset = assets.find((item) => item.id === assetId);
    if (!asset) throw new Error('Asset is not in the uploaded curated pack');
    return asset;
  },
  async fetchAsset(asset, ownerWindow) {
    const approved = await this.resolve(asset.id, ownerWindow);
    const response = await ownerWindow.fetch(approved.assetUrl);
    if (!response.ok) throw new Error('Curated asset could not be loaded');
    return response.blob();
  },
};
