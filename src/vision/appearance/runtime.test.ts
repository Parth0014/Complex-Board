import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  rmdirSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import fixture from '../../../tests/fixtures/appearance-phase-c-v2.json';
import multipage from '../../../tests/fixtures/appearance-multipage-v2.json';
import { recoverLegacyBackup } from '../../../scripts/appearance-recovery.mjs';
import { KonvaCanvasAdapter } from '../canvas/KonvaCanvasAdapter';
import { appearanceToKonva, paintToKonva } from '../canvas/appearance';
import { appearancePersistenceEnabled } from './activation';
import { migrateDocument } from './migration';
import { appearanceValue, type AppearanceField } from './controls';
import type { EditableItem } from './types';
import { primaryColor } from './capabilities';

function setup() {
  let id = 0;
  const a = new KonvaCanvasAdapter({
    crypto: { randomUUID: () => `copy-${id++}` },
  } as unknown as Window & typeof globalThis);
  a.history.document = migrateDocument(fixture);
  return a;
}
const editable = (a: KonvaCanvasAdapter, id: string) =>
  a.history.document.items.find((item) => item.id === id) as EditableItem;

describe('active canonical commands', () => {
  it('updates every existing appearance control through validated commands and stores no legacy fields', () => {
    const a = setup();
    a.select(['solid']);
    const values: [AppearanceField, unknown][] = [
      ['fill.color', '#112233'],
      ['fill.endColor', '#aabbcc'],
      ['fill.kind', 'radial'],
      ['fill.disabled', true],
      ['fill.disabled', false],
      ['stroke.width', 7],
      ['stroke.color', '#445566'],
      ['stroke.style', 'dotted'],
      ['opacity', 0.75],
      ['shadow.preset', 'hard'],
      ['shadow.color', '#667788'],
      ['shadow.opacity', 0.6],
      ['shadow.blur', 13],
      ['shadow.offsetX', -7],
      ['shadow.offsetY', 9],
      ['silhouette.width', 6],
      ['silhouette.color', '#eeffee'],
      ['effect', 'none'],
    ];
    for (const [key, value] of values) a.setAppearanceField(key, value);
    const item = editable(a, 'solid');
    expect(item.appearance).toMatchObject({
      opacity: 0.75,
      fill: { enabled: true, paint: { kind: 'radial', stops: ['#112233', '#aabbcc'] } },
      stroke: { width: 7, color: '#445566', style: 'dotted' },
      shadow: { enabled: true, color: '#667788', opacity: 0.6, blur: 13, offsetX: -7, offsetY: 9 },
      silhouette: { width: 6, color: '#eeffee' },
    });
    expect(appearanceValue(item, 'fill.endColor')).toBe('#aabbcc');
    expect(appearanceValue(item, 'shadow.preset')).toBe('custom');
    expect(JSON.stringify(item)).not.toMatch(/borderWidth|shadowOpacity|gradientType/);
    expect(() => a.patchItems([{ id: 'solid', patch: { color: '#ffffff' } }])).toThrow(
      'changeAppearance',
    );
    expect(() => a.patchItems([{ id: 'solid', patch: { appearance: item.appearance } }])).toThrow(
      'changeAppearance',
    );
  });
  it('does not remeasure unrelated text or overwrite geometry, runs, selection or archived pages', () => {
    const a = setup();
    const before = a.history.document;
    a.select(['rich']);
    a.setAppearanceField('fill.color', '#abcdef');
    expect(editable(a, 'rich').textRuns).toEqual(
      before.items.find((item) => item.id === 'rich')!.textRuns,
    );
    expect(a.selectedIds).toEqual(['rich']);
    for (const item of before.items)
      if (item.id !== 'rich')
        expect(a.history.document.items.find((entry) => entry.id === item.id)).toBe(item);
    expect(editable(a, 'rich')).toMatchObject({ x: 370, y: 410, width: 320, height: 110 });
    a.history.document = migrateDocument(multipage);
    a.select(['solid']);
    const archived = a.history.document.pages![1];
    a.updateSelection({ opacity: 42 });
    expect(a.history.document.pages![0].items).toEqual(a.history.document.items);
    expect(a.history.document.pages![1]).toBe(archived);
  });
  it('keeps continuous appearance gestures as one undo command, with no-op and locked edits suppressed', () => {
    const a = setup();
    a.select(['solid']);
    const before = a.history.document;
    a.beginGesture();
    for (const opacity of [80, 60, 35]) a.updateSelection({ opacity });
    expect(a.history.gestureActive).toBe(true);
    a.endGesture();
    const final = a.history.document;
    a.undo();
    expect(a.history.document).toBe(before);
    expect(a.history.canUndo).toBe(false);
    a.redo();
    expect(a.history.document).toBe(final);
    const revision = a.history.revision;
    a.updateSelection({ opacity: 35 });
    expect(a.history.revision).toBe(revision);
    a.patchItems([{ id: 'solid', patch: { locked: true } }]);
    const locked = a.history.document;
    a.setAppearanceField('fill.color', '#000000');
    expect(a.history.document).toBe(locked);
    a.select(['text']);
    a.changeAppearance({ property: 'opacity', value: 0.2 }, ['solid']);
    expect(a.history.document).toBe(locked);
  });
  it('edits groups, duplicates canonical styles, pastes styles atomically and preserves rich runs', () => {
    const a = setup();
    a.select(['solid', 'linear']);
    a.groupSelection();
    a.updateSelection({ opacity: 25 });
    expect(editable(a, 'solid').appearance.opacity).toBe(0.25);
    expect(editable(a, 'linear').appearance.opacity).toBe(0.25);
    a.duplicateSelection();
    const copies = a.history.document.items.filter((item) => item.id.startsWith('copy-'));
    expect(copies).toHaveLength(2);
    expect(copies.map((item) => item.appearance)).toEqual([
      editable(a, 'solid').appearance,
      editable(a, 'linear').appearance,
    ]);
    a.select(['text']);
    a.copyStyle();
    a.select(['rich']);
    const before = a.history.document;
    const runs = editable(a, 'rich').textRuns;
    a.pasteStyle();
    expect(editable(a, 'rich').textRuns).toEqual(runs);
    expect(primaryColor(editable(a, 'rich').appearance)).toBe('#224466');
    a.undo();
    expect(a.history.document).toBe(before);
    a.redo();
    expect(editable(a, 'rich').textRuns).toEqual(runs);
  });
  it('creates text, quick shapes and drawings directly in the canonical schema with preserved path scaling', () => {
    const a = setup();
    for (const shape of ['rectangle', 'circle', 'star', 'heart', 'line', 'arrow'] as const)
      a.createShape(shape);
    a.createDrawing([0, 0, 25, 30, 70, 20], '#332211', 12, 0.4);
    a.createTextPreset({
      id: 'x',
      label: 'x',
      category: 'reflection',
      sample: 'Dream',
      fontFamily: 'assistant',
      fontSize: 34,
      color: '#123456',
    });
    const items = a.history.document.items.slice(fixture.items.length) as EditableItem[];
    expect(
      items.every(
        (item) => !!item.appearance && item.opacity === undefined && item.color === undefined,
      ),
    ).toBe(true);
    expect(items.map((item) => item.appearance.stroke.scaling)).toEqual([
      'transform',
      'transform',
      'fixed',
      'fixed',
      'transform',
      'transform',
      'transform',
      'transform',
    ]);
    expect(migrateDocument(JSON.parse(JSON.stringify(a.history.document)))).toEqual(
      a.history.document,
    );
  });
  it('removes selected effect presets through explicit canonical values', () => {
    const a = setup();
    a.select(['solid']);
    a.setAppearanceField('effect', 'glow');
    a.setAppearanceField('effect', 'none');
    expect(editable(a, 'solid').appearance.shadow.enabled).toBe(false);
    a.setAppearanceField('effect', 'outline');
    a.setAppearanceField('effect', 'none');
    expect(editable(a, 'solid').appearance.stroke.width).toBe(0);
  });
  it('preserves manual styles after leaving presets and preserves disabled fill when removing a gradient', () => {
    const a = setup();
    a.select(['solid']);
    a.setAppearanceField('effect', 'glow');
    a.setAppearanceField('shadow.blur', 7);
    a.setAppearanceField('effect', 'none');
    expect(editable(a, 'solid').appearance.shadow).toMatchObject({ enabled: true, blur: 7 });
    a.setAppearanceField('effect', 'outline');
    a.setAppearanceField('stroke.width', 9);
    a.setAppearanceField('effect', 'none');
    expect(editable(a, 'solid').appearance.stroke.width).toBe(9);
    a.select(['none']);
    a.setAppearanceField('fill.endColor', undefined);
    expect(editable(a, 'none').appearance).toMatchObject({
      fill: { enabled: false, paint: { kind: 'solid' } },
    });
  });
  it('applies object-specific controls only to compatible selected members without touching assets', () => {
    const a = setup();
    a.select(['solid', 'rich', 'drawing', 'line']);
    a.setAppearanceField('background', '#fffabc');
    expect(editable(a, 'rich').appearance).toMatchObject({ background: '#fffabc' });
    expect(editable(a, 'solid').appearance).not.toHaveProperty('background');
    const line = editable(a, 'line');
    a.setAppearanceField('shadow.preset', 'soft');
    expect(editable(a, 'line')).toBe(line);
    a.setAppearanceField('fill.endColor', '#abcdef');
    expect(editable(a, 'drawing').appearance).not.toHaveProperty('fill');
  });
});

it('maps canonical paint/stroke/shadow and per-kind semantics once for canvas and exports', () => {
  const a = setup();
  expect(appearanceToKonva(editable(a, 'solid'))).toMatchObject({
    fill: '#ff6600',
    stroke: '#004488',
    strokeWidth: 8,
    dash: [12, 8],
    shadowEnabled: true,
    shadowBlur: 9,
  });
  expect(appearanceToKonva(editable(a, 'drawing'))).toMatchObject({
    stroke: '#7755aa',
    strokeWidth: 13,
    lineCap: 'round',
    lineJoin: 'round',
    fillEnabled: true,
  });
  expect(appearanceToKonva(editable(a, 'geometry-star')).strokeScaleEnabled).toBe(false);
  expect(paintToKonva({ kind: 'radial', stops: ['#000000', '#ffffff'] }, 100, 200)).toMatchObject({
    fillPriority: 'radial-gradient',
    fillRadialGradientEndRadius: 100,
    fillRadialGradientColorStops: [0, '#000000', 1, '#ffffff'],
  });
});

it('recovers v3 backups to a separately validated v2 file without losing pages, media or styles', () => {
  const canonical = migrateDocument(multipage);
  const media = [{ id: 'retained', mime: 'image/png', data: 'opaque' }];
  const recovered = recoverLegacyBackup({ ...canonical, media });
  expect(migrateDocument(recovered)).toEqual({ ...canonical, media });
  expect(canonical.version).toBe(3);
  const rich = migrateDocument(fixture);
  const item = rich.items.find((item) => item.id === 'rich')! as Extract<
    EditableItem,
    { kind: 'text' }
  >;
  item.appearance.fill.paint = { kind: 'linear', stops: ['#000000', '#ffffff'] };
  expect(() => recoverLegacyBackup(rich)).toThrow('character colors');
});

it('provides a reversible read-only validation mode without a second renderer', () => {
  vi.stubEnv('VITE_APPEARANCE_PERSISTENCE', 'preview');
  expect(appearancePersistenceEnabled()).toBe(false);
  vi.unstubAllEnvs();
  expect(appearancePersistenceEnabled()).toBe(true);
});

it('offline recovery CLI produces a separate v2 file and refuses to overwrite input or destination', () => {
  const folder = mkdtempSync(join(tmpdir(), 'appearance-recovery-test-'));
  const input = join(folder, 'canonical.json'),
    output = join(folder, 'legacy.json');
  const original = JSON.stringify(migrateDocument(fixture));
  writeFileSync(input, original);
  try {
    execFileSync(process.execPath, [resolve('scripts/appearance-recovery.mjs'), input, output]);
    expect(migrateDocument(JSON.parse(readFileSync(output, 'utf8')))).toEqual(JSON.parse(original));
    expect(readFileSync(input, 'utf8')).toBe(original);
    const recovered = readFileSync(output, 'utf8');
    expect(() =>
      execFileSync(process.execPath, [resolve('scripts/appearance-recovery.mjs'), input, output], {
        stdio: 'pipe',
      }),
    ).toThrow();
    expect(readFileSync(output, 'utf8')).toBe(recovered);
  } finally {
    unlinkSync(input);
    if (existsSync(output)) unlinkSync(output);
    rmdirSync(folder);
  }
});
