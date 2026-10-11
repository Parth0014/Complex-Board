import type { AppearanceChange } from './update';
import type { Appearance, CanonicalItem, Effect, Stroke } from './types';
import { primaryColor } from './capabilities';

/** Existing controls bind to canonical fields; these are UI projections, never document fields. */
export type AppearanceField =
  | 'opacity'
  | 'fill.color'
  | 'fill.endColor'
  | 'fill.kind'
  | 'fill.disabled'
  | 'stroke.width'
  | 'stroke.color'
  | 'stroke.style'
  | 'shadow.preset'
  | 'shadow.color'
  | 'shadow.opacity'
  | 'shadow.blur'
  | 'shadow.offsetX'
  | 'shadow.offsetY'
  | 'silhouette.width'
  | 'silhouette.color'
  | 'background'
  | 'effect';

export function appearanceValue(item: CanonicalItem, field: AppearanceField): unknown {
  if (item.kind === 'asset') throw new Error('Assets use their existing media controls.');
  const a = item.appearance;
  const paint = 'fill' in a ? a.fill.paint : undefined;
  switch (field) {
    case 'fill.color':
      return primaryColor(a);
    case 'fill.endColor':
      return paint && paint.kind !== 'solid' ? paint.stops[1] : undefined;
    case 'fill.kind':
      return paint?.kind;
    case 'fill.disabled':
      return 'fill' in a ? !a.fill.enabled : undefined;
    case 'background':
      return a.kind === 'text' ? a.background : undefined;
    case 'opacity':
      return a.opacity;
    case 'effect':
      return a.effect;
    case 'shadow.preset':
      return !a.shadow.enabled
        ? 'none'
        : a.shadow.blur === 20
          ? 'soft'
          : a.shadow.blur === 10
            ? 'medium'
            : a.shadow.blur === 0 && a.shadow.offsetX === 6 && a.shadow.offsetY === 6
              ? 'hard'
              : 'custom';
    default: {
      const [group, key] = field.split('.') as ['stroke' | 'shadow' | 'silhouette', string];
      return (a[group] as unknown as Record<string, unknown>)[key];
    }
  }
}

export function appearanceChange(
  a: Appearance,
  field: AppearanceField,
  value: unknown,
): AppearanceChange {
  const paint = 'fill' in a ? a.fill.paint : undefined;
  switch (field) {
    case 'opacity':
      return { property: 'opacity', value: Number(value) };
    case 'effect':
      return { property: 'effect', value: value as Effect };
    case 'background':
      return { property: 'background', value: value ? String(value) : null };
    case 'fill.color':
      if (!paint) return { property: 'stroke', value: { color: String(value) } };
      return {
        property: 'fill',
        value: {
          enabled: 'fill' in a && a.fill.enabled,
          paint:
            paint.kind === 'solid'
              ? { kind: 'solid', color: String(value) }
              : { ...paint, stops: [String(value), paint.stops[1]] },
        },
      };
    case 'fill.endColor':
      if (!paint) throw new Error('Open paths have no gradients.');
      return {
        property: 'fill',
        value: {
          enabled: value === undefined ? 'fill' in a && a.fill.enabled : true,
          paint:
            value === undefined
              ? { kind: 'solid', color: primaryColor(a) }
              : {
                  kind: paint.kind === 'radial' ? 'radial' : 'linear',
                  stops: [primaryColor(a), String(value)],
                },
        },
      };
    case 'fill.kind':
      if (!paint || paint.kind === 'solid') throw new Error('Select a gradient first.');
      return {
        property: 'fill',
        value: {
          enabled: 'fill' in a && a.fill.enabled,
          paint: { ...paint, kind: value as 'linear' | 'radial' },
        },
      };
    case 'fill.disabled':
      if (!paint) throw new Error('Open paths have no fill.');
      return { property: 'fill', value: { enabled: !value, paint } };
    case 'shadow.preset':
      return {
        property: 'shadow',
        value: {
          enabled: value !== 'none',
          color: '#000000',
          opacity: 0.25,
          blur: value === 'soft' ? 20 : value === 'medium' ? 10 : 0,
          offsetX: value === 'hard' ? 6 : 3,
          offsetY: value === 'hard' ? 6 : 5,
        },
      };
    case 'stroke.width':
      return { property: 'stroke', value: { width: Number(value) } };
    case 'stroke.color':
      return { property: 'stroke', value: { color: String(value) } };
    case 'stroke.style':
      return { property: 'stroke', value: { style: value as Stroke['style'] } };
    default: {
      const [group, key] = field.split('.') as ['shadow' | 'silhouette', string];
      return group === 'shadow'
        ? { property: 'shadow', value: { enabled: true, [key]: value } }
        : { property: 'silhouette', value: { [key]: value } };
    }
  }
}
