type Point = { x: number; y: number };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}
function simplify(points: Point[], tolerance: number): Point[] {
  // Iterative RDP avoids recursion overflow on long strokes.
  const keep = new Set([0, points.length - 1]);
  const pending = [[0, points.length - 1]];
  while (pending.length) {
    const [start, end] = pending.pop()!;
    let greatest = tolerance,
      split = -1;
    for (let i = start + 1; i < end; i++) {
      const error = segmentDistance(points[i], points[start], points[end]);
      if (error > greatest) {
        greatest = error;
        split = i;
      }
    }
    if (split >= 0) {
      keep.add(split);
      pending.push([start, split], [split, end]);
    }
  }
  return [...keep].sort((a, b) => a - b).map((i) => points[i]);
}

const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function intersects(points: Point[]) {
  const reduced = simplify(points, 1);
  for (let i = 0; i < reduced.length - 1; i++)
    for (let j = i + 2; j < reduced.length - 1; j++) {
      if (i === 0 && j === reduced.length - 2) continue;
      const a = reduced[i],
        b = reduced[i + 1],
        c = reduced[j],
        d = reduced[j + 1];
      if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return true;
    }
  return false;
}

function fitRectangle(points: Point[], size: number): Point[] | undefined {
  const reduced = simplify(points, size * 0.045);
  for (let i = 1; i < reduced.length; i++) {
    if (distance(reduced[i - 1], reduced[i]) < size * 0.2) continue;
    const angle = Math.atan2(reduced[i].y - reduced[i - 1].y, reduced[i].x - reduced[i - 1].x);
    const c = Math.cos(angle),
      s = Math.sin(angle);
    const rotated = points.map((p) => ({ x: p.x * c + p.y * s, y: -p.x * s + p.y * c }));
    const minX = Math.min(...rotated.map((p) => p.x)),
      maxX = Math.max(...rotated.map((p) => p.x));
    const minY = Math.min(...rotated.map((p) => p.y)),
      maxY = Math.max(...rotated.map((p) => p.y));
    if (Math.min(maxX - minX, maxY - minY) < size * 0.12) continue;
    const corners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
    const errors = rotated.map((p) => Math.min(p.x - minX, maxX - p.x, p.y - minY, maxY - p.y));
    if (
      errors.reduce((sum, e) => sum + e, 0) / errors.length > size * 0.027 ||
      Math.max(...errors) > size * 0.075
    )
      continue;
    if (!corners.every((corner) => rotated.some((p) => distance(corner, p) < size * 0.11)))
      continue;
    return corners
      .concat([corners[0]])
      .map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  }
}

function fitTriangle(points: Point[], size: number): Point[] | undefined {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const half = (list: Point[]) => {
    const result: Point[] = [];
    for (const p of list) {
      while (
        result.length > 1 &&
        cross(result[result.length - 2], result[result.length - 1], p) <= 0
      )
        result.pop();
      result.push(p);
    }
    return result.slice(0, -1);
  };
  const hull = half(sorted).concat(half([...sorted].reverse()));
  if (hull.length < 3) return;
  let corners = simplify(hull.concat([hull[0]]), size * 0.055).slice(0, -1);
  // Remove an extra vertex when the hull starts in the middle of a side.
  if (corners.length === 4 && segmentDistance(corners[0], corners[1], corners[3]) < size * 0.055)
    corners = corners.slice(1);
  if (
    corners.length !== 3 ||
    Math.abs(cross(corners[0], corners[1], corners[2])) < size * size * 0.12
  )
    return;
  const errors = points.map((p) =>
    Math.min(...corners.map((corner, i) => segmentDistance(p, corner, corners[(i + 1) % 3]))),
  );
  if (
    errors.reduce((sum, e) => sum + e, 0) / errors.length > size * 0.028 ||
    Math.max(...errors) > size * 0.08
  )
    return;
  return corners.concat([corners[0]]);
}

/** Local geometry only. Never force unfamiliar contours into a preset shape. */
export function assistStroke(raw: number[]): {
  points: number[];
  tension: number;
  recognized: 'line' | 'ellipse' | 'rectangle' | 'triangle' | 'outline';
} {
  const points: Point[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const p = { x: raw[i], y: raw[i + 1] };
    if (
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      (!points.length || distance(p, points[points.length - 1]) > 0.05)
    )
      points.push(p);
  }
  if (points.length < 2) return { points: raw.slice(), tension: 0, recognized: 'outline' };
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const left = Math.min(...xs),
    top = Math.min(...ys),
    width = Math.max(...xs) - left,
    height = Math.max(...ys) - top;
  const size = Math.hypot(width, height);
  const tolerance = Math.max(0.3, size * 0.012);
  const length = points.slice(1).reduce((sum, p, i) => sum + distance(p, points[i]), 0);
  const first = points[0],
    last = points[points.length - 1];
  const chord = distance(first, last);
  const closed = points.length >= 5 && chord < size * 0.22;
  let output: Point[];
  let recognized: 'line' | 'ellipse' | 'rectangle' | 'triangle' | 'outline' = 'outline';
  let tension = 0;
  if (
    !closed &&
    chord > size * 0.75 &&
    length < chord * 1.12 &&
    points.every((p) => segmentDistance(p, first, last) < size * 0.035)
  ) {
    output = [first, last];
    recognized = 'line';
  } else {
    // Equal arc-length sampling prevents slow corners from dominating ellipse confidence.
    const samples: Point[] = [first];
    const step = length / 96;
    let next = step,
      travelled = 0;
    for (let i = 1; i < points.length; i++) {
      const segment = distance(points[i - 1], points[i]);
      while (segment > 0 && next <= travelled + segment && samples.length < 100) {
        const t = (next - travelled) / segment;
        samples.push({
          x: points[i - 1].x + t * (points[i].x - points[i - 1].x),
          y: points[i - 1].y + t * (points[i].y - points[i - 1].y),
        });
        next += step;
      }
      travelled += segment;
    }
    const cx = left + width / 2,
      cy = top + height / 2;
    const radial = samples.map((p) =>
      Math.abs(Math.hypot((p.x - cx) / (width / 2 || 1), (p.y - cy) / (height / 2 || 1)) - 1),
    );
    const bins = new Set(
      samples.map((p) =>
        Math.floor(
          ((Math.atan2((p.y - cy) / (height || 1), (p.x - cx) / (width || 1)) + Math.PI) /
            (Math.PI * 2)) *
            16,
        ),
      ),
    );
    const a = width / 2,
      b = height / 2;
    const perimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    const crossing = intersects(samples);
    const rectangle = closed && !crossing ? fitRectangle(samples, size) : undefined;
    const triangle = closed && !crossing && !rectangle ? fitTriangle(samples, size) : undefined;
    if (
      closed &&
      !crossing &&
      Math.min(width, height) > 4 &&
      !rectangle &&
      !triangle &&
      radial.reduce((sum, e) => sum + e, 0) / radial.length < 0.115 &&
      Math.max(...radial) < 0.32 &&
      bins.size >= 14 &&
      length / perimeter > 0.72 &&
      length / perimeter < 1.3
    ) {
      const start = Math.atan2((first.y - cy) / b, (first.x - cx) / a);
      output = Array.from({ length: 65 }, (_, i) => ({
        x: cx + a * Math.cos(start + (i * Math.PI) / 32),
        y: cy + b * Math.sin(start + (i * Math.PI) / 32),
      }));
      recognized = 'ellipse';
    } else if (rectangle || triangle) {
      output = (rectangle || triangle)!;
      recognized = rectangle ? 'rectangle' : 'triangle';
    } else {
      const reduced = simplify(points, tolerance);
      const reducedLength = reduced
        .slice(1)
        .reduce((sum, p, i) => sum + distance(p, reduced[i]), 0);
      // Retain corners for polygons, arrows, stars, and irregular angular outlines.
      if (reducedLength < length * 0.8) output = points;
      else if (reduced.length <= 14) output = reduced;
      else {
        output = simplify(samples.concat([last]), tolerance * 0.4);
        tension = 0.25;
      }
    }
  }
  return { points: output.flatMap((p) => [p.x, p.y]), tension, recognized };
}
