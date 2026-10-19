import { it, expect } from 'vitest';
import { dragCrop, gestureCrop } from './crop';
it('uses local rotated/flipped coordinates and clamps the source viewport', () => {
  const crop = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
    item = { width: 100, height: 100, rotation: 90 };
  expect(dragCrop(crop, item, 0, 20, 1).x).toBeCloseTo(0.15);
  expect(dragCrop(crop, { ...item, flipX: true }, 0, 20, 1).x).toBeCloseTo(0.35);
  expect(dragCrop(crop, item, 0, 2000, 1).x).toBe(0);
  expect(dragCrop(crop, item, 0, 10, 0.5)).toEqual(dragCrop(crop, item, 0, 20, 1));
});

it('anchors pinch zoom to the fingers and pans with the midpoint', () => {
  const base = { x: 0, y: 0, width: 1, height: 1 };
  const from = { x: 0.3, y: 0.4 },
    to = { x: 0.4, y: 0.5 };
  const crop = gestureCrop(base, base, 2, from, to);
  expect(crop.width).toBe(0.5);
  expect(crop.x + to.x * crop.width).toBeCloseTo(from.x);
  expect(crop.y + to.y * crop.height).toBeCloseTo(from.y);
  expect(gestureCrop(base, base, 0.1, from)).toEqual(base);
  expect(gestureCrop(base, base, 100, from).width).toBe(0.2);
});
import { coverCrop, zoomCrop, photoAperture, cropPreviewGeometry } from './crop';
import type { BoardItem } from './document';
it('zooms a fixed frame without distortion, preserves focal point, and clamps all edges', () => {
  const base = coverCrop(2, 1);
  expect(base).toEqual({ x: 0.25, y: 0, width: 0.5, height: 1 });
  const crop = zoomCrop(base, base, 2);
  expect(crop).toEqual({ x: 0.375, y: 0.25, width: 0.25, height: 0.5 });
  expect(zoomCrop(crop, base, 0)).toEqual(base);
  expect(zoomCrop(crop, base, 99).width).toBe(0.1);
  const panned = dragCrop(crop, { width: 100, height: 100, rotation: 0 }, 10000, -10000, 1);
  expect(panned.x).toBe(0);
  expect(panned.y).toBe(0.5);
  expect(zoomCrop(panned, base, 1)).toEqual({ ...base, x: 0 });
});
it('uses the inner polaroid aperture instead of the caption border', () => {
  expect(
    photoAperture({
      width: 200,
      height: 300,
      scrapbookPhoto: { width: 100, height: 150, style: 'pol' },
    } as Parameters<typeof photoAperture>[0]),
  ).toEqual({ width: 144, height: 160 });
});

it('preserves the displayed source scale when opening an existing square crop of a portrait', () => {
  const item = {
    width: 400,
    height: 400,
    crop: { x: 0, y: 0.25, width: 1, height: 0.5 },
  } as BoardItem;
  const preview = cropPreviewGeometry(item, 800, 1600);
  expect(preview).toEqual({ x: 0, y: -200, width: 400, height: 800, aspect: 1 });
  expect(preview.width / preview.height).toBe(800 / 1600);
  expect(preview.y + item.crop!.y * preview.height).toBe(0);
  expect(item.crop!.height * preview.height).toBe(item.height);
});

it('aligns off-center flipped crops without changing the displayed viewport', () => {
  const crop = { x: 0.1, y: 0.2, width: 0.5, height: 0.5 };
  const item = { width: 300, height: 600, crop, flipX: true, flipY: true } as BoardItem;
  const preview = cropPreviewGeometry(item, 600, 1200);
  expect(preview.x + (1 - crop.x - crop.width) * preview.width).toBeCloseTo(0);
  expect(preview.y + (1 - crop.y - crop.height) * preview.height).toBeCloseTo(0);
  expect(preview.width / preview.height).toBe(0.5);
});

it('matches contained photos and legacy content sizes', () => {
  const fit = cropPreviewGeometry(
    { width: 400, height: 400, imageFit: 'fit' } as BoardItem,
    1600,
    800,
  );
  expect(fit).toEqual({ x: 0, y: 100, width: 400, height: 200, aspect: 2 });
  const legacy = cropPreviewGeometry(
    { width: 400, height: 400, contentSize: { width: 200, height: 400 } } as BoardItem,
    800,
    1600,
  );
  expect(legacy).toEqual({ x: 0, y: 0, width: 200, height: 400, aspect: 0.5 });
});
