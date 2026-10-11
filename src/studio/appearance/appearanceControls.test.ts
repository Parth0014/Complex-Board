import { describe, expect, it, vi } from 'vitest';
import fixture from '../../../tests/fixtures/appearance-phase-c-v2.json';
import { migrateDocument } from '../../vision/appearance/migration';
import { KonvaCanvasAdapter } from '../../vision/canvas/KonvaCanvasAdapter';
import {
  applyControl,
  controlChange,
  controlValues,
  technicalControls,
} from './appearanceControls';
import { selectedAppearance } from './feature';
import { TweakpaneSession } from './TweakpaneSession';

function setup(id: string) {
  const adapter = new KonvaCanvasAdapter({
    crypto: { randomUUID: () => 'duplicate' },
  } as unknown as Window & typeof globalThis);
  adapter.history.document = migrateDocument(fixture);
  adapter.select([id]);
  return adapter;
}

describe('hybrid controls share canonical semantics', () => {
  it('projects fill/stroke separately and never changes rich runs', () => {
    const adapter = setup('rich');
    const original = selectedAppearance(adapter)!;
    applyControl(adapter, 'rich', 'fillMode', 'radial');
    applyControl(adapter, 'rich', 'fill.color', '#112233');
    applyControl(adapter, 'rich', 'stroke.color', '#abcdef');
    applyControl(adapter, 'rich', 'background', '#ffffdd');
    const item = selectedAppearance(adapter)!;
    expect(item.textRuns).toEqual(original.textRuns);
    expect(item.appearance).toMatchObject({
      kind: 'text',
      background: '#ffffdd',
      stroke: { color: '#abcdef' },
      fill: { paint: { kind: 'radial' } },
    });
    expect(controlValues(item, (value) => value)['fill.color']).toBe('#112233');
  });
  it('hides unsupported controls using canonical capabilities', () => {
    const line = selectedAppearance(setup('line'))!;
    expect(technicalControls(line, 'color').map((control) => control.key)).toEqual([
      'stroke.color',
      'opacity',
    ]);
    expect(technicalControls(line, 'effects')).toEqual([]);
    expect(technicalControls(line, 'stroke').map((control) => control.key)).toContain('strokeCap');
    expect(
      technicalControls(selectedAppearance(setup('solid'))!, 'stroke').map(
        (control) => control.key,
      ),
    ).not.toContain('strokeCap');
  });
  it('preserves stroke scaling and drawing geometry across cap and join changes', () => {
    const adapter = setup('drawing');
    const original = selectedAppearance(adapter)!;
    applyControl(adapter, 'drawing', 'strokeCap', 'square');
    applyControl(adapter, 'drawing', 'strokeJoin', 'bevel');
    applyControl(adapter, 'drawing', 'stroke.width', 18.5);
    const edited = selectedAppearance(adapter)!;
    expect(edited.points).toEqual(original.points);
    expect({ ...edited, appearance: original.appearance }).toEqual(original);
    expect(edited.appearance.stroke).toMatchObject({
      cap: 'square',
      join: 'bevel',
      width: 18.5,
      scaling: original.appearance.stroke.scaling,
    });
  });
  it('generalized sessions coalesce every editable kind and reject interrupted writes', () => {
    for (const id of ['text', 'line', 'drawing']) {
      const adapter = setup(id);
      const before = adapter.history.document;
      const session = new TweakpaneSession(adapter, id, vi.fn(), selectedAppearance);
      session.begin();
      for (const value of [90, 70, 50])
        session.change(controlChange(selectedAppearance(adapter)!, 'opacity', value), false, true);
      adapter.select(['solid']);
      expect(adapter.history.gestureActive).toBe(false);
      const switched = adapter.history.document;
      session.change({ property: 'opacity', value: 0.1 }, true, false);
      expect(adapter.history.document).toBe(switched);
      adapter.undo();
      expect(adapter.history.document).toEqual(before);
      expect(adapter.history.canUndo).toBe(false);
      session.dispose();
    }
  });
  it('retains inactive paint and prevents stale React commands or locked edits', () => {
    const adapter = setup('linear');
    const before = selectedAppearance(adapter)!.appearance;
    applyControl(adapter, 'linear', 'fillEnabled', false);
    expect(selectedAppearance(adapter)!.appearance).toMatchObject({
      fill: { enabled: false, paint: 'fill' in before ? before.fill.paint : undefined },
    });
    adapter.select(['solid']);
    const switched = adapter.history.document;
    applyControl(adapter, 'linear', 'opacity', 12);
    expect(adapter.history.document).toBe(switched);
    adapter.patchItems([{ id: 'solid', patch: { locked: true } }]);
    const locked = adapter.history.document;
    applyControl(adapter, 'solid', 'opacity', 12);
    expect(adapter.history.document).toBe(locked);
  });
});
