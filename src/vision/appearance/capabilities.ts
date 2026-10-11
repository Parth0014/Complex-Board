import type { Appearance, CanonicalItem, Effect } from './types';

export function capabilities(item: CanonicalItem) {
  if (item.kind === 'asset') return undefined;
  const a = item.appearance;
  return {
    fill: a.kind === 'text' || a.kind === 'closed-shape',
    gradient:
      a.kind === 'closed-shape' ||
      (a.kind === 'text' &&
        !item.curve &&
        !item.textRuns?.length &&
        item.kerning !== false &&
        item.ligatures !== false),
    background: a.kind === 'text',
    strokeMeaning:
      a.kind === 'text'
        ? 'glyph-outline'
        : a.kind === 'closed-shape'
          ? 'geometric-border'
          : 'open-path',
    strokeRange: a.kind === 'drawing' ? ([1, 50] as const) : ([0, 30] as const),
    caps: a.kind === 'drawing' || a.kind === 'open-shape',
    // Line/arrow never consumed common shadows/effects in the old renderer.
    shadow: a.kind !== 'open-shape',
    effects: (a.kind === 'text'
      ? item.textRuns?.length || item.kerning === false || item.ligatures === false
        ? ['none', 'glow', 'outline']
        : ['none', 'glow', 'outline', 'echo', 'glitch']
      : a.kind === 'closed-shape'
        ? ['none', 'glow', 'outline']
        : a.kind === 'drawing'
          ? ['none', 'glow']
          : ['none']) as readonly Effect[],
  };
}

export function primaryColor(a: Appearance): string {
  if ('fill' in a)
    return a.fill.paint.kind === 'solid' ? a.fill.paint.color : a.fill.paint.stops[0];
  return a.stroke.color;
}
