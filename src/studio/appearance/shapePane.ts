import type { StudioAdapter } from '../../vision/contracts';
import type { ClosedShapeAppearance } from '../../vision/appearance/types';
import type { AppearanceChange } from '../../vision/appearance/update';
import { selectedQuickShape } from './feature';
import { createBindingPane, type BindingControl } from './bindingPane';
import { colorBinding } from './bindingOptions';

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
  const initial = selectedQuickShape(adapter);
  if (!initial || initial.id !== id) throw new Error('Select one closed Quick Shape.');
  const controls: BindingControl[] = [
    { key: 'fillEnabled', label: 'Enable fill', group: 'Fill' },
    {
      key: 'fillMode',
      label: 'Fill type',
      group: 'Fill',
      options: { options: { Solid: 'solid', Linear: 'linear', Radial: 'radial' } },
    },
    { key: 'fillColor', label: 'Fill color', group: 'Fill', options: colorBinding },
    { key: 'endColor', label: 'Second color', group: 'Fill', options: colorBinding },
    { key: 'borderColor', label: 'Border color', group: 'Border', options: colorBinding },
    {
      key: 'borderWidth',
      label: 'Border width',
      group: 'Border',
      options: { min: 0, max: Math.max(30, initial.appearance.stroke.width), step: 0.5 },
    },
    {
      key: 'borderStyle',
      label: 'Border style',
      group: 'Border',
      options: { options: { Solid: 'solid', Dashed: 'dashed', Dotted: 'dotted' } },
    },
    {
      key: 'opacity',
      label: 'Opacity (%)',
      group: 'Appearance',
      options: { min: 0, max: 100, step: 1 },
    },
    {
      key: 'effect',
      label: 'Effect',
      group: 'Appearance',
      unavailableOptions: true,
      options: {
        options: {
          None: 'none',
          Glow: 'glow',
          Outline: 'outline',
          'Echo (unavailable)': 'echo',
          'Glitch (unavailable)': 'glitch',
        },
      },
    },
    { key: 'shadowEnabled', label: 'Enable shadow', group: 'Shadow', expanded: false },
    { key: 'shadowColor', label: 'Shadow color', group: 'Shadow', options: colorBinding },
    {
      key: 'shadowOpacity',
      label: 'Shadow opacity (%)',
      group: 'Shadow',
      options: { min: 0, max: 100, step: 1 },
    },
    {
      key: 'shadowBlur',
      label: 'Shadow blur',
      group: 'Shadow',
      options: { min: 0, max: Math.max(100, initial.appearance.shadow.blur), step: 1 },
    },
    { key: 'shadowX', label: 'Shadow X', group: 'Shadow', options: { step: 1 } },
    { key: 'shadowY', label: 'Shadow Y', group: 'Shadow', options: { step: 1 } },
  ];
  for (const control of controls) {
    control.disabled = (item) =>
      item.appearance.kind === 'closed-shape' &&
      ((['fillMode', 'fillColor', 'endColor'].includes(control.key) &&
        !item.appearance.fill.enabled) ||
        (control.key === 'endColor' && item.appearance.fill.paint.kind === 'solid') ||
        (control.key.startsWith('shadow') &&
          control.key !== 'shadowEnabled' &&
          !item.appearance.shadow.enabled));
    control.hidden = (item) =>
      item.appearance.kind === 'closed-shape' &&
      control.key === 'endColor' &&
      item.appearance.fill.paint.kind === 'solid';
  }
  return createBindingPane(container, adapter, id, {
    selected: selectedQuickShape,
    controls,
    values: (item, color) => {
      if (item.appearance.kind !== 'closed-shape') throw new Error('Closed shape required.');
      return values(item.appearance, color);
    },
    command: (item, key, value) => {
      if (item.appearance.kind !== 'closed-shape') throw new Error('Closed shape required.');
      return shapeControlChange(
        item.appearance,
        key as keyof Values,
        value as Values[keyof Values],
      );
    },
  });
}
