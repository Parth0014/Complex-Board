import { Pane, type BindingParams, type FolderApi, type InputBindingApi } from 'tweakpane';
import type { StudioAdapter } from '../../vision/contracts';
import type { ClosedShapeAppearance } from '../../vision/appearance/types';
import type { AppearanceChange } from '../../vision/appearance/update';
import { selectedQuickShape } from './feature';
import { TweakpaneSession } from './TweakpaneSession';

/** Only temporary, flat binding values. Never persisted or treated as a style model. */
function values(a: ClosedShapeAppearance, pickerColor: (color: string) => string) {
  const paint = a.fill.paint;
  return {
    fillEnabled: a.fill.enabled,
    fillMode: paint.kind,
    fillColor: pickerColor(paint.kind === 'solid' ? paint.color : paint.stops[0]),
    endColor: pickerColor(paint.kind === 'solid' ? paint.color : paint.stops[1]),
    borderColor: pickerColor(a.stroke.color),
    borderWidth: a.stroke.width,
    borderStyle: a.stroke.style,
    opacity: a.opacity * 100,
    effect: a.effect,
    shadowEnabled: a.shadow.enabled,
    shadowColor: pickerColor(a.shadow.color),
    shadowOpacity: a.shadow.opacity * 100,
    shadowBlur: a.shadow.blur,
    shadowX: a.shadow.offsetX,
    shadowY: a.shadow.offsetY,
  };
}
type Values = ReturnType<typeof values>;

/** Translate UI events using the *current* canonical appearance, never a cached object. */
export function shapeControlChange<K extends keyof Values>(
  a: ClosedShapeAppearance,
  key: K,
  value: Values[K],
): AppearanceChange {
  const paint = a.fill.paint;
  const first = paint.kind === 'solid' ? paint.color : paint.stops[0];
  switch (key) {
    case 'fillEnabled':
      return { property: 'fill', value: { ...a.fill, enabled: Boolean(value) } };
    case 'fillMode':
      return {
        property: 'fill',
        value: {
          enabled: a.fill.enabled,
          paint:
            value === 'solid'
              ? { kind: 'solid', color: first }
              : {
                  kind: value as 'linear' | 'radial',
                  stops: [first, paint.kind === 'solid' ? first : paint.stops[1]],
                },
        },
      };
    case 'fillColor':
    case 'endColor':
      return {
        property: 'fill',
        value: {
          enabled: a.fill.enabled,
          paint:
            paint.kind === 'solid'
              ? { kind: 'solid', color: String(value) }
              : {
                  ...paint,
                  stops:
                    key === 'fillColor' ? [String(value), paint.stops[1]] : [first, String(value)],
                },
        },
      };
    case 'borderColor':
      return { property: 'stroke', value: { color: String(value) } };
    case 'borderWidth':
      return { property: 'stroke', value: { width: Number(value) } };
    case 'borderStyle':
      return {
        property: 'stroke',
        value: { style: value as ClosedShapeAppearance['stroke']['style'] },
      };
    case 'opacity':
      return { property: 'opacity', value: Number(value) / 100 };
    case 'effect':
      return { property: 'effect', value: value as ClosedShapeAppearance['effect'] };
    case 'shadowEnabled':
      return { property: 'shadow', value: { enabled: Boolean(value) } };
    case 'shadowColor':
      return { property: 'shadow', value: { color: String(value) } };
    case 'shadowOpacity':
      return { property: 'shadow', value: { opacity: Number(value) / 100 } };
    case 'shadowBlur':
      return { property: 'shadow', value: { blur: Number(value) } };
    case 'shadowX':
      return { property: 'shadow', value: { offsetX: Number(value) } };
    case 'shadowY':
      return { property: 'shadow', value: { offsetY: Number(value) } };
  }
  throw new Error('Unknown shape control.');
}

export function createShapePane(container: HTMLDivElement, adapter: StudioAdapter, id: string) {
  const doc = container.ownerDocument,
    win = doc.defaultView!;
  const initial = selectedQuickShape(adapter);
  if (initial?.id !== id) throw new Error('Select one closed Quick Shape.');
  // Tweakpane accepts functional/hex colors. CSS resolves named colors for UI only.
  const colorCache = new Map<string, string>();
  const pickerColor = (color: string) => {
    if (/^(#|rgb|hsl)/i.test(color)) return color;
    if (colorCache.has(color)) return colorCache.get(color)!;
    const sample = doc.createElement('span');
    sample.style.color = color;
    sample.hidden = true;
    container.appendChild(sample);
    const resolved = win.getComputedStyle(sample).color;
    sample.remove();
    colorCache.set(color, resolved);
    return resolved;
  };
  const params = values(initial.appearance, pickerColor);
  const pane = new Pane({ container, document: doc });
  const bindings = new Map<
    keyof Values,
    Pick<InputBindingApi, 'refresh' | 'element' | 'disabled' | 'hidden'>
  >();
  let refreshing = false,
    disposed = false,
    pointer = false,
    keyboard = false;
  let mouseTracking = false;
  const refresh = () => {
    if (disposed) return;
    const current = selectedQuickShape(adapter);
    const valid = current?.id === id;
    refreshing = true;
    try {
      pane.disabled = !valid || !!current.locked;
      if (!valid) return;
      const next = values(current.appearance, pickerColor);
      for (const [key, binding] of bindings) {
        if (params[key] !== next[key]) {
          Object.assign(params, { [key]: next[key] });
          binding.refresh();
        }
        binding.disabled =
          (['fillMode', 'fillColor', 'endColor'].includes(key) && !next.fillEnabled) ||
          (key === 'endColor' && next.fillMode === 'solid') ||
          (key.startsWith('shadow') && key !== 'shadowEnabled' && !next.shadowEnabled);
        binding.hidden = key === 'endColor' && next.fillMode === 'solid';
        const slider = binding.element.querySelector('[role="slider"]');
        slider?.setAttribute('aria-valuenow', String(next[key]));
      }
    } finally {
      refreshing = false;
    }
  };
  const session = new TweakpaneSession(adapter, id, refresh);
  const colorOptions = { picker: 'inline', expanded: false, color: { alpha: true } } as const;
  const add = <K extends keyof Values>(
    folder: FolderApi,
    key: K,
    label: string,
    options: BindingParams = {},
  ) => {
    const binding = folder.addBinding(params, key, { label, ...options });
    bindings.set(key, binding);
    binding.element.dataset.appearanceControl = key;
    const inputs = binding.element.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      'input, select',
    );
    inputs.forEach((input, index) =>
      input.setAttribute('aria-label', index === 0 ? label : `${label} component ${index}`),
    );
    binding.element.querySelectorAll<HTMLButtonElement>('button').forEach((button, index) => {
      button.setAttribute('aria-label', `${label} ${index === 0 ? 'picker' : 'color format'}`);
    });
    const slider = binding.element.querySelector<HTMLElement>('.tp-sldv_t');
    if (slider) {
      slider.setAttribute('role', 'slider');
      slider.setAttribute('aria-label', `${label} slider`);
      slider.setAttribute('aria-valuemin', String(options.min));
      slider.setAttribute('aria-valuemax', String(options.max));
      slider.setAttribute('aria-valuenow', String(params[key]));
    }
    binding.element
      .querySelectorAll<HTMLElement>('.tp-svpv, .tp-hplv, .tp-aplv')
      .forEach((control) => {
        control.setAttribute('role', 'group');
        control.setAttribute(
          'aria-label',
          `${label} ${control.classList.contains('tp-svpv') ? 'saturation and brightness' : control.classList.contains('tp-hplv') ? 'hue' : 'alpha'}`,
        );
      });
    binding.on('change', (event) => {
      if (refreshing || disposed) return;
      const current = selectedQuickShape(adapter);
      if (current?.id !== id || current.locked) return;
      try {
        session.change(
          shapeControlChange(current.appearance, key, event.value as Values[K]),
          event.last,
          pointer || keyboard,
        );
        refresh();
      } catch {
        // Invalid text/color drafts never enter document history. Restore authoritative values.
        session.finish();
        refresh();
      }
    });
    return binding;
  };
  try {
    const fill = pane.addFolder({ title: 'Fill' });
    add(fill, 'fillEnabled', 'Enable fill');
    add(fill, 'fillMode', 'Fill type', {
      options: { Solid: 'solid', Linear: 'linear', Radial: 'radial' },
    });
    add(fill, 'fillColor', 'Fill color', colorOptions);
    add(fill, 'endColor', 'Second color', colorOptions);
    const border = pane.addFolder({ title: 'Border' });
    add(border, 'borderColor', 'Border color', colorOptions);
    add(border, 'borderWidth', 'Border width', {
      min: 0,
      max: Math.max(30, initial.appearance.stroke.width),
      step: 0.5,
    });
    add(border, 'borderStyle', 'Border style', {
      options: { Solid: 'solid', Dashed: 'dashed', Dotted: 'dotted' },
    });
    const appearance = pane.addFolder({ title: 'Appearance' });
    add(appearance, 'opacity', 'Opacity (%)', { min: 0, max: 100, step: 1 });
    const effect = add(appearance, 'effect', 'Effect', {
      options: {
        None: 'none',
        Glow: 'glow',
        Outline: 'outline',
        'Echo (unavailable)': 'echo',
        'Glitch (unavailable)': 'glitch',
      },
    });
    effect.element.querySelectorAll('option').forEach((option) => {
      if (option.textContent?.includes('(unavailable)')) option.disabled = true;
    });
    const shadow = pane.addFolder({ title: 'Shadow', expanded: false });
    add(shadow, 'shadowEnabled', 'Enable shadow');
    add(shadow, 'shadowColor', 'Shadow color', colorOptions);
    add(shadow, 'shadowOpacity', 'Shadow opacity (%)', { min: 0, max: 100, step: 1 });
    add(shadow, 'shadowBlur', 'Shadow blur', {
      min: 0,
      max: Math.max(100, initial.appearance.shadow.blur),
      step: 1,
    });
    add(shadow, 'shadowX', 'Shadow X', { step: 1 });
    add(shadow, 'shadowY', 'Shadow Y', { step: 1 });
    refresh();
  } catch (error) {
    disposed = true;
    session.dispose();
    pane.dispose();
    throw error;
  }
  const inside = (target: EventTarget | null) =>
    target instanceof win.Node && container.contains(target);
  const editing = (target: EventTarget | null) =>
    inside(target) && (target as Element).closest('[data-appearance-control]');
  const down = (event: PointerEvent) => {
    if (editing(event.target)) {
      pointer = true;
      session.begin();
    } else session.finish();
  };
  const release = () => {
    mouseTracking = false;
    if (!pointer) return;
    pointer = false;
    // Tweakpane's own release handler must finish writing before history is closed.
    queueMicrotask(() => {
      if (!pointer && !keyboard && !disposed) session.finish();
    });
  };
  const keyDown = (event: KeyboardEvent) => {
    if (!inside(event.target)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.stopPropagation();
      pointer = keyboard = false;
      session.interrupt();
      event.shiftKey ? adapter.redo() : adapter.undo();
      refresh();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      pointer = keyboard = false;
      session.interrupt(true);
      refresh();
      (doc.activeElement as HTMLElement)?.blur();
    } else if (editing(event.target) && event.key !== 'Tab' && !event.ctrlKey && !event.metaKey) {
      keyboard = true;
      session.begin();
    }
  };
  const keyUp = () => {
    if (!keyboard) return;
    keyboard = false;
    queueMicrotask(() => {
      if (!pointer && !disposed) session.finish();
    });
  };
  const focusOut = () => {
    keyboard = false;
    if (!pointer) session.finish();
  };
  const blur = () => {
    pointer = keyboard = false;
    session.interrupt();
  };
  const mouseDown = (event: MouseEvent) => {
    if (editing(event.target)) mouseTracking = true;
  };
  const cancel = () => {
    pointer = keyboard = false;
    session.interrupt();
    refresh();
  };
  doc.addEventListener('pointerdown', down, true);
  doc.addEventListener('mousedown', mouseDown, true);
  doc.addEventListener('mouseup', release);
  doc.addEventListener('touchend', release);
  doc.addEventListener('pointercancel', cancel);
  doc.addEventListener('touchcancel', cancel);
  doc.addEventListener('keydown', keyDown, true);
  doc.addEventListener('keyup', keyUp);
  container.addEventListener('focusout', focusOut);
  win.addEventListener('blur', blur);
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      doc.removeEventListener('pointerdown', down, true);
      doc.removeEventListener('mousedown', mouseDown, true);
      doc.removeEventListener('mouseup', release);
      doc.removeEventListener('touchend', release);
      doc.removeEventListener('pointercancel', cancel);
      doc.removeEventListener('touchcancel', cancel);
      doc.removeEventListener('keydown', keyDown, true);
      doc.removeEventListener('keyup', keyUp);
      container.removeEventListener('focusout', focusOut);
      win.removeEventListener('blur', blur);
      session.dispose();
      // v4's mouse-drag helper releases document listeners on mouseup, not dispose.
      // Block callbacks first, then release a drag interrupted by React unmount.
      if (mouseTracking) doc.dispatchEvent(new win.MouseEvent('mouseup', { bubbles: true }));
      pane.dispose();
    },
  };
}
