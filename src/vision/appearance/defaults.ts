import type { Appearance } from './types';
import { normalizeAppearance } from './validation';

/** New canonical objects use this factory, not the legacy migration boundary. */
export function createAppearance<K extends Appearance['kind']>(
  kind: K,
): Extract<Appearance, { kind: K }> {
  const open = kind === 'open-shape' || kind === 'drawing';
  return normalizeAppearance({
    version: 1,
    kind,
    opacity: 1,
    effect: 'none',
    shadow: { enabled: false, color: '#000000', opacity: 0.25, blur: 0, offsetX: 3, offsetY: 5 },
    silhouette: { width: 0, color: '#ffffff' },
    stroke: {
      color: '#33272b',
      width: open ? 4 : 0,
      style: 'solid',
      cap: open ? 'round' : 'butt',
      join: open || kind === 'text' ? 'round' : 'miter',
      scaling: 'transform',
    },
    ...(!open ? { fill: { enabled: true, paint: { kind: 'solid', color: '#b48ce3' } } } : {}),
    ...(kind === 'text' ? { background: null } : {}),
  }) as Extract<Appearance, { kind: K }>;
}
