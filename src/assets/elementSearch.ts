import type { GratitudeAsset } from './contracts';
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
export function matchesElementSearch(asset: GratitudeAsset, query: string): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const content = normalize([asset.title, ...asset.tags, ...(asset.topics || [])].join(' '));
  return words.every((word) => content.includes(word));
}
