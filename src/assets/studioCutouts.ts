import type { GratitudeAsset } from './contracts';
import approved from './approvedCutouts.json';

const sources = import.meta.glob<string>('./studio-cutouts/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});
// Reviewed lifestyle PNGs already contain their white paper edge.
const photos = import.meta.glob<string>('./studio-cutouts/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const retired = import.meta.glob<string>('./retired-cutouts/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const photoTitles: Record<string, string> = {
  'lifestyle-01-starbucks-iced-latte': 'Starbucks iced latte',
  'lifestyle-02-starbucks-hot-coffee': 'Starbucks takeaway coffee',
  'lifestyle-03-sage-matcha-bowl': 'Sage matcha bowl',
  'lifestyle-04-starbucks-pink-drink': 'Starbucks Pink Drink',
  'lifestyle-05-bakery-croissant': 'French bakery croissant',
  'lifestyle-06-fujifilm-instax': 'Blush Fujifilm Instax',
  'lifestyle-07-airpods-pro': 'AirPods Pro',
  'lifestyle-08-polaroid-stack': 'Dated Polaroid memories',
  'lifestyle-09-pink-mixtape': 'Pink handwritten mixtape',
  'lifestyle-10-vinyl-sleeve': 'Vintage cream vinyl sleeve',
  'lifestyle-11-emirates-passport': 'Emirates boarding pass and passport',
  'lifestyle-12-rayban-wayfarer': 'Honey Ray-Ban Wayfarers',
  'lifestyle-13-quilted-pouch': 'Blush quilted beauty pouch',
  'lifestyle-14-weekend-duffel': 'Cream and tan weekend duffel',
  'lifestyle-15-riviera-postcard': 'Italian Riviera postcard',
  'lifestyle-16-rhode-lip-treatment': 'Rhode peptide lip treatment',
  'lifestyle-17-pillow-talk-lipstick': 'Charlotte Tilbury Pillow Talk',
  'lifestyle-18-chanel-compact': 'Open Chanel compact',
  'lifestyle-19-ordinary-serum': 'The Ordinary serum',
  'lifestyle-20-amber-claw': 'Marbled amber hair claw',
  'lifestyle-21-striped-tote': 'Cream and navy beach tote',
  'lifestyle-22-sage-journal': 'Gold-lettered sage linen journal',
  'lifestyle-23-annotated-book': 'Annotated pastel-tabbed book',
  'lifestyle-24-cherry-keyring': 'Cherry charm keyring',
  'lifestyle-25-blush-stanley': 'Blush Stanley Quencher',
  'lifestyle-26-diptyque-baies': 'Diptyque Baies candle',
  'digital-matcha': 'Iced matcha ritual',
  'digital-headphones': 'Silver headphones',
  'digital-camera': 'Blush digital camera',
  'digital-tulips': 'Sunday tulip bouquet',
  'digital-passport': 'Passport to somewhere new',
  'digital-perfume': 'Amber perfume bottle',
};
const objectTags: Record<string, string> = {
  'lifestyle-01-starbucks-iced-latte': 'starbucks coffee cafe latte drink iced caramel morning',
  'lifestyle-02-starbucks-hot-coffee': 'starbucks coffee cafe takeaway hot cup morning',
  'lifestyle-03-sage-matcha-bowl': 'matcha green tea bowl whisk ritual wellness',
  'lifestyle-04-starbucks-pink-drink': 'starbucks pink drink strawberry coconut iced cafe',
  'lifestyle-05-bakery-croissant': 'bakery croissant pastry breakfast french cafe',
  'lifestyle-06-fujifilm-instax': 'fujifilm instax camera photography pink memories',
  'lifestyle-07-airpods-pro': 'apple airpods earbuds audio music wireless',
  'lifestyle-08-polaroid-stack': 'polaroid photos memories travel beach paris sunset',
  'lifestyle-09-pink-mixtape': 'mixtape cassette tape music pink retro summer',
  'lifestyle-10-vinyl-sleeve': 'vinyl record music album vintage slow sundays',
  'lifestyle-11-emirates-passport': 'emirates passport boarding pass travel flight paris',
  'lifestyle-12-rayban-wayfarer': 'ray ban sunglasses wayfarer tortoiseshell travel summer',
  'lifestyle-13-quilted-pouch': 'pouch toiletry makeup bag quilted blush beauty',
  'lifestyle-14-weekend-duffel': 'duffel weekend bag travel cream canvas tan leather',
  'lifestyle-15-riviera-postcard': 'postcard italy riviera travel coast beach vintage',
  'lifestyle-16-rhode-lip-treatment': 'rhode lip treatment beauty skincare gloss pink',
  'lifestyle-17-pillow-talk-lipstick': 'charlotte tilbury pillow talk lipstick makeup rose gold',
  'lifestyle-18-chanel-compact': 'chanel compact mirror powder beauty makeup black',
  'lifestyle-19-ordinary-serum': 'ordinary serum dropper skincare beauty amber',
  'lifestyle-20-amber-claw': 'hair claw clip amber tortoiseshell beauty accessories',
  'lifestyle-21-striped-tote': 'striped tote bag beach navy cream summer travel',
  'lifestyle-22-sage-journal': 'journal notebook linen sage gold dreams writing goals',
  'lifestyle-23-annotated-book': 'book reading pastel tabs notes bookmark learning',
  'lifestyle-24-cherry-keyring': 'keys keyring cherry charm burgundy leather home',
  'lifestyle-25-blush-stanley': 'stanley quencher tumbler water bottle pink hydration',
  'lifestyle-26-diptyque-baies': 'diptyque baies candle scent cozy ritual home',
  'digital-matcha': 'latte cafe drink morning wellness self care',
  'digital-headphones': 'music audio focus playlist silver',
  'digital-camera': 'photography memories travel pink vintage',
  'digital-tulips': 'flowers bouquet spring pink yellow nature',
  'digital-passport': 'travel adventure boarding pass ticket holiday',
  'digital-perfume': 'fragrance beauty glass amber gold self care',
};
const makeCutouts = (entries: Record<string, string>): GratitudeAsset[] =>
  Object.entries(entries).map(([path, source]) => {
    const name = path
      .split('/')
      .at(-1)!
      .replace(/\.(svg|png)$/, '');
    const paper = name.startsWith('paper-');
    const raster = path.endsWith('.png');
    const dimensions = raster
      ? [0, 0, 400, 400]
      : source
          .match(/viewBox="([^"]+)"/)![1]
          .split(/\s+/)
          .map(Number);
    const title = raster
      ? photoTitles[name] || name
      : source.match(/<title>([^<]+)<\/title>/)?.[1] || name;
    const url = raster
      ? new URL(source, import.meta.url).href
      : 'data:image/svg+xml,' + encodeURIComponent(source);
    return {
      id: 'studio-cutout:' + name,
      provider: 'curated-v1',
      type: 'decoration',
      category: 'creative',
      topics: ['creative'],
      styles: [paper ? 'paper' : 'digital'],
      title,
      tags: [
        'cutout',
        paper ? 'paper' : 'digital',
        'collage',
        'studio',
        'aesthetic vision board',
        title,
        objectTags[name] || '',
        ...(name.startsWith('paper-piece-')
          ? ['torn ripped scrap note layering background paper piece']
          : []),
        ...(name.startsWith('paper-divider-')
          ? ['divider separator torn edge ripped border paper seam section break']
          : []),
      ],
      previewUrl: url,
      assetUrl: url,
      mimeType: raster ? 'image/png' : 'image/svg+xml',
      width: dimensions[2],
      height: dimensions[3],
      editable: {
        colors: name.startsWith('paper-piece-'),
        stroke: false,
        crop: false,
        filters: false,
      },
      license: {
        tier: 'A',
        id: raster ? 'visbo-generated' : 'visbo-original',
        label: raster ? 'AI-generated VisBo cutout' : 'Original VisBo artwork',
        attributionRequired: false,
      },
    };
  });
export const studioCutouts = makeCutouts({ ...sources, ...photos });
// These first experiments are no longer offered, but saved boards still need their stable IDs.
export const retiredStudioCutouts = makeCutouts(retired);
export const approvedCutoutIds: string[] = approved;
export const isTemplateStudio = () =>
  /^\/template-maker(?:\/(?:index\.html)?)?$/.test(window.location.pathname) ||
  (import.meta.env.DEV && new URL(window.location.href).searchParams.has('templateStudio'));
