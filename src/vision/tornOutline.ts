export const TORN_SIDES = ['top', 'right', 'bottom', 'left'] as const;
export type TornSide = (typeof TORN_SIDES)[number];
export type TornPreset = 'gentle' | 'deep' | 'strip';
export interface TornOutline {
  preset: TornPreset | 'custom';
  edges: TornSide[];
  points: Record<TornSide, number[]>;
  roughness: number;
  seed: number;
}

export function tornOutlinePreset(preset: TornPreset): TornOutline {
  const sides =
    preset === 'deep'
      ? [
          [0, 0.08, 0.19, 0.05, 0],
          [0, 0.07, 0.23, 0.1, 0],
          [0, 0.04, 0.13, 0.08, 0],
          [0, 0.16, 0.07, 0.18, 0],
        ]
      : preset === 'strip'
        ? [
            [0, 0, 0, 0, 0],
            [0, 0.14, 0.06, 0.17, 0],
            [0, 0, 0, 0, 0],
            [0, 0.04, 0.17, 0.07, 0],
          ]
        : [
            [0, 0.025, 0.045, 0.02, 0],
            [0, 0.03, 0.07, 0.025, 0],
            [0, 0.02, 0.04, 0.03, 0],
            [0, 0.055, 0.025, 0.06, 0],
          ];
  return {
    preset,
    edges: preset === 'strip' ? ['left', 'right'] : [...TORN_SIDES],
    points: Object.fromEntries(
      TORN_SIDES.map((side, i) => [side, sides[i]]),
    ) as TornOutline['points'],
    roughness: preset === 'deep' ? 0.85 : 0.55,
    seed: 17,
  };
}

export function validateTornOutline(value: unknown): asserts value is TornOutline {
  const outline = value as TornOutline;
  if (
    !outline ||
    typeof outline !== 'object' ||
    !['gentle', 'deep', 'strip', 'custom'].includes(outline.preset) ||
    !Array.isArray(outline.edges) ||
    new Set(outline.edges).size !== outline.edges.length ||
    outline.edges.some((side) => !TORN_SIDES.includes(side)) ||
    !Number.isFinite(outline.roughness) ||
    outline.roughness < 0 ||
    outline.roughness > 1 ||
    !Number.isInteger(outline.seed) ||
    outline.seed < 0 ||
    outline.seed > 1000000 ||
    !outline.points ||
    TORN_SIDES.some(
      (side) =>
        !Array.isArray(outline.points[side]) ||
        outline.points[side].length !== 5 ||
        outline.points[side][0] !== 0 ||
        outline.points[side][4] !== 0 ||
        outline.points[side].some((n) => !Number.isFinite(n) || n < 0 || n > 0.4),
    )
  )
    throw new Error('Invalid torn-photo outline.');
}

function bend(points: number[], t: number) {
  const position = Math.min(3.999999, t * 4),
    i = Math.floor(position),
    f = position - i;
  const a = points[Math.max(0, i - 1)],
    b = points[i],
    c = points[i + 1],
    d = points[Math.min(4, i + 2)];
  return Math.max(
    0,
    Math.min(
      0.4,
      0.5 *
        (2 * b +
          (-a + c) * f +
          (2 * a - 5 * b + 4 * c - d) * f * f +
          (-a + 3 * b - 3 * c + d) * f * f * f),
    ),
  );
}

export function tornEdgePoint(
  outline: TornOutline,
  side: TornSide,
  t: number,
  width: number,
  height: number,
  jagged = false,
) {
  let offset = outline.edges.includes(side) ? bend(outline.points[side], t) : 0;
  if (jagged && outline.edges.includes(side) && t > 0 && t < 1) {
    const n =
      Math.sin(
        (Math.round(t * 10000) + outline.seed * 37 + TORN_SIDES.indexOf(side) * 911) * 127.1,
      ) * 43758.5453;
    const length = side === 'left' || side === 'right' ? width : height;
    offset = Math.max(
      0,
      Math.min(
        0.4,
        offset +
          ((n - Math.floor(n) - 0.5) *
            outline.roughness *
            Math.min(12, Math.min(width, height) * 0.025)) /
            length,
      ),
    );
  }
  // Taper each corner so adjacent edges cannot cross when both are pulled inward.
  offset = Math.min(offset, Math.min(t, 1 - t) * 0.75);
  return side === 'top'
    ? { x: t * width, y: offset * height }
    : side === 'bottom'
      ? { x: t * width, y: (1 - offset) * height }
      : side === 'left'
        ? { x: offset * width, y: t * height }
        : { x: (1 - offset) * width, y: t * height };
}

/** All geometry is normalized: moving or resizing never picks a new tear. */
export function tornOutlinePoints(
  outline: TornOutline,
  width: number,
  height: number,
  jagged = true,
): number[] {
  const points: number[] = [];
  for (const side of TORN_SIDES) {
    const segments = jagged ? 160 : 40;
    for (let i = 0; i <= segments; i++) {
      const t = side === 'bottom' || side === 'left' ? 1 - i / segments : i / segments;
      const point = tornEdgePoint(outline, side, t, width, height, jagged);
      points.push(point.x, point.y);
    }
  }
  return points;
}
