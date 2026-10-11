import type { Appearance, Paint, Stroke, Shadow } from './types';

type RecordValue = Record<string, unknown>;
export function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected object.');
  return value as RecordValue;
}
function exact(value: RecordValue, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key)))
    throw new Error('Unknown appearance field.');
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (!choices.includes(value as T)) throw new Error('Invalid appearance enum.');
  return value as T;
}
function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Expected appearance boolean.');
  return value;
}
export function measurement(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error('Invalid appearance measurement.');
  return Object.is(value, -0) ? 0 : value;
}
const namedColors = new Set(
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato transparent turquoise violet wheat white whitesmoke yellow yellowgreen'.split(
    ' ',
  ),
);
/** Browser-independent CSS colors accepted by the existing Konva pipeline. */
export function color(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid appearance color.');
  const normalized = value.trim().toLowerCase();
  if (
    /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/.test(normalized) ||
    namedColors.has(normalized)
  )
    return normalized;
  const match = normalized.match(/^(rgb|rgba|hsl|hsla)\(([^()]+)\)$/);
  if (match) {
    const parts = match[2].split(/\s*,\s*/);
    const count = match[1].endsWith('a') ? 4 : 3;
    if (
      parts.length === count &&
      parts.every((part) => /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)%?$/.test(part))
    ) {
      const hsl = match[1].startsWith('hsl');
      const valid = parts.every((part, index) => {
        const percentage = part.endsWith('%');
        const n = Number.parseFloat(part);
        if (index === 3) return n >= 0 && n <= (percentage ? 100 : 1);
        if (hsl && index === 0) return !percentage && Number.isFinite(n);
        if (hsl && !percentage) return false;
        return n >= 0 && n <= (percentage ? 100 : 255);
      });
      if (valid) return `${match[1]}(${parts.join(',')})`;
    }
  }
  throw new Error('Invalid appearance color.');
}
function paint(value: unknown): Paint {
  const v = record(value);
  if (v.kind === 'solid') {
    exact(v, ['kind', 'color']);
    return { kind: 'solid', color: color(v.color) };
  }
  exact(v, ['kind', 'stops']);
  const kind = choice(v.kind, ['linear', 'radial']);
  if (!Array.isArray(v.stops) || v.stops.length !== 2)
    throw new Error('Exactly two gradient stops required.');
  return { kind, stops: [color(v.stops[0]), color(v.stops[1])] };
}
function stroke(value: unknown): Stroke {
  const v = record(value);
  exact(v, ['color', 'width', 'style', 'cap', 'join', 'scaling']);
  return {
    color: color(v.color),
    width: measurement(v.width, 0, 10000),
    style: choice(v.style, ['solid', 'dashed', 'dotted']),
    cap: choice(v.cap, ['butt', 'round', 'square']),
    join: choice(v.join, ['miter', 'round', 'bevel']),
    scaling: choice(v.scaling, ['transform', 'fixed']),
  };
}
function shadow(value: unknown): Shadow {
  const v = record(value);
  exact(v, ['enabled', 'color', 'opacity', 'blur', 'offsetX', 'offsetY']);
  return {
    enabled: bool(v.enabled),
    color: color(v.color),
    opacity: measurement(v.opacity, 0, 1),
    blur: measurement(v.blur, 0, 10000),
    offsetX: measurement(v.offsetX, -10000, 10000),
    offsetY: measurement(v.offsetY, -10000, 10000),
  };
}
/** Strict schema validation plus deterministic color/numeric normalization. Never mutates input. */
export function normalizeAppearance(value: unknown): Appearance {
  const v = record(value);
  if (v.version !== 1) throw new Error('Unsupported appearance version.');
  const kind = choice(v.kind, ['text', 'closed-shape', 'open-shape', 'drawing']);
  const hasFill = kind === 'text' || kind === 'closed-shape';
  exact(v, [
    'version',
    'kind',
    'opacity',
    'shadow',
    'effect',
    'silhouette',
    'stroke',
    ...(hasFill ? ['fill'] : []),
    ...(kind === 'text' ? ['background'] : []),
  ]);
  const silhouette = record(v.silhouette);
  exact(silhouette, ['width', 'color']);
  const base = {
    version: 1 as const,
    opacity: measurement(v.opacity, 0, 1),
    shadow: shadow(v.shadow),
    effect: choice(v.effect, ['none', 'glow', 'echo', 'outline', 'glitch']),
    silhouette: { width: measurement(silhouette.width, 0, 30), color: color(silhouette.color) },
    stroke: stroke(v.stroke),
  };
  if (kind === 'drawing' || kind === 'open-shape') return { ...base, kind };
  const f = record(v.fill);
  exact(f, ['enabled', 'paint']);
  const fill = { enabled: bool(f.enabled), paint: paint(f.paint) };
  return kind === 'text'
    ? { ...base, kind, fill, background: v.background === null ? null : color(v.background) }
    : { ...base, kind, fill };
}
