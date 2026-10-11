import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/appearance-v2.json';
import multipage from '../../../tests/fixtures/appearance-multipage-v2.json';
import cards from '../../../tests/fixtures/legacy-cards.json';
import { newBoard, DocumentHistory } from '../document';
import type { BoardItem } from './legacy';
import { validateBoard } from './legacyValidation';
import { capabilities } from './capabilities';
import { createAppearance } from './defaults';
import {
  migrateDocument,
  migrateBackup,
  migrateClipboard,
  migrateItem,
  validateCanonicalDocument,
} from './migration';
import { LEGACY_APPEARANCE_FIELDS, type CanonicalDocument, type EditableItem } from './types';
import { color, normalizeAppearance } from './validation';
import {
  resolveTextStyle,
  resolveTextPaint,
  updateAppearance,
  type AppearanceChange,
} from './update';

const legacy = validateBoard(fixture);
const editable = (document: CanonicalDocument, id: string) => {
  const item = document.items.find((item) => item.id === id)!;
  if (item.kind === 'asset') throw new Error('Not editable');
  return item;
};
const appearance = (id: string) => editable(migrateDocument(legacy), id).appearance;

describe('canonical appearance schema', () => {
  it('creates fresh per-kind canonical defaults without legacy styling fields', () => {
    for (const kind of ['text', 'closed-shape', 'open-shape', 'drawing'] as const) {
      const value = createAppearance(kind);
      expect(normalizeAppearance(value)).toEqual(value);
      expect(value.kind).toBe(kind);
      expect(createAppearance(kind)).not.toBe(value);
    }
    expect(createAppearance('drawing')).toMatchObject({ stroke: { width: 4, cap: 'round' } });
    expect(createAppearance('text')).toMatchObject({ background: null });
  });
  it('normalizes colors and numbers without mutating its projection', () => {
    const value = structuredClone(appearance('solid'));
    value.stroke.color = '#AABBCC';
    value.stroke.width = -0;
    const normalized = normalizeAppearance(value);
    expect(normalized.stroke.color).toBe('#aabbcc');
    expect(Object.is(normalized.stroke.width, -0)).toBe(false);
    expect(value.stroke.color).toBe('#AABBCC');
    expect(normalizeAppearance(normalized)).toEqual(normalized);
    expect(color('rgba(10, 20, 30, 0.5)')).toBe('rgba(10,20,30,0.5)');
    expect(color('hsl(270,50%,40%)')).toBe('hsl(270,50%,40%)');
  });
  it.each([NaN, Infinity, -1, 1.1])('rejects invalid schema opacity %s', (opacity) => {
    expect(() => normalizeAppearance({ ...appearance('solid'), opacity })).toThrow();
  });
  it.each(['garbage', '#zzzzzz', 'var(--color)', 'rgb(300,0,0)', 'rgba(0,0,0,2)', 'hsl(10,20,30)'])(
    'rejects malformed color %s',
    (value) => {
      expect(() => color(value)).toThrow('color');
    },
  );
  it('rejects unknown enums/fields, partial schemas and extra gradient stops', () => {
    const a = appearance('solid');
    expect(() => normalizeAppearance({ ...a, version: 9 })).toThrow('version');
    expect(() => normalizeAppearance({ ...a, opacityPercent: 80 })).toThrow('Unknown');
    expect(() => normalizeAppearance({ ...a, stroke: { ...a.stroke, style: 'wavy' } })).toThrow(
      'enum',
    );
    expect(() => normalizeAppearance({ ...a, shadow: {} })).toThrow();
    expect(() =>
      normalizeAppearance({
        ...a,
        fill: { enabled: true, paint: { kind: 'linear', stops: ['#000', '#fff', '#f00'] } },
      }),
    ).toThrow('two');
  });
  it('distinguishes glyph outlines, geometric borders and open strokes', () => {
    const document = migrateDocument(legacy);
    expect(capabilities(editable(document, 'text'))?.strokeMeaning).toBe('glyph-outline');
    expect(capabilities(editable(document, 'solid'))?.strokeMeaning).toBe('geometric-border');
    for (const id of ['drawing', 'line', 'arrow']) {
      const item = editable(document, id);
      expect(capabilities(item)?.strokeMeaning).toBe('open-path');
      expect(capabilities(item)?.fill).toBe(false);
      expect('fill' in item.appearance).toBe(false);
    }
  });
});

describe('legacy migration and effective style preservation', () => {
  it.each([fixture, multipage, cards])(
    'is deterministic, versioned, immutable and idempotent for captured fixtures',
    (input) => {
      const before = structuredClone(input);
      const migrated = migrateDocument(input);
      expect(migrated.version).toBe(3);
      expect(migrateDocument(input)).toEqual(migrated);
      expect(migrateDocument(migrated)).toEqual(migrated);
      expect(migrateDocument(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
      expect(input).toEqual(before);
      for (const item of [
        ...migrated.items,
        ...(migrated.pages?.flatMap((page) => page.items) || []),
      ]) {
        if (item.kind !== 'asset') {
          expect(item.appearance.version).toBe(1);
          for (const key of LEGACY_APPEARANCE_FIELDS) expect(key in item).toBe(false);
        }
      }
    },
  );
  it('migrates version 1 and rejects unknown or mixed versions without losing styles', () => {
    expect(migrateDocument({ ...fixture, version: 1 })).toEqual(migrateDocument(fixture));
    expect(() => migrateDocument({ ...fixture, version: 99 })).toThrow();
    expect(() =>
      migrateDocument({
        ...fixture,
        items: [{ ...fixture.items[0], appearance: appearance('solid') }],
      }),
    ).toThrow('Mixed');
    const canonical = migrateDocument(fixture);
    const mixed = { ...canonical, items: [{ ...canonical.items[0], color: '#fff' }] };
    const recovered = migrateDocument(mixed);
    expect(recovered.items[0]).toEqual(canonical.items[0]);
    expect(mixed.items[0].color).toBe('#fff');
    expect(migrateDocument(recovered)).toEqual(recovered);
    const mislabeled = { ...fixture, version: 3 };
    expect(migrateDocument(mislabeled)).toEqual(canonical);
    expect(migrateDocument({ ...multipage, version: 3 })).toEqual(migrateDocument(multipage));
    const mixedItems = {
      ...canonical,
      items: [canonical.items[0], ...fixture.items.slice(1)],
    };
    expect(migrateDocument(mixedItems)).toEqual(canonical);
    expect(() =>
      migrateDocument({ ...canonical, items: [{ ...canonical.items[0], kind: 'text' }] }),
    ).toThrow('kind');
  });
  it('preserves every nonappearance field, text run, path, ID, and archived page', () => {
    const original = validateBoard(multipage);
    const migrated = migrateDocument(original);
    const allOriginal = [...original.items, ...original.pages!.flatMap((page) => page.items)];
    const allCanonical = [...migrated.items, ...migrated.pages!.flatMap((page) => page.items)];
    expect(migrated.activePageId).toBe(original.activePageId);
    expect(migrated.pages!.map((page) => page.id)).toEqual(original.pages!.map((page) => page.id));
    allOriginal.forEach((item, index) => {
      const data = { ...item } as Partial<BoardItem>;
      for (const key of LEGACY_APPEARANCE_FIELDS) delete data[key];
      const { appearance: _appearance, ...actual } = allCanonical[index] as EditableItem;
      expect(actual).toEqual(data);
    });
    expect(editable(migrated, 'rich').textRuns).toEqual(
      original.items.find((item) => item.id === 'rich')!.textRuns,
    );
    expect(migrated.pages![1].items[0]).toMatchObject({
      id: 'archived',
      appearance: { fill: { paint: { kind: 'radial', stops: ['#bb6622', '#fff3bd'] } } },
    });
  });
  it('retains saved card geometry, grouping, typography and supported appearance', () => {
    const document = migrateDocument(cards);
    expect(document.items).toHaveLength(cards.items.length);
    expect(document.items.map((item) => item.kind)).toEqual(cards.items.map((item) => item.kind));
    const first = document.items[0];
    expect(first).toMatchObject({
      kind: 'shape',
      radius: 12,
      appearance: { fill: { paint: { color: '#eaf2fb' } }, stroke: { width: 1, color: '#c5d8ed' } },
    });
    expect(document.items.map((item) => item.groupPath)).toEqual(
      cards.items.map((item) => item.groupPath),
    );
  });
  it('preserves color-over-fill precedence, no-fill paint and exact two-stop gradients', () => {
    expect(appearance('solid')).toMatchObject({
      fill: { enabled: true, paint: { kind: 'solid', color: '#ff6600' } },
    });
    expect(appearance('linear')).toMatchObject({
      opacity: 0.65,
      fill: { paint: { kind: 'linear', stops: ['#3366ff', '#ffcc00'] } },
    });
    expect(appearance('radial')).toMatchObject({
      fill: { paint: { kind: 'radial', stops: ['#cc2244', '#ffffaa'] } },
    });
    expect(appearance('none')).toMatchObject({
      fill: { enabled: false, paint: { kind: 'linear', stops: ['#ee44bb', '#ffeeaa'] } },
    });
  });
  it('preserves legacy renderer stroke meanings and zero-width fallbacks', () => {
    expect(appearance('text').stroke).toMatchObject({
      width: 2,
      color: '#ee8844',
      join: 'round',
      scaling: 'transform',
    });
    expect(appearance('solid').stroke).toMatchObject({
      width: 8,
      color: '#004488',
      style: 'dashed',
      scaling: 'transform',
    });
    expect(appearance('line').stroke).toMatchObject({
      width: 7,
      color: '#008855',
      cap: 'round',
      join: 'round',
      style: 'dotted',
    });
    expect(appearance('drawing').stroke).toMatchObject({
      width: 13,
      color: '#7755aa',
      cap: 'round',
      style: 'dashed',
    });
    for (const kind of ['shape', 'drawing'] as const) {
      const item = {
        ...legacy.items[0],
        kind,
        shape: 'line' as const,
        borderWidth: 0,
        strokeWidth: 0,
      };
      expect((migrateItem(item) as EditableItem).appearance.stroke.width).toBe(4);
    }
    expect(appearance('curved').stroke.width).toBe(2);
  });
  it('retains path stroke scaling, silhouette and shadow/effect parameters', () => {
    expect(appearance('radial').stroke.scaling).toBe('fixed');
    const vector = {
      ...legacy.items[0],
      vectorPath: 'M0 0H10V10Z',
      vectorBox: { x: 0, y: 0, width: 10, height: 10 },
    };
    expect((migrateItem(vector) as EditableItem).appearance.stroke.scaling).toBe('fixed');
    expect(appearance('solid').shadow).toEqual({
      enabled: true,
      color: '#114422',
      opacity: 0.4,
      blur: 9,
      offsetX: 4,
      offsetY: 8,
    });
    expect(appearance('radial').shadow).toMatchObject({
      enabled: true,
      blur: 0,
      offsetX: 6,
      offsetY: 6,
    });
    expect(appearance('glow')).toMatchObject({
      effect: 'glow',
      silhouette: { width: 5, color: '#000000' },
      shadow: { enabled: true, color: '#ff3399', opacity: 0.8, blur: 20, offsetX: 0, offsetY: 0 },
    });
    expect(appearance('arrow').shadow.enabled).toBe(false);
    expect(appearance('text')).toMatchObject({ background: '#ffeed0' });
  });
  it('retains legacy branch-specific text defaults and custom shadow overrides', () => {
    const plain = {
      ...legacy.items.find((item) => item.id === 'text')!,
      color: undefined,
      fill: '#abcdef',
      textRuns: undefined,
      borderWidth: undefined,
      effect: undefined,
    };
    const rich = { ...plain, textRuns: [{ start: 0, end: 1, bold: true }] };
    expect((migrateItem(plain) as EditableItem).appearance).toMatchObject({
      fill: { paint: { color: '#abcdef' } },
    });
    expect((migrateItem(rich) as EditableItem).appearance).toMatchObject({
      fill: { paint: { color: '#33272b' } },
    });
    expect(
      (migrateItem({ ...rich, gradient: '#ffffff', gradientType: 'radial' }) as EditableItem)
        .appearance,
    ).toMatchObject({ fill: { paint: { kind: 'radial', stops: ['#abcdef', '#ffffff'] } } });
    const glow = {
      ...plain,
      effect: 'glow' as const,
      shadowColor: '#123456',
      shadowOpacity: 0,
      shadowBlur: 0,
      shadowOffsetX: -12,
      shadowOffsetY: 0,
    };
    expect((migrateItem(glow) as EditableItem).appearance.shadow).toEqual({
      enabled: true,
      color: '#123456',
      opacity: 0,
      blur: 0,
      offsetX: -12,
      offsetY: 0,
    });
    expect(
      (migrateItem({ ...plain, effect: 'outline', borderWidth: 1 }) as EditableItem).appearance
        .stroke.width,
    ).toBe(1);
    expect(
      (migrateItem({ ...legacy.items[0], effect: 'outline', borderWidth: 1 }) as EditableItem)
        .appearance.stroke.width,
    ).toBe(2);
  });
  it('leaves all asset records byte-equivalent and rejects canonical appearance on assets', () => {
    const asset = {
      ...legacy.items[0],
      kind: 'asset' as const,
      asset: { provider: 'curated-v1', editable: { colors: false, stroke: false } },
    };
    const document = migrateDocument({ ...newBoard(), items: [asset] });
    expect(document.items[0]).toEqual(asset);
    expect(capabilities(document.items[0])).toBeUndefined();
    expect(() =>
      validateCanonicalDocument({
        ...document,
        items: [{ ...asset, appearance: appearance('solid') }],
      }),
    ).toThrow('Assets');
  });
});

describe('one validated update pathway', () => {
  it('clamps UI measurements, preserves unrelated styles and suppresses no-op history', () => {
    const document = migrateDocument(legacy);
    const changed = updateAppearance(document, ['solid'], 'solid', {
      property: 'opacity',
      value: 2,
    });
    expect(changed).toBe(document);
    const stroke = updateAppearance(document, ['drawing'], 'drawing', {
      property: 'stroke',
      value: { width: 200 },
    });
    expect(editable(stroke, 'drawing').appearance.stroke.width).toBe(50);
    expect(editable(document, 'drawing').appearance.stroke.width).toBe(13);
    expect(editable(stroke, 'drawing').points).toEqual(editable(document, 'drawing').points);
    expect(editable(stroke, 'drawing').strokeTension).toBe(0.35);
    expect(editable(stroke, 'solid')).toBe(editable(document, 'solid'));
    expect(() =>
      updateAppearance(document, ['solid'], 'solid', { property: 'opacity', value: NaN }),
    ).toThrow();
  });
  it('rejects stale/locked/asset/missing selections without creating a change', () => {
    const document = migrateDocument(legacy);
    for (const ids of [[], ['text']])
      expect(updateAppearance(document, ids, 'solid', { property: 'opacity', value: 0.2 })).toBe(
        document,
      );
    const locked = {
      ...document,
      items: document.items.map((item) => ({ ...item, locked: true })),
    };
    expect(updateAppearance(locked, ['solid'], 'solid', { property: 'opacity', value: 0.2 })).toBe(
      locked,
    );
    expect(
      updateAppearance(document, ['missing'], 'missing', { property: 'opacity', value: 0.2 }),
    ).toBe(document);
    const assets = migrateDocument({
      ...newBoard(),
      items: [{ ...legacy.items[0], kind: 'asset' }],
    });
    expect(updateAppearance(assets, ['solid'], 'solid', { property: 'opacity', value: 0.2 })).toBe(
      assets,
    );
  });
  it('replaces gradients with solid paint and does not retain duplicate color state', () => {
    const document = migrateDocument(legacy);
    const changed = updateAppearance(document, ['linear'], 'linear', {
      property: 'fill',
      value: { enabled: true, paint: { kind: 'solid', color: '#ABCDEF' } },
    });
    expect(editable(changed, 'linear').appearance).toMatchObject({
      fill: { enabled: true, paint: { kind: 'solid', color: '#abcdef' } },
    });
    expect(JSON.stringify(editable(changed, 'linear'))).not.toContain('gradient');
    const curved = editable(document, 'curved');
    if (!('fill' in curved.appearance)) throw new Error();
    const disabled = updateAppearance(document, ['curved'], 'curved', {
      property: 'fill',
      value: { ...curved.appearance.fill, enabled: false },
    });
    expect(editable(disabled, 'curved').appearance).toMatchObject({
      fill: { enabled: false, paint: curved.appearance.fill.paint },
    });
  });
  it('enforces per-kind capabilities and protects stroke scaling', () => {
    const document = migrateDocument(legacy);
    const invalid: [string, AppearanceChange][] = [
      [
        'drawing',
        { property: 'fill', value: { enabled: true, paint: { kind: 'solid', color: '#fff' } } },
      ],
      ['solid', { property: 'background', value: '#fff' }],
      ['solid', { property: 'stroke', value: { cap: 'round' } }],
      ['radial', { property: 'stroke', value: { scaling: 'transform' } }],
      ['arrow', { property: 'shadow', value: { enabled: true } }],
      ['rich', { property: 'effect', value: 'echo' }],
    ];
    for (const [id, change] of invalid)
      expect(() => updateAppearance(document, [id], id, change)).toThrow();
  });
  it('preserves rich-text explicit formatting while changing object defaults', () => {
    const document = migrateDocument(legacy);
    const changed = updateAppearance(document, ['rich'], 'rich', {
      property: 'fill',
      value: { enabled: true, paint: { kind: 'solid', color: '#0000ff' } },
    });
    const item = editable(changed, 'rich');
    if (item.kind !== 'text') throw new Error();
    expect(resolveTextStyle(item, 0).color).toBe('#0000ff');
    expect(resolveTextStyle(item, 5)).toMatchObject({ color: '#ff0000', bold: true, italic: true });
    expect(item.textRuns).toEqual(editable(document, 'rich').textRuns);
    expect(item.text).toBe('Rich red word');
    expect(
      resolveTextStyle({ ...item, bold: true, textRuns: [{ start: 0, end: 1, bold: false }] }, 0)
        .bold,
    ).toBe(false);
    const gradient = migrateDocument({
      ...legacy,
      items: legacy.items.map((entry) =>
        entry.id === 'rich' ? { ...entry, color: '#000', gradient: '#fff' } : entry,
      ),
    });
    const gradientItem = editable(gradient, 'rich');
    if (gradientItem.kind !== 'text') throw new Error();
    expect(resolveTextStyle(gradientItem, 5).color).toBe('#ff0000');
    expect(resolveTextPaint(gradientItem, 5)).toEqual({ kind: 'solid', color: '#ff0000' });
    expect(resolveTextPaint(gradientItem, 0)).toEqual({ kind: 'linear', stops: ['#000', '#fff'] });
  });
  it('materializes effect presets and synchronizes only the active page mirror', () => {
    const document = migrateDocument(multipage);
    const changed = updateAppearance(document, ['solid'], 'solid', {
      property: 'effect',
      value: 'glow',
    });
    expect(editable(changed, 'solid').appearance.shadow).toEqual({
      enabled: true,
      color: '#ff6600',
      opacity: 0.8,
      blur: 20,
      offsetX: 0,
      offsetY: 0,
    });
    expect(changed.pages![0].items[0]).toBe(changed.items[0]);
    expect(changed.pages![1]).toBe(document.pages![1]);
  });
});

describe('staged loading boundaries and existing history', () => {
  it('uses the same migration for normal loading/library values and portable backups', () => {
    const normal = migrateDocument(fixture);
    const library = migrateDocument(JSON.parse(JSON.stringify(fixture)));
    const media = [{ id: 'opaque-existing-media' }];
    expect(library).toEqual(normal);
    expect(migrateBackup({ ...fixture, media })).toEqual({ document: normal, media });
    expect(migrateBackup({ ...normal, media }).document).toEqual(normal);
    expect(migrateBackup(multipage).document.pages).toHaveLength(2);
  });
  it('validates and migrates portable clipboard envelopes idempotently without ID remapping', () => {
    const input = { type: 'gratitude-board-selection', version: 1, depth: 0, items: fixture.items };
    const result = migrateClipboard(input, fixture);
    expect(result.items).toEqual(migrateDocument(fixture).items);
    expect(migrateClipboard(result, migrateDocument(fixture))).toEqual(result);
    expect(() => migrateClipboard({ ...input, depth: 21 }, fixture)).toThrow();
    expect(() => migrateClipboard({ ...input, version: 99 }, fixture)).toThrow();
    expect(() => migrateClipboard({ ...input, version: '1' }, fixture)).toThrow();
    expect(() =>
      migrateClipboard({ ...input, items: [{ ...fixture.items[0], width: -1 }] }, fixture),
    ).toThrow();
  });
  it('activates version 3 without serializing legacy appearance fields', () => {
    expect(newBoard().version).toBe(3);
    const serialized = JSON.stringify(migrateDocument(fixture));
    expect(serialized).not.toContain('borderWidth');
    expect(serialized).not.toContain('shadowOpacity');
  });
  it('retains migration equivalence across existing coalesced history undo/redo snapshots', () => {
    const history = new DocumentHistory();
    history.document = migrateDocument(fixture);
    const original = migrateDocument(history.document);
    history.beginGesture();
    for (const opacity of [0.9, 0.6, 0.3])
      history.commit(
        updateAppearance(history.document, ['solid'], 'solid', {
          property: 'opacity',
          value: opacity,
        }),
      );
    history.endGesture();
    const final = migrateDocument(history.document);
    expect(editable(final, 'solid').appearance.opacity).toBe(0.3);
    history.undo();
    expect(migrateDocument(history.document)).toEqual(original);
    expect(history.canUndo).toBe(false);
    history.redo();
    expect(migrateDocument(history.document)).toEqual(final);
    expect(migrateDocument(JSON.parse(JSON.stringify(final)))).toEqual(final);
  });
});
