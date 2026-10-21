import { matchesElementSearch } from './elementSearch';
import { describeElement, ELEMENT_THEMES } from './elementThemes';
import type { AssetProvider, GratitudeAsset } from './contracts';
import { studioCutouts, retiredStudioCutouts, approvedCutoutIds } from './studioCutouts';
export const bundledSvgSources = import.meta.glob<string>(
  '../../public/vision-board-assets/svg/**/*.svg',
  { eager: true, query: '?raw', import: 'default' },
);
const bundledFonts = import.meta.glob<string>('../../public/vision-board-assets/fonts/*.woff2', {
  eager: true,
  query: '?inline',
  import: 'default',
});
function withEmbeddedFonts(svg: string) {
  const rules = Object.entries(bundledFonts).flatMap(([path, url]) => {
    const match = path.match(/(fraunces|caveat-brush|dm-sans)-latin-(\d+)-(normal|italic)/);
    if (!match) return [];
    const family = { fraunces: 'Fraunces', 'caveat-brush': 'Caveat Brush', 'dm-sans': 'DM Sans' }[
      match[1]
    ];
    if (!family || !svg.includes(family)) return [];
    return [
      `@font-face{font-family:'${family}';font-weight:${match[2]};font-style:${match[3]};src:url('${url}') format('woff2')}`,
    ];
  });
  return svg.replace(/(<svg[^>]*>)/, '$1<style>' + rules.join('') + '</style>');
}
export const curatedAssets: GratitudeAsset[] = Object.entries(bundledSvgSources).map(
  ([path, svg]) => {
    const parts = path.split('/'),
      category = parts.at(-2)!,
      name = parts.at(-1)!.replace(/\.svg$/, '');
    const { title, topics } = describeElement(category, name, svg);
    const dimensions = svg
      .match(/viewBox="([^"]+)"/)![1]
      .split(/\s+/)
      .map(Number);
    // Catalog/search needs metadata only. Embedding fonts and encoding all 330
    // SVGs at module startup creates a large main-thread and memory spike even
    // when the library is closed. Share each URL once it is actually requested.
    let url: string | undefined;
    const source = () =>
      (url ??= 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(withEmbeddedFonts(svg)));
    return {
      id: 'vision-svg:' + category + '/' + name,
      provider: 'curated-v1',
      type: 'decoration',
      category: topics[0],
      topics,
      title,
      tags: [
        ...topics,
        ...ELEMENT_THEMES.filter((theme) => topics.includes(theme.id)).map((theme) => theme.label),
      ],
      get previewUrl() {
        return source();
      },
      get assetUrl() {
        return source();
      },
      mimeType: 'image/svg+xml',
      width: dimensions[2],
      height: dimensions[3],
      editable: { colors: false, stroke: false, crop: false, filters: false },
      license: {
        tier: 'A',
        id: 'user-supplied',
        label: 'User-supplied asset pack',
        attributionRequired: false,
      },
    };
  },
);
export const curatedPackProvider: AssetProvider = {
  id: 'curated-v1',
  capabilities: { search: true, categories: true, pagination: true },
  async search(query) {
    const matches = [
      ...curatedAssets,
      ...studioCutouts.filter((asset) => approvedCutoutIds.includes(asset.id)),
    ].filter(
      (asset) =>
        (!query.type || asset.type === query.type) &&
        (!query.search || matchesElementSearch(asset, query.search)),
    );
    const start = Number(query.cursor || 0),
      end = start + (query.limit || matches.length);
    return {
      items: matches.slice(start, end),
      nextCursor: end < matches.length ? String(end) : undefined,
    };
  },
  async resolve(id) {
    const asset = [...curatedAssets, ...studioCutouts, ...retiredStudioCutouts].find(
      (asset) => asset.id === id,
    );
    if (!asset) throw new Error('Unknown vector asset: ' + id);
    return asset;
  },
  async fetchAsset(asset, ownerWindow) {
    const canonical = await this.resolve(asset.id, ownerWindow);
    if (canonical.mimeType !== 'image/svg+xml') {
      const response = await ownerWindow.fetch(canonical.assetUrl);
      if (!response.ok) throw new Error('Unable to load cutout.');
      return response.blob();
    }
    return new Blob([decodeURIComponent(canonical.assetUrl.split(',').slice(1).join(','))], {
      type: 'image/svg+xml',
    });
  },
};
