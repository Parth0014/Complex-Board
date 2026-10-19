import { studyPhotosForTemplate } from './templateStudyPhotos';
import { SCRAPBOOK_PRESETS } from './scrapbookPresets';
import sources from './templatePinterestPhotos.json';
import type { GratitudeAsset } from '../assets/contracts';

const bundled = import.meta.glob<string>('../../public/template-pinterest/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const PINTEREST_TEMPLATE_PHOTOS: Record<string, GratitudeAsset> = Object.fromEntries(
  sources.map((photo) => [
    photo.name,
    {
      id: `template-pinterest:${photo.pin}`,
      provider: 'template-photo',
      type: 'photo',
      title: `${photo.name[0].toUpperCase()}${photo.name.slice(1)} inspiration`,
      tags: [photo.name],
      previewUrl: bundled[`../../public/template-pinterest/${photo.name}.jpg`],
      assetUrl: bundled[`../../public/template-pinterest/${photo.name}.jpg`],
      width: photo.width,
      height: photo.height,
      license: {
        tier: 'E',
        id: 'pinterest-source',
        label: 'Pinterest source; original creator rights apply',
        attributionRequired: true,
        sourceUrl: photo.sourceUrl,
      },
      editable: { crop: true, filters: true },
    } satisfies GratitudeAsset,
  ]),
);

export function photosForScrapbookTemplate(id: string): GratitudeAsset[] {
  const preset = SCRAPBOOK_PRESETS.find((p) => p.id === id);
  return preset ? studyPhotosForTemplate(id, preset.slots) : [];
}
