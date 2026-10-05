export interface GratitudeAsset {
  id: string;
  provider: string;
  externalId?: string;
  mediaId?: string;
  type:
    | 'photo'
    | 'illustration'
    | 'sticker'
    | 'shape'
    | 'pattern'
    | 'texture'
    | 'font'
    | 'symbol'
    | 'decoration'
    | 'frame'
    | 'scrapbook'
    | 'doodle'
    | 'collage'
    | 'typography'
    | 'accent'
    | 'audio';
  category?: string;
  topics?: string[];
  styles?: string[];
  frameSlot?: boolean;
  slotPath?: string;
  title: string;
  tags: string[];
  previewUrl: string;
  assetUrl: string;
  mimeType?: string;
  width?: number;
  height?: number;
  license: {
    tier: 'A' | 'B' | 'C' | 'D' | 'E';
    id: string;
    label: string;
    attributionRequired: boolean;
    shareAlike?: boolean;
    author?: string;
    sourceUrl?: string;
    licenseUrl?: string;
  };
  editable: {
    colors?: boolean;
    stroke?: boolean;
    crop?: boolean;
    filters?: boolean;
  };
  customization?: {
    color?: string;
  };
}

export const GRATITUDE_ASSET_DRAG_TYPE = 'application/x-gratitude-asset';

const ASSET_TYPES = new Set<GratitudeAsset['type']>([
  'photo',
  'illustration',
  'sticker',
  'shape',
  'pattern',
  'texture',
  'font',
  'audio',
  'symbol',
  'decoration',
  'frame',
  'scrapbook',
  'doodle',
  'collage',
  'typography',
  'accent',
]);

const isSafeAssetUrl = (value: string) =>
  /^media:upload:[a-f0-9]{64}$/.test(value) ||
  /^https?:\/\//i.test(value) ||
  /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml)[;,]/i.test(value);

export const normalizeGratitudeAsset = (value: unknown): GratitudeAsset | null => {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as GratitudeAsset).id !== 'string' ||
    typeof (value as GratitudeAsset).title !== 'string' ||
    typeof (value as GratitudeAsset).provider !== 'string' ||
    typeof (value as GratitudeAsset).previewUrl !== 'string' ||
    typeof (value as GratitudeAsset).assetUrl !== 'string' ||
    !Array.isArray((value as GratitudeAsset).tags) ||
    !(value as GratitudeAsset).tags.every((tag) => typeof tag === 'string') ||
    !ASSET_TYPES.has((value as GratitudeAsset).type) ||
    typeof (value as GratitudeAsset).editable !== 'object' ||
    (value as GratitudeAsset).editable === null ||
    typeof (value as GratitudeAsset).license?.id !== 'string' ||
    typeof (value as GratitudeAsset).license?.label !== 'string' ||
    typeof (value as GratitudeAsset).license?.attributionRequired !== 'boolean'
  ) {
    return null;
  }
  const asset = value as GratitudeAsset;
  if (
    ((asset.previewUrl === '' || asset.assetUrl === '') && asset.provider !== 'upload') ||
    (asset.previewUrl !== '' && !isSafeAssetUrl(asset.previewUrl)) ||
    (asset.assetUrl !== '' && !isSafeAssetUrl(asset.assetUrl)) ||
    (asset.width !== undefined && (!Number.isFinite(asset.width) || asset.width <= 0)) ||
    (asset.height !== undefined && (!Number.isFinite(asset.height) || asset.height <= 0)) ||
    (asset.customization?.color !== undefined && !/^#[0-9a-f]{6}$/i.test(asset.customization.color))
  ) {
    return null;
  }
  const tier = asset.license.tier;
  return {
    ...asset,
    license: {
      ...asset.license,
      tier: ['A', 'B', 'C', 'D', 'E'].includes(tier)
        ? tier
        : asset.license.attributionRequired
          ? 'C'
          : 'A',
    },
  };
};

export const isGratitudeAsset = (value: unknown): value is GratitudeAsset =>
  normalizeGratitudeAsset(value) !== null;

export interface AssetQuery {
  search?: string;
  type?: GratitudeAsset['type'];
  orientation?: 'landscape' | 'portrait' | 'square';
  license?: 'no-credit' | 'credit-required';
  cursor?: string;
  limit?: number;
}

export interface AssetPage {
  items: GratitudeAsset[];
  nextCursor?: string;
}

export interface AssetProviderFailure {
  provider: string;
  message: string;
}

export interface AssetSearchResult extends AssetPage {
  failures: AssetProviderFailure[];
}

export interface AssetProvider {
  id: string;
  capabilities: { search: boolean; categories: boolean; pagination: boolean };
  search(query: AssetQuery, ownerWindow: Window & typeof globalThis): Promise<AssetPage>;
  resolve(assetId: string, ownerWindow: Window & typeof globalThis): Promise<GratitudeAsset>;
  fetchAsset(asset: GratitudeAsset, ownerWindow: Window & typeof globalThis): Promise<Blob>;
}
