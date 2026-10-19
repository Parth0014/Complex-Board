import { describe, expect, it } from 'vitest';
import { COLLAGE_PRESETS, photoCollageItems } from './photoCollages';
import { DocumentHistory } from './document';
import { validateBoard } from './storage';
import type { GratitudeAsset } from '../assets/contracts';
const photos = (count: number): GratitudeAsset[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `photo-${index}`,
    provider: 'upload',
    type: 'photo',
    title: 'Photo',
    tags: [],
    assetUrl: 'data:image/png;base64,aA==',
    previewUrl: 'data:image/png;base64,aA==',
    width: 400,
    height: 600,
    license: { tier: 'A', id: 'user', label: 'User', attributionRequired: false },
    editable: { crop: true },
  }));
describe('fixed Pinterest reference layouts', () => {
  it('includes one entry for each of the 19 screenshot thumbnails', () => {
    expect(COLLAGE_PRESETS).toHaveLength(19);
    expect(new Set(COLLAGE_PRESETS.map((p) => p.id)).size).toBe(19);
  });
  for (const preset of COLLAGE_PRESETS)
    it(`${preset.label} retains its frames with partial and full photo batches`, () => {
      for (const [width, height] of [
        [1080, 1920],
        [1920, 1080],
        [1080, 1080],
      ])
        for (const count of [1, 8, 20]) {
          let serial = 0;
          const items = photoCollageItems(
            preset.id,
            photos(count),
            width,
            height,
            () => `item-${serial++}`,
          );
          const frames = items.filter((i) => i.scrapbookPhoto);
          expect(frames).toHaveLength(preset.slots);
          expect(frames.filter((i) => !i.templatePlaceholder)).toHaveLength(
            Math.min(count, preset.slots),
          );
          expect(frames.filter((i) => !i.templatePlaceholder).map((i) => i.asset?.id)).toEqual(
            photos(Math.min(count, preset.slots)).map((p) => p.id),
          );
          expect(frames.reduce((sum, frame) => sum + frame.width * frame.height, 0)).toBeCloseTo(
            width * height,
          );
          frames.forEach((frame, index) => {
            expect(frame.x).toBeGreaterThanOrEqual(0);
            expect(frame.y).toBeGreaterThanOrEqual(0);
            expect(frame.x + frame.width).toBeLessThanOrEqual(width + 0.001);
            expect(frame.y + frame.height).toBeLessThanOrEqual(height + 0.001);
            expect(frame.rotation).toBe(0);
            for (const other of frames.slice(index + 1)) {
              const overlapWidth = Math.max(
                0,
                Math.min(frame.x + frame.width, other.x + other.width) - Math.max(frame.x, other.x),
              );
              const overlapHeight = Math.max(
                0,
                Math.min(frame.y + frame.height, other.y + other.height) -
                  Math.max(frame.y, other.y),
              );
              expect(overlapWidth * overlapHeight).toBeLessThan(0.001);
            }
            expect(frame.width / frame.scrapbookPhoto!.width).toBeCloseTo(
              frame.height / frame.scrapbookPhoto!.height,
            );
          });
          const history = new DocumentHistory();
          history.commit({ ...history.document, width, height, items });
          expect(validateBoard(JSON.parse(JSON.stringify(history.document))).items).toEqual(items);
          history.undo();
          expect(history.document.items).toHaveLength(0);
          history.redo();
          expect(history.document.items).toEqual(items);
        }
    });
});
