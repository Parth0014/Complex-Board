import { describe, expect, it } from 'vitest';
import data from './scrapbookPresets.json';
import {
  scrapbookItems,
  fillScrapbookEdges,
  presetsForResolution,
  SCRAPBOOK_PRESETS,
  tornPoints,
  type ScrapbookPresetId,
} from './scrapbookPresets';
import { DocumentHistory } from './document';
import { validateBoard } from './storage';
import type { GratitudeAsset } from '../assets/contracts';
const photo: GratitudeAsset = {
  id: 'photo',
  provider: 'upload',
  type: 'photo',
  title: 'Photo',
  tags: [],
  assetUrl: 'data:image/png;base64,aA==',
  previewUrl: 'data:image/png;base64,aA==',
  license: { tier: 'A', id: 'user', label: 'User', attributionRequired: false },
  editable: { crop: true },
};
const build = (preset: string, count = 1, width = 1000, height = 1500) => {
  let serial = 0;
  return scrapbookItems(
    preset as ScrapbookPresetId,
    Array.from({ length: count }, (_, i) => ({ ...photo, id: `photo-${i}` })),
    () => `item-${serial++}`,
    width,
    height,
  );
};
describe('original HTML scrapbook presets', () => {
  it('keeps the original element recipes and photo capacities', () => {
    expect(data.templates.map((t) => t.it.length)).toEqual([76, 76, 78]);
    expect(SCRAPBOOK_PRESETS.map((p) => p.slots)).toEqual([8, 8, 20]);
    for (const preset of SCRAPBOOK_PRESETS) {
      const items = build(preset.id, 3);
      const slots = items.filter((i) => i.scrapbookPhoto);
      expect(slots).toHaveLength(preset.slots);
      expect(slots.filter((i) => !i.templatePlaceholder)).toHaveLength(3);
      expect(
        new Set(slots.filter((i) => !i.templatePlaceholder).map((i) => i.asset?.id)).size,
      ).toBe(3);
      expect(items.some((i) => i.kind === 'text')).toBe(true);
      expect(items.some((i) => i.vectorPath)).toBe(true);
    }
  });
  it('fills the prominent photo frames first without changing HTML stacking order', () => {
    const slots = build('torn-scrapbook', 8).filter((i) => i.scrapbookPhoto);
    expect(slots.map((i) => i.asset?.id)).toEqual(
      [4, 5, 6, 7, 0, 1, 2, 3].map((i) => `photo-${i}`),
    );
    expect(slots[4].scrapbookPhoto?.style).toBe('pol');
    expect(slots[7].scrapbookPhoto?.style).toBe('round');
  });
  it('converts center-based HTML rotation without moving the element center', () => {
    const items = build('torn-scrapbook');
    const slot = items.filter((i) => i.scrapbookPhoto)[4];
    const r = (slot.rotation * Math.PI) / 180;
    expect(slot.x + (slot.width / 2) * Math.cos(r) - (slot.height / 2) * Math.sin(r)).toBeCloseTo(
      230,
    );
    expect(slot.y + (slot.width / 2) * Math.sin(r) + (slot.height / 2) * Math.cos(r)).toBeCloseTo(
      560,
    );
  });
  it('fits uniformly into landscape boards and preserves save/reopen and one-step undo', () => {
    const history = new DocumentHistory();
    const before = history.document;
    const items = build('sticker-chaos', 2, 1920, 1080);
    expect(items[0].width).toBe(1920);
    expect(items[0].height).toBe(1080);
    history.commit({ ...before, items });
    const reopened = validateBoard(JSON.parse(JSON.stringify(history.document)));
    expect(reopened.items).toEqual(items);
    history.undo();
    expect(history.document).toEqual(before);
    history.redo();
    expect(history.document.items).toEqual(items);
  });
  it('reproduces deterministic torn edges from the source seed', () => {
    expect(tornPoints(0)).toEqual(tornPoints(0));
    expect(tornPoints(0)).not.toEqual(tornPoints(1));
    expect(tornPoints(0)[0]).toBe(0);
    expect(tornPoints(0)[1]).toBeCloseTo(((3 * 16807) / 2147483647) * 1.6);
  });
});

it('fills phone board edges while preserving foreground geometry and proportional photo rendering', () => {
  for (const preset of SCRAPBOOK_PRESETS) {
    const source = build(preset.id, preset.slots);
    const fitted = build(preset.id, preset.slots, 1080, 1920);
    expect(fitted[0]).toMatchObject({ x: 0, y: 0, width: 1080, height: 1920 });
    for (let i = 1; i < fitted.length; i++) {
      const item = fitted[i];
      if (item.scrapbookPhoto) {
        expect(item.width / item.scrapbookPhoto.width).toBeCloseTo(1.08);
        expect(item.height / item.scrapbookPhoto.height).toBeCloseTo(1.08);
      }
      if (item.scrapbookPhoto?.style === 'raw' || item.scrapbookPaper) continue;
      expect(item.x).toBeCloseTo(source[i].x * 1.08);
      expect(item.y).toBeCloseTo(source[i].y * 1.08 + 150);
      expect(item.width).toBeCloseTo(source[i].width * 1.08);
      expect(item.height).toBeCloseTo(source[i].height * 1.08);
    }
    const raw = fitted.filter((item) => item.scrapbookPhoto?.style === 'raw');
    expect(raw.some((item) => item.y === 0)).toBe(true);
    expect(raw.some((item) => Math.abs(item.y + item.height - 1920) < 0.001)).toBe(true);
    expect(fillScrapbookEdges(fitted, 1080, 1920)).toEqual(fitted);
    const legacy = source.map((item) => ({
      ...item,
      x: item.x * 1.08,
      y: item.y * 1.08 + 150,
      width: item.width * 1.08,
      height: item.height * 1.08,
    }));
    const migrated = fillScrapbookEdges(legacy, 1080, 1920);
    expect(migrated[0]).toMatchObject({ x: 0, y: 0, width: 1080, height: 1920 });
    const movedIndex = legacy.findIndex((item) => item.scrapbookPhoto?.style === 'raw');
    legacy[movedIndex] = { ...legacy[movedIndex], rotation: 10 };
    expect(fillScrapbookEdges(legacy, 1080, 1920)[movedIndex]).toEqual(legacy[movedIndex]);
  }
});

it('filters presets by their resolution metadata, including future square and landscape entries', () => {
  const future = [
    ...SCRAPBOOK_PRESETS,
    { id: 'future-square', resolution: { width: 1080, height: 1080 } },
    { id: 'future-landscape', resolution: { width: 1920, height: 1080 } },
  ];
  expect(presetsForResolution(future, { width: 1080, height: 1920 }).map((p) => p.id)).toEqual(
    SCRAPBOOK_PRESETS.map((p) => p.id),
  );
  expect(presetsForResolution(future, { width: 1080, height: 1080 }).map((p) => p.id)).toEqual([
    'future-square',
  ]);
  expect(presetsForResolution(future, { width: 1920, height: 1080 }).map((p) => p.id)).toEqual([
    'future-landscape',
  ]);
  expect(presetsForResolution(future, { width: 1000, height: 1500 })).toEqual([]);
  expect(presetsForResolution(future, { width: 2160, height: 3840 })).toEqual([]);
});
