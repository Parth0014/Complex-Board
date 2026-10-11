import { describe, expect, it, vi } from 'vitest';
import fixture from '../../../tests/fixtures/appearance-phase-c-v2.json';
import { KonvaCanvasAdapter } from '../../vision/canvas/KonvaCanvasAdapter';
import { migrateDocument } from '../../vision/appearance/migration';
import { selectedQuickShape } from './feature';
import { TweakpaneSession } from './TweakpaneSession';
import { shapeControlChange } from './shapePane';

function setup() {
  const adapter = new KonvaCanvasAdapter({
    crypto: { randomUUID: () => 'duplicate' },
  } as unknown as Window & typeof globalThis);
  adapter.history.document = migrateDocument(fixture);
  adapter.select(['solid']);
  const refresh = vi.fn();
  const session = new TweakpaneSession(adapter, 'solid', refresh);
  return { adapter, refresh, session };
}

describe('Tweakpane canonical gesture session', () => {
  it('coalesces continuous preview events into one existing undo/redo command', () => {
    const { adapter, session } = setup();
    const before = adapter.history.document;
    session.begin();
    for (const value of [5, 9, 13])
      session.change({ property: 'stroke', value: { width: value } }, false, true);
    session.change({ property: 'stroke', value: { width: 13 } }, true, true);
    expect(adapter.history.gestureActive).toBe(true);
    session.finish();
    adapter.undo();
    expect(adapter.history.document).toEqual(before);
    expect(adapter.history.canUndo).toBe(false);
    adapter.redo();
    expect(selectedQuickShape(adapter)!.appearance.stroke.width).toBe(13);
    session.dispose();
  });
  it('finalizes a selection interruption synchronously and rejects late events for the old object', () => {
    const { adapter, session } = setup();
    session.change({ property: 'opacity', value: 0.5 }, false, true);
    adapter.select(['linear']);
    expect(adapter.history.gestureActive).toBe(false);
    const switched = adapter.history.document;
    session.change({ property: 'opacity', value: 0.1 }, true, false);
    expect(adapter.history.document).toBe(switched);
    adapter.select(['solid']);
    session.change({ property: 'opacity', value: 0.1 }, true, false);
    expect(selectedQuickShape(adapter)!.appearance.opacity).toBe(0.5);
    session.begin();
    session.change({ property: 'opacity', value: 0.4 }, true, false);
    expect(selectedQuickShape(adapter)!.appearance.opacity).toBe(0.4);
    session.dispose();
  });
  it('does not write into locked, deleted, nonshape or multiple selections', () => {
    for (const action of ['lock', 'delete', 'text', 'drawing', 'multiple'] as const) {
      const { adapter, session } = setup();
      session.change({ property: 'opacity', value: 0.6 }, false, true);
      if (action === 'lock') adapter.patchItems([{ id: 'solid', patch: { locked: true } }]);
      else if (action === 'delete') adapter.delete(['solid']);
      else
        adapter.select(
          action === 'multiple' ? ['solid', 'linear'] : [action === 'text' ? 'text' : 'drawing'],
        );
      const before = adapter.history.document;
      session.change({ property: 'opacity', value: 0.2 }, true, false);
      expect(adapter.history.document).toBe(before);
      expect(adapter.history.gestureActive).toBe(false);
      session.dispose();
    }
  });
  it('cancel restores the authoritative snapshot; unmount finalizes and unsubscribes once', () => {
    const { adapter, session, refresh } = setup();
    const before = adapter.history.document;
    session.change({ property: 'opacity', value: 0.4 }, false, true);
    session.interrupt(true);
    expect(adapter.history.document).toEqual(before);
    expect(adapter.history.canUndo).toBe(false);
    session.begin();
    session.change({ property: 'opacity', value: 0.3 }, false, true);
    session.dispose();
    session.dispose();
    expect(adapter.history.gestureActive).toBe(false);
    const count = refresh.mock.calls.length;
    adapter.undo();
    expect(adapter.history.document).toEqual(before);
    expect(refresh).toHaveBeenCalledTimes(count);
    session.change({ property: 'opacity', value: 0.2 }, true, false);
    expect(adapter.history.document).toEqual(before);
  });
  it('external undo refreshes and invalidates an unfinished widget sequence without destroying redo', () => {
    const { adapter, session, refresh } = setup();
    const before = adapter.history.document;
    session.change({ property: 'opacity', value: 0.4 }, false, true);
    adapter.undo();
    session.change({ property: 'opacity', value: 0.3 }, true, false);
    expect(adapter.history.document).toEqual(before);
    expect(adapter.history.canRedo).toBe(true);
    adapter.redo();
    expect(selectedQuickShape(adapter)!.appearance.opacity).toBe(0.4);
    expect(refresh).toHaveBeenCalled();
    session.dispose();
  });
  it('projects all D1 controls into canonical commands and keeps disabled gradients intact', () => {
    const { adapter, session } = setup();
    const apply = <K extends Parameters<typeof shapeControlChange>[1]>(
      key: K,
      value: Parameters<typeof shapeControlChange<K>>[2],
    ) => {
      session.begin();
      session.change(
        shapeControlChange(selectedQuickShape(adapter)!.appearance, key, value),
        true,
        false,
      );
    };
    apply('fillMode', 'linear');
    apply('fillColor', '#112233');
    apply('endColor', '#445566');
    apply('fillEnabled', false);
    apply('fillMode', 'radial');
    expect(selectedQuickShape(adapter)!.appearance.fill).toEqual({
      enabled: false,
      paint: { kind: 'radial', stops: ['#112233', '#445566'] },
    });
    apply('fillEnabled', true);
    apply('borderColor', '#778899');
    apply('borderWidth', 12);
    apply('borderStyle', 'dotted');
    apply('opacity', 60);
    apply('shadowEnabled', true);
    apply('shadowColor', '#aabbcc');
    apply('shadowOpacity', 30);
    apply('shadowBlur', 10);
    apply('shadowX', -4);
    apply('shadowY', 7);
    const a = selectedQuickShape(adapter)!.appearance;
    expect(a.stroke).toMatchObject({ width: 12, color: '#778899', style: 'dotted' });
    expect(a.opacity).toBe(0.6);
    expect(a.shadow).toEqual({
      enabled: true,
      color: '#aabbcc',
      opacity: 0.3,
      blur: 10,
      offsetX: -4,
      offsetY: 7,
    });
    apply('effect', 'glow');
    expect(selectedQuickShape(adapter)!.appearance.shadow.enabled).toBe(true);
    apply('effect', 'outline');
    expect(selectedQuickShape(adapter)!.appearance.effect).toBe('outline');
    expect(adapter.history.document.items.find((i) => i.id === 'solid')).not.toHaveProperty(
      'borderWidth',
    );
    session.dispose();
  });
  it('duplicate inherits canonical styles and has its own target session', () => {
    const { adapter, session } = setup();
    session.change({ property: 'opacity', value: 0.7 }, true, false);
    adapter.duplicateSelection();
    const copy = selectedQuickShape(adapter)!;
    const next = new TweakpaneSession(adapter, copy.id, () => {});
    next.change({ property: 'opacity', value: 0.2 }, true, false);
    expect(copy.id).toBe('duplicate');
    expect(adapter.history.document.items.find((i) => i.id === 'solid')).toMatchObject({
      appearance: { opacity: 0.7 },
    });
    expect(selectedQuickShape(adapter)!.appearance.opacity).toBe(0.2);
    next.dispose();
    session.dispose();
  });
});
