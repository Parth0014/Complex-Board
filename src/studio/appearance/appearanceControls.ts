import { capabilities, primaryColor } from '../../vision/appearance/capabilities';
import { appearanceChange, type AppearanceField } from '../../vision/appearance/controls';
import type { EditableItem, Paint, Stroke } from '../../vision/appearance/types';
import type { AppearanceChange } from '../../vision/appearance/update';
import type { StudioAdapter } from '../../vision/contracts';
import type { BindingControl, BindingValue } from './bindingPane';
import { colorBinding } from './bindingOptions';
import { selectedAppearance } from './feature';

export type InspectorArea = 'color' | 'stroke' | 'effects' | 'text';
export type ColorTarget =
  'fill.color' | 'fill.endColor' | 'stroke.color' | 'shadow.color' | 'background';

/** UI values only: derived afresh from the canonical item for each refresh. */
export function controlValues(item: EditableItem, color: (value: string) => string) {
  const a = item.appearance;
  const paint = 'fill' in a ? a.fill.paint : undefined;
  return {
    'fill.color': color(primaryColor(a)),
    'fill.endColor': color(paint && paint.kind !== 'solid' ? paint.stops[1] : primaryColor(a)),
    fillEnabled: 'fill' in a && a.fill.enabled,
    'stroke.color': color(a.stroke.color),
    'stroke.width': a.stroke.width,
    'stroke.style': a.stroke.style,
    strokeCap: a.stroke.cap,
    strokeJoin: a.stroke.join,
    opacity: a.opacity * 100,
    background: color(a.kind === 'text' ? (a.background ?? '#fff3bd') : '#fff3bd'),
    shadowEnabled: a.shadow.enabled,
    'shadow.color': color(a.shadow.color),
    'shadow.opacity': a.shadow.opacity * 100,
    'shadow.blur': a.shadow.blur,
    'shadow.offsetX': a.shadow.offsetX,
    'shadow.offsetY': a.shadow.offsetY,
    'silhouette.width': a.silhouette.width,
    'silhouette.color': color(a.silhouette.color),
  };
}

export function controlChange(
  item: EditableItem,
  key: string,
  value: BindingValue,
): AppearanceChange {
  const a = item.appearance;
  switch (key) {
    case 'fillEnabled':
      if (!('fill' in a)) throw new Error('Open paths have no fill.');
      return { property: 'fill', value: { ...a.fill, enabled: Boolean(value) } };
    case 'fillMode': {
      if (!('fill' in a)) throw new Error('Open paths have no fill.');
      const first = primaryColor(a);
      const paint: Paint =
        value === 'solid'
          ? { kind: 'solid', color: first }
          : {
              kind: value as 'linear' | 'radial',
              stops: [first, a.fill.paint.kind === 'solid' ? first : a.fill.paint.stops[1]],
            };
      return { property: 'fill', value: { ...a.fill, paint } };
    }
    case 'shadowEnabled':
      return { property: 'shadow', value: { enabled: Boolean(value) } };
    case 'strokeCap':
      return { property: 'stroke', value: { cap: value as Stroke['cap'] } };
    case 'strokeJoin':
      return { property: 'stroke', value: { join: value as Stroke['join'] } };
    default:
      return appearanceChange(
        a,
        key as AppearanceField,
        key === 'opacity' || key === 'shadow.opacity' ? Number(value) / 100 : value,
      );
  }
}

/** Discrete React actions use exactly the same typed command projection as bindings. */
export function applyControl(adapter: StudioAdapter, id: string, key: string, value: BindingValue) {
  const current = selectedAppearance(adapter);
  if (!current || current.id !== id || current.locked) return;
  if (adapter.history.gestureActive) adapter.endGesture();
  adapter.changeAppearance(controlChange(current, key, value), [id]);
}

export function technicalControls(item: EditableItem, area: InspectorArea): BindingControl[] {
  const cap = capabilities(item)!;
  const a = item.appearance;
  const group =
    area === 'color' ? 'Color details' : area === 'stroke' ? 'Stroke details' : 'Effects details';
  const control = (
    key: string,
    label: string,
    options?: BindingControl['options'],
  ): BindingControl => ({ key, label, group, options });
  const list: BindingControl[] = [];
  if (area === 'color') {
    if (cap.fill) {
      list.push(control('fillEnabled', 'Enable fill'));
      list.push(
        control('fill.color', a.kind === 'text' ? 'Text fill color' : 'Fill color', colorBinding),
      );
      if ('fill' in a && a.fill.paint.kind !== 'solid')
        list.push(control('fill.endColor', 'Second color', colorBinding));
    } else list.push(control('stroke.color', 'Stroke color', colorBinding));
    if (cap.background && a.kind === 'text' && a.background !== null)
      list.push(control('background', 'Text background', colorBinding));
    list.push(control('opacity', 'Opacity (%)', { min: 0, max: 100, step: 1 }));
  }
  if (area === 'stroke') {
    const prefix =
      cap.strokeMeaning === 'glyph-outline'
        ? 'Text outline'
        : cap.strokeMeaning === 'geometric-border'
          ? 'Border'
          : 'Stroke';
    list.push(control('stroke.color', `${prefix} color`, colorBinding));
    list.push(
      control('stroke.width', `${prefix} width`, {
        min: cap.strokeRange[0],
        max: Math.max(cap.strokeRange[1], a.stroke.width),
        step: 0.5,
      }),
    );
    list.push(
      control('stroke.style', `${prefix} style`, {
        options: { Solid: 'solid', Dashed: 'dashed', Dotted: 'dotted' },
      }),
    );
    if (cap.caps) {
      list.push(
        control('strokeCap', 'Stroke cap', {
          options: { Flat: 'butt', Round: 'round', Square: 'square' },
        }),
      );
      list.push(
        control('strokeJoin', 'Stroke join', {
          options: { Miter: 'miter', Round: 'round', Bevel: 'bevel' },
        }),
      );
    }
  }
  if (area === 'effects' && cap.shadow) {
    list.push(control('shadowEnabled', 'Enable shadow'));
    list.push(control('shadow.color', 'Shadow color', colorBinding));
    list.push(control('shadow.opacity', 'Shadow opacity (%)', { min: 0, max: 100, step: 1 }));
    list.push(
      control('shadow.blur', 'Shadow blur', { min: 0, max: Math.max(100, a.shadow.blur), step: 1 }),
    );
    list.push(control('shadow.offsetX', 'Shadow X', { step: 1 }));
    list.push(control('shadow.offsetY', 'Shadow Y', { step: 1 }));
    if (a.kind === 'text' || a.kind === 'closed-shape') {
      list.push(
        control('silhouette.width', 'Silhouette outline width', {
          min: 0,
          max: Math.max(30, a.silhouette.width),
          step: 0.5,
        }),
      );
      list.push(control('silhouette.color', 'Silhouette outline color', colorBinding));
    }
  }
  for (const definition of list) {
    definition.disabled = (current) => {
      const appearance = current.appearance;
      return (
        (definition.key.startsWith('fill.') && 'fill' in appearance && !appearance.fill.enabled) ||
        (definition.key.startsWith('shadow.') && !appearance.shadow.enabled)
      );
    };
  }
  return list;
}
