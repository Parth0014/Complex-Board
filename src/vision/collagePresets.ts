import { interlockingDesigns } from './interlockingGeometry';

/** Public Arrange catalog. Does not load the canvas renderer. */
export const COLLAGE_MIN_PHOTOS = 5;
export const COLLAGE_MAX_PHOTOS = 10;
export const COLLAGE_LAYOUT_VERSION = 'interlocking-adjust-v3';
export const COLLAGE_LAYOUTS = interlockingDesigns.map((design) => ({
  id: `interlocking:${design.id}`,
  label: design.name,
  family: design.family,
  description: design.note,
  minPhotos: COLLAGE_MIN_PHOTOS,
  maxPhotos: COLLAGE_MAX_PHOTOS,
  resolution: { mode: 'adaptive' },
}));
export const isDesignedCollage = (id: string) => COLLAGE_LAYOUTS.some((d) => d.id === id);
export function collageLayoutsForBoard(width: number, height: number) {
  return width > 0 && height > 0 && Number.isFinite(width + height)
    ? COLLAGE_LAYOUTS.map((d) => ({ ...d, resolution: { ...d.resolution, width, height } }))
    : [];
}
