import { describe, expect, it } from 'vitest';
import { COLLAGE_LAYOUTS, collageLayoutsForBoard } from './collagePresets';
import { collageFrames, pointInPolygon } from './canvas/collageGeometry';
import { designedCollageItems } from './designedCollages';
import { SCRAPBOOK_PHOTO_PLACEHOLDER } from './scrapbookPresets';
import { validateBoard } from './storage';
import { newBoard } from './document';
import { KonvaCanvasAdapter } from './canvas/KonvaCanvasAdapter';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { create, build, area } from './structuredDividers';
import { interlockingDesigns } from './interlockingGeometry';

const assets = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    ...SCRAPBOOK_PHOTO_PLACEHOLDER,
    id: `selected-${i}`,
    width: 300 + i * 53,
    height: 700 - i * 32,
  }));

describe('approved interlocking collage integration', () => {
  it.each(interlockingDesigns)(
    '$name matches the HTML geometry and partitions every board without covered photos or holes',
    (design) => {
      const context = {} as {
        InterlockingLayouts: {
          designs: Array<{ id: string }>;
          frames: (
            design: { id: string },
            count: number,
            ratio: number,
          ) => Array<{ points: number[][] }>;
        };
      };
      runInNewContext(
        readFileSync(
          new URL('../../design/collage-studies/interlocking/layouts.js', import.meta.url),
          'utf8',
        ),
        context,
      );
      const html = context.InterlockingLayouts;
      expect(COLLAGE_LAYOUTS.map((d) => d.id)).toEqual(
        html.designs.map((d) => `interlocking:${d.id}`),
      );
      for (let count = 5; count <= 10; count++)
        for (const ratio of [9 / 16, 4 / 5, 1, 4 / 3, 16 / 9]) {
          const expected = html.frames(
            html.designs.find((d) => d.id === design.id)!,
            count,
            ratio,
          );
          const model = create(design, count, ratio);
          const polygons = build(model, model.initialParams).polygons.map((points) => ({
            points,
            area: area(points),
          }));
          // Original studies remain the contour source; V3 owns the final partition.
          expect(expected).toHaveLength(count);
          expect(polygons.reduce((sum, p) => sum + p.area, 0)).toBeCloseTo(1, 5);
          expect(Math.min(...polygons.map((p) => p.area))).toBeGreaterThan(0.035);
          const native = collageFrames(`interlocking:${design.id}`, count, 900, 900 / ratio);
          native.forEach((frame, i) => {
            const restored = frame.clip.map((v, j) =>
              j % 2 ? frame.y + (v * frame.h) / 100 : frame.x + (v * frame.w) / 100,
            );
            const target = polygons[i].points.flat();
            expect(restored.length).toBe(target.length);
            expect(Math.max(...restored.map((v, j) => Math.abs(v - target[j])))).toBeLessThan(
              1e-12,
            );
          });
          // Sample cell interiors across the board, beyond just checking summed areas.
          const clips = polygons.map((p) => p.points.flat());
          for (let x = 0; x < 11; x++)
            for (let y = 0; y < 13; y++)
              expect(
                clips.filter((p) => pointInPolygon(p, (x + 0.371) / 11, (y + 0.619) / 13)),
              ).toHaveLength(1);
        }
    },
    30000,
  );
  it('exposes only the 18 approved designs, with adaptive resolution metadata', () => {
    expect(COLLAGE_LAYOUTS).toHaveLength(18);
    expect(new Set(COLLAGE_LAYOUTS.map((p) => p.id)).size).toBe(18);
    expect(COLLAGE_LAYOUTS.every((p) => p.minPhotos === 5 && p.maxPhotos === 10)).toBe(true);
    for (const [width, height] of [
      [1080, 1920],
      [1200, 1200],
      [2400, 900],
      [900, 1200],
    ])
      expect(
        collageLayoutsForBoard(width, height).every(
          (p) => p.resolution.width === width && p.resolution.height === height,
        ),
      ).toBe(true);
  });

  for (const preset of COLLAGE_LAYOUTS)
    it(`${preset.label} preserves every selected photo for all supported counts and orientations`, () => {
      for (const [width, height] of [
        [1080, 1920],
        [1080, 1080],
        [1920, 1080],
        [1200, 1500],
      ])
        for (let count = 5; count <= 10; count++) {
          let serial = 0;
          const photos = assets(count),
            frames = collageFrames(preset.id, count, width, height);
          const items = designedCollageItems(
            preset.id,
            photos,
            width,
            height,
            () => `item-${serial++}`,
          );
          expect(items).toHaveLength(count);
          expect(new Set(items.map((i) => i.asset?.id))).toEqual(new Set(photos.map((p) => p.id)));
          items.forEach((item, i) => {
            expect(item.asset).toBe(photos[frames[i].photo]);
            expect(item.templatePlaceholder).toBe(false);
            expect(item.scrapbookPhoto!.clip!.length).toBeGreaterThanOrEqual(6);
            expect(item.scrapbookPhoto!.clip!.every(Number.isFinite)).toBe(true);
            expect(item.width).toBeGreaterThan(0);
            expect(item.height).toBeGreaterThan(0);
            expect(item.width / item.scrapbookPhoto!.width).toBeCloseTo(
              item.height / item.scrapbookPhoto!.height,
            );
            // Rotating the native top-left must preserve SVG's original center.
            const a = (item.rotation * Math.PI) / 180;
            expect(
              item.x + (item.width / 2) * Math.cos(a) - (item.height / 2) * Math.sin(a),
            ).toBeCloseTo((frames[i].x + frames[i].w / 2) * width);
            expect(
              item.y + (item.width / 2) * Math.sin(a) + (item.height / 2) * Math.cos(a),
            ).toBeCloseTo((frames[i].y + frames[i].h / 2) * height);
          });
          expect(
            validateBoard(JSON.parse(JSON.stringify({ ...newBoard(), width, height, items })))
              .items,
          ).toEqual(items);
        }
    }, 20000);

  it('stores real shaped masks rather than square image boundaries', () => {
    const circle = designedCollageItems('interlocking:moon', assets(5), 1080, 1920, () => 'id').at(
      0,
    )!;
    const clip = circle.scrapbookPhoto!.clip!;
    expect(pointInPolygon(clip, 50, 50)).toBe(true);
    expect(pointInPolygon(clip, 1, 1)).toBe(false);
    const heart = designedCollageItems('interlocking:heart', assets(5), 1080, 1920, () => 'id').at(
      0,
    )!;
    expect(pointInPolygon(heart.scrapbookPhoto!.clip!, 50, 5)).toBe(false);
    expect(pointInPolygon(heart.scrapbookPhoto!.clip!, 50, 50)).toBe(true);
  });

  it('rejects unsupported counts and duplicate photos before media access', async () => {
    const adapter = new KonvaCanvasAdapter({
      crypto: { randomUUID: () => 'test' },
    } as unknown as Window & typeof globalThis);
    for (const count of [0, 1, 4, 11, 20]) {
      expect(() =>
        designedCollageItems('interlocking:moon', assets(count), 1080, 1920, () => 'id'),
      ).toThrow('5 to 10');
      const ids = assets(count).map((p) => p.id);
      await expect(adapter.previewPhotoArrangement(ids, 'interlocking:moon')).rejects.toThrow(
        '5 to 10',
      );
      await expect(adapter.arrangePhotos(ids, 'interlocking:moon')).rejects.toThrow('5 to 10');
    }
    expect(() =>
      designedCollageItems(
        'interlocking:moon',
        Array(5).fill(assets(1)[0]),
        1080,
        1920,
        () => 'id',
      ),
    ).toThrow('different photos');
    await expect(
      adapter.previewPhotoArrangement(Array(5).fill('same'), 'interlocking:moon'),
    ).rejects.toThrow('different photos');
  });
});
