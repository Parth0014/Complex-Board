import sources from '../../design/collage-studies/photos/sources.json';
import type { GratitudeAsset } from '../assets/contracts';
const bundled = import.meta.glob<string>('../../design/collage-studies/photos/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});
export const TEMPLATE_STUDY_PHOTOS: GratitudeAsset[] = sources.map((photo) => ({
  id: `template-study:${photo.sha256}`,
  provider: 'template-photo',
  type: 'photo',
  title: photo.label,
  tags: ['vision board'],
  previewUrl: bundled[`../../design/collage-studies/photos/${photo.file}`],
  assetUrl: bundled[`../../design/collage-studies/photos/${photo.file}`],
  width: photo.width,
  height: photo.height,
  license: {
    tier: 'E',
    id: 'user-provided',
    label: 'User-provided image',
    attributionRequired: false,
  },
  editable: { crop: true, filters: true },
}));
export function studyPhotosForTemplate(id: string, count: number) {
  const offset =
    ({ 'torn-scrapbook': 0, 'soft-life-collage': 3, 'sticker-chaos': 6 } as Record<string, number>)[
      id
    ] || 0;
  return Array.from(
    { length: count },
    (_, i) => TEMPLATE_STUDY_PHOTOS[(offset + i) % TEMPLATE_STUDY_PHOTOS.length],
  );
}
