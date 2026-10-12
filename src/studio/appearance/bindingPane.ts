import { Pane, type BindingParams, type FolderApi, type InputBindingApi } from 'tweakpane';
import type { StudioAdapter } from '../../vision/contracts';
import type { AppearanceChange } from '../../vision/appearance/update';
import type { EditableItem } from '../../vision/appearance/types';
import type { selectedAppearance } from './feature';
import { TweakpaneSession } from './TweakpaneSession';

export type BindingValue = string | number | boolean;
export interface BindingControl {
  key: string;
  label: string;
  group: string;
  expanded?: boolean;
  options?: BindingParams;
  unavailableOptions?: boolean;
  disabled?(item: EditableItem): boolean;
  hidden?(item: EditableItem): boolean;
}
export interface BindingConfiguration {
  selected: typeof selectedAppearance;
  values(item: EditableItem, pickerColor: (color: string) => string): Record<string, BindingValue>;
  command(item: EditableItem, key: string, value: BindingValue): AppearanceChange;
  controls: readonly BindingControl[];
}

/** Shared imperative bindings, a11y, refresh and event ownership for every appearance kind. */
export function createBindingPane(
  container: HTMLDivElement,
  adapter: StudioAdapter,
  id: string,
  config: BindingConfiguration,
) {
  const doc = container.ownerDocument,
    win = doc.defaultView!;
  const initial = config.selected(adapter);
  if (initial?.id !== id) throw new Error('Select one editable object.');
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
  const params = config.values(initial, pickerColor);
  const pane = new Pane({ container, document: doc });
  const bindings = new Map<
    string,
    Pick<InputBindingApi, 'refresh' | 'element' | 'disabled' | 'hidden'>
  >();
  let refreshing = false,
    disposed = false,
    pointer = false,
    keyboard = false;
  let mouseTracking = false;
  const refresh = () => {
    if (disposed) return;
    const current = config.selected(adapter);
    const valid = current?.id === id;
    refreshing = true;
    try {
      pane.disabled = !valid || !!current.locked;
      if (!valid) return;
      const next = config.values(current, pickerColor);
      for (const [key, binding] of bindings) {
        if (params[key] !== next[key]) {
          Object.assign(params, { [key]: next[key] });
          binding.refresh();
        }
        const definition = config.controls.find((control) => control.key === key)!;
        binding.disabled = definition.disabled?.(current) ?? false;
        binding.hidden = definition.hidden?.(current) ?? false;
        const slider = binding.element.querySelector('[role="slider"]');
        slider?.setAttribute(
          'aria-valuenow',
          String(typeof next[key] === 'number' ? Math.round(next[key]) : next[key]),
        );
      }
    } finally {
      refreshing = false;
    }
  };
  const session = new TweakpaneSession(adapter, id, refresh, config.selected);
  const add = (folder: FolderApi, key: string, label: string, options: BindingParams = {}) => {
    const numeric = typeof params[key] === 'number';
    const binding = folder.addBinding(params, key, {
      label,
      ...options,
      ...(numeric
        ? {
            step: Math.max(1, Number(options.step ?? 1)),
            format: (value: number) => String(Math.round(value)),
          }
        : {}),
    });
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
      slider.setAttribute(
        'aria-valuenow',
        String(typeof params[key] === 'number' ? Math.round(params[key]) : params[key]),
      );
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
      const current = config.selected(adapter);
      if (current?.id !== id || current.locked) return;
      try {
        session.change(
          config.command(current, key, event.value as BindingValue),
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
    const folders = new Map<string, FolderApi>();
    for (const definition of config.controls) {
      let folder = folders.get(definition.group);
      if (!folder) {
        folder = pane.addFolder({ title: definition.group, expanded: definition.expanded ?? true });
        folders.set(definition.group, folder);
      }
      const binding = add(folder, definition.key, definition.label, definition.options);
      if (definition.unavailableOptions)
        binding.element.querySelectorAll('option').forEach((option) => {
          if (option.textContent?.includes('(unavailable)')) option.disabled = true;
        });
    }
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
