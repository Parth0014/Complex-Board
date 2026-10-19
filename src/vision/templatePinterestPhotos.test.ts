import { describe, expect, it } from 'vitest';
import sources from '../../design/collage-studies/photos/sources.json';
import { photosForScrapbookTemplate } from './templatePinterestPhotos';
import { SCRAPBOOK_PRESETS } from './scrapbookPresets';

describe('Finished template photo sets', () => {
  it('fills every frame using only the ten user-provided photos', () => {
    const all = SCRAPBOOK_PRESETS.flatMap((preset) => {
      const photos = photosForScrapbookTemplate(preset.id);
      expect(photos).toHaveLength(preset.slots);
      for (const photo of photos) {
        expect(photo.assetUrl).toBeTruthy();
        expect(photo.width).toBeGreaterThan(0);
        expect(photo.height).toBeGreaterThan(0);
      }
      return photos;
    });
    expect(all).toHaveLength(36);
    expect(new Set(all.map((photo) => photo.id)).size).toBe(10);
    expect(new Set(all.map((photo) => photo.assetUrl)).size).toBe(10);
    expect(new Set(sources.map((photo) => photo.sha256)).size).toBe(10);
  });
});
