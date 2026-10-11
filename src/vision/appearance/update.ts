import type { TextStyle } from '../text';
import { capabilities, primaryColor } from './capabilities';
import type {
  Appearance,
  CanonicalDocument,
  CanonicalItem,
  Effect,
  Fill,
  Paint,
  Shadow,
  Stroke,
} from './types';
import { color, normalizeAppearance } from './validation';

export type AppearanceChange =
  | { property: 'style'; value: Appearance }
  | { property: 'opacity'; value: number }
  | { property: 'fill'; value: Fill }
  | { property: 'stroke'; value: Partial<Stroke> }
  | { property: 'shadow'; value: Partial<Shadow> }
  | { property: 'background'; value: string | null }
  | { property: 'effect'; value: Effect }
  | { property: 'silhouette'; value: Partial<Appearance['silhouette']> };

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) throw new Error('Invalid appearance measurement.');
  return Math.max(min, Math.min(max, value));
}

/** Sole appearance write pathway. The adapter commits the resulting snapshot to existing history. */
export function updateAppearance(
  document: CanonicalDocument,
  selectedIds: readonly string[],
  id: string,
  change: AppearanceChange,
): CanonicalDocument {
  if (!selectedIds.includes(id)) return document;
  const item = document.items.find((item) => item.id === id);
  if (!item || item.kind === 'asset' || item.locked) return document;
  const cap = capabilities(item)!;
  const next = structuredClone(item.appearance);
  switch (change.property) {
    case 'style': {
      const style = normalizeAppearance(change.value);
      if (style.kind !== next.kind)
        throw new Error('Style requires matching appearance semantics.');
      Object.assign(next, style, { stroke: { ...style.stroke, scaling: next.stroke.scaling } });
      break;
    }
    case 'opacity':
      next.opacity = clamp(change.value, 0, 1);
      break;
    case 'fill':
      if (!('fill' in next)) throw new Error('Open paths have no editable fill.');
      if (
        change.value.paint.kind !== 'solid' &&
        !cap.gradient &&
        JSON.stringify(change.value.paint) !== JSON.stringify(next.fill.paint)
      )
        throw new Error('Gradient editing requires verified text-branch rendering.');
      next.fill = structuredClone(change.value);
      break;
    case 'stroke': {
      if ('scaling' in change.value && change.value.scaling !== next.stroke.scaling)
        throw new Error('Stroke scaling is a geometry contract.');
      if (!cap.caps && 'cap' in change.value) throw new Error('Stroke caps apply to open paths.');
      next.stroke = { ...next.stroke, ...change.value };
      if ('width' in change.value)
        next.stroke.width = clamp(change.value.width!, cap.strokeRange[0], cap.strokeRange[1]);
      if (next.effect === 'outline') next.effect = 'none';
      break;
    }
    case 'shadow':
      if (!cap.shadow) throw new Error('Shadow is unsupported for line/arrow.');
      next.shadow = { ...next.shadow, ...change.value };
      if (next.effect === 'glow') next.effect = 'none';
      break;
    case 'background':
      if (next.kind !== 'text') throw new Error('Background applies to text only.');
      next.background = change.value;
      break;
    case 'effect':
      if (!cap.effects.includes(change.value))
        throw new Error('Effect unsupported for this object.');
      if (change.value !== 'glow' && next.effect === 'glow') next.shadow.enabled = false;
      if (change.value !== 'outline' && next.effect === 'outline') next.stroke.width = 0;
      next.effect = change.value;
      // Presets materialize real values; rendering will not resolve competing fallbacks.
      if (change.value === 'outline') next.stroke.width = Math.max(2, next.stroke.width);
      if (change.value === 'glow')
        next.shadow = {
          enabled: true,
          color: primaryColor(next),
          opacity: 0.8,
          blur: 20,
          offsetX: 0,
          offsetY: 0,
        };
      break;
    case 'silhouette':
      next.silhouette = { ...next.silhouette, ...change.value };
      break;
    default:
      throw new Error('Unknown appearance update.');
  }
  const appearance = normalizeAppearance(next);
  if (JSON.stringify(appearance) === JSON.stringify(normalizeAppearance(item.appearance)))
    return document;
  const replacement = { ...item, appearance } as CanonicalItem;
  // Keep the active-page working mirror synchronized without changing page identity/geometry.
  return {
    ...document,
    items: document.items.map((entry) => (entry.id === id ? replacement : entry)),
    ...(document.pages
      ? {
          pages: document.pages.map((page) =>
            page.id === document.activePageId
              ? {
                  ...page,
                  items: page.items.map((entry) => (entry.id === id ? replacement : entry)),
                }
              : page,
          ),
        }
      : {}),
  };
}

/** Explicit character formatting, including false values, takes precedence. No run mutation. */
export function resolveTextStyle(
  item: Extract<CanonicalItem, { kind: 'text' }>,
  index: number,
): TextStyle {
  const run = item.textRuns?.find((run) => index >= run.start && index < run.end);
  const paint = resolveTextPaint(item, index);
  return {
    bold: item.bold,
    italic: item.italic,
    underline: item.underline,
    strike: item.strike,
    script: 'normal',
    color: paint.kind === 'solid' ? paint.color : paint.stops[0],
    ...(run
      ? Object.fromEntries(
          Object.entries(run).filter(
            ([key, value]) =>
              ['bold', 'italic', 'underline', 'strike', 'script'].includes(key) &&
              value !== undefined,
          ),
        )
      : {}),
  };
}

/** A run color is solid paint; otherwise retain the object's two-color gradient. */
export function resolveTextPaint(
  item: Extract<CanonicalItem, { kind: 'text' }>,
  index: number,
): Paint {
  const run = item.textRuns?.find((run) => index >= run.start && index < run.end);
  return run?.color !== undefined
    ? { kind: 'solid', color: color(run.color) }
    : structuredClone(item.appearance.fill.paint);
}
