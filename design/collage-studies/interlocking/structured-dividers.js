/* V3: change layout parameters, never freely pull individual mesh vertices. */
(() => {
  const TAU = Math.PI * 2,
    PI = Math.PI;
  const area = (p) =>
    Math.abs(
      p.reduce((s, a, i) => {
        const b = p[(i + 1) % p.length];
        return s + a[0] * b[1] - a[1] * b[0];
      }, 0),
    ) / 2;
  const bounds = (p) => {
    const x = Math.min(...p.map((v) => v[0])),
      y = Math.min(...p.map((v) => v[1]));
    return { x, y, w: Math.max(...p.map((v) => v[0])) - x, h: Math.max(...p.map((v) => v[1])) - y };
  };
  const rect = (x, y, w, h) => [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const centroid = (p) => {
    let s = 0,
      x = 0,
      y = 0;
    p.forEach((a, i) => {
      const b = p[(i + 1) % p.length],
        k = a[0] * b[1] - a[1] * b[0];
      s += k;
      x += (a[0] + b[0]) * k;
      y += (a[1] + b[1]) * k;
    });
    return [x / (3 * s), y / (3 * s)];
  };
  const triangle = (x) => (2 / PI) * Math.asin(Math.sin(x));
  const warps = {
    tide: (x, y) => [x, y + 0.055 * Math.sin(PI * y) * Math.sin(TAU * x)],
    river: (x, y) => [x + 0.075 * Math.sin(PI * x) * Math.sin(TAU * y), y],
    arcade: (x, y) => [x, y + 0.062 * Math.sin(PI * y) * Math.cos(TAU * x)],
    silk: (x, y) => [
      x + 0.045 * Math.sin(PI * x) * Math.sin(3 * PI * y),
      y + 0.035 * Math.sin(PI * y) * Math.sin(TAU * x),
    ],
    scallop: (x, y) => [x, y + 0.06 * Math.sin(PI * y) * Math.sin(3 * PI * x)],
    ribbon: (x, y) => [
      x + 0.055 * Math.sin(PI * x) * Math.cos(TAU * y),
      y + 0.035 * Math.sin(PI * y) * Math.sin(PI * x),
    ],
    chevron: (x, y) => [x, y + 0.075 * Math.sin(PI * y) * triangle(TAU * x)],
    fold: (x, y) => [x + 0.08 * Math.sin(PI * x) * (2 * y - 1), y],
    kite: (x, y) => [
      x + 0.055 * Math.sin(PI * x) * triangle(TAU * y),
      y + 0.045 * Math.sin(PI * y) * triangle(TAU * x),
    ],
  };
  function mosaic(n, r, variant = 0, transpose = false) {
    let best;
    for (let rows = 2; rows <= Math.ceil(n / 2); rows++) {
      const counts = Array.from(
        { length: rows },
        (_, i) => Math.floor(n / rows) + (i < n % rows ? 1 : 0),
      );
      const score = counts.reduce((s, k) => s + k * Math.log((r * rows) / k / 0.9) ** 2, 0) / n;
      if (!best || score < best.score) best = { counts, score };
    }
    if (variant % 2) best.counts.reverse();
    return {
      axis: transpose ? 'x' : 'y',
      weights: best.counts.map(() => 1),
      children: best.counts.map((k, i) => ({
        axis: transpose ? 'y' : 'x',
        weights: Array.from({ length: k }, (_, j) =>
          variant ? 1 + 0.18 * Math.sin((j + i) * 2.1 + variant) : 1,
        ),
        children: Array(k).fill(null),
      })),
    };
  }
  function split(n, w, h, depth = 0) {
    if (n === 1) return null;
    const a = Math.floor(n / 2),
      t = a / n,
      axis = w > h * (depth % 2 ? 1.15 : 0.85) ? 'x' : 'y';
    return {
      axis,
      weights: [a, n - a],
      children:
        axis === 'x'
          ? [split(a, w * t, h, depth + 1), split(n - a, w * (1 - t), h, depth + 1)]
          : [split(a, w, h * t, depth + 1), split(n - a, w, h * (1 - t), depth + 1)],
    };
  }
  function clip(poly, a, b, c) {
    const out = [];
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length],
        u = a * p[0] + b * p[1] - c,
        v = a * q[0] + b * q[1] - c;
      if (u <= 1e-10) out.push(p);
      if ((u < 0 && v > 0) || (u > 0 && v < 0)) {
        const t = u / (u - v);
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    });
    return out;
  }
  function power(seeds, r, weights) {
    return seeds.map((p, i) =>
      seeds.reduce(
        (poly, q, j) =>
          i === j
            ? poly
            : clip(
                poly,
                2 * (q[0] - p[0]) * r * r,
                2 * (q[1] - p[1]),
                (q[0] ** 2 - p[0] ** 2) * r * r + q[1] ** 2 - p[1] ** 2 + weights[i] - weights[j],
              ),
        rect(0, 0, 1, 1),
      ),
    );
  }
  function boxes(tree, params) {
    const leaves = [],
      rails = [];
    function visit(node, b, path) {
      if (!node) {
        leaves.push(b);
        return;
      }
      const total = node.weights.reduce((a, b) => a + b, 0),
        cuts = [0];
      let sum = 0;
      node.weights.slice(0, -1).forEach((weight, i) => {
        sum += weight;
        cuts.push(params.cuts[`${path}:${i}`] ?? sum / total);
      });
      cuts.push(1);
      for (let i = 1; i < cuts.length; i++)
        if (cuts[i] - cuts[i - 1] < 0.025) throw Error('A photo group is too narrow.');
      const start = leaves.length;
      node.children.forEach((child, i) => {
        const part =
          node.axis === 'x'
            ? { x: b.x + b.w * cuts[i], y: b.y, w: b.w * (cuts[i + 1] - cuts[i]), h: b.h }
            : { x: b.x, y: b.y + b.h * cuts[i], w: b.w, h: b.h * (cuts[i + 1] - cuts[i]) };
        visit(child, part, `${path}.${i}`);
      });
      node.weights.slice(0, -1).forEach((_, i) =>
        rails.push({
          key: `${path}:${i}`,
          axis: node.axis,
          box: b,
          value: cuts[i + 1],
          cells: Array.from({ length: leaves.length - start }, (_, j) => start + j),
        }),
      );
    }
    visit(tree, { x: 0, y: 0, w: 1, h: 1 }, 'root');
    return { leaves, rails };
  }
  function buildRails(model, params) {
    const { leaves, rails } = boxes(model.tree, params),
      warp = warps[model.design.id];
    const xs = [
      ...new Set([
        ...Array.from({ length: 241 }, (_, i) => i / 240),
        ...leaves.flatMap((b) => [b.x, b.x + b.w]),
      ]),
    ].sort((a, b) => a - b);
    const ys = [
      ...new Set([
        ...Array.from({ length: 241 }, (_, i) => i / 240),
        ...leaves.flatMap((b) => [b.y, b.y + b.h]),
      ]),
    ].sort((a, b) => a - b);
    const polygons = leaves.map((b) => {
      const x = xs.filter((x) => x >= b.x - 1e-10 && x <= b.x + b.w + 1e-10),
        y = ys.filter((y) => y >= b.y - 1e-10 && y <= b.y + b.h + 1e-10);
      return [
        ...x.map((x) => [x, b.y]),
        ...y.slice(1).map((y) => [b.x + b.w, y]),
        ...x
          .slice(0, -1)
          .reverse()
          .map((x) => [x, b.y + b.h]),
        ...y
          .slice(1, -1)
          .reverse()
          .map((y) => [b.x, y]),
      ].map(([x, y]) => warp(x, y));
    });
    const dividers = rails.map((rail) => {
      const b = rail.box;
      const logical = (t) =>
        rail.axis === 'x'
          ? [b.x + b.w * rail.value, b.y + b.h * t]
          : [b.x + b.w * t, b.y + b.h * rail.value];
      const points = Array.from({ length: 81 }, (_, i) => warp(...logical(i / 80))),
        point = points[40];
      const p = logical(0.5),
        q = warp(p[0] + (rail.axis === 'x' ? 1e-4 : 0), p[1] + (rail.axis === 'y' ? 1e-4 : 0));
      const v = [(q[0] - point[0]) * model.r, q[1] - point[1]],
        length = Math.hypot(...v),
        normal = v.map((v) => v / length);
      return {
        ...rail,
        type: 'rail',
        id: rail.key,
        points,
        point,
        normal,
        sensitivity: (length / 1e-4) * (rail.axis === 'x' ? b.w : b.h),
        label: rail.axis === 'x' ? 'Resize adjacent columns' : 'Resize adjacent rows',
      };
    });
    return { polygons, dividers };
  }
  function buildPower(model, params) {
    const polygons = power(model.seeds, model.r, params.weights),
      edges = new Map();
    polygons.forEach((p, i) =>
      p.forEach((a, j) => {
        const b = p[(j + 1) % p.length],
          key = [a, b]
            .map((p) => p.map((v) => Math.round(v * 1e7)).join(':'))
            .sort()
            .join('|');
        if (!edges.has(key)) edges.set(key, { points: [a, b], cells: [] });
        edges.get(key).cells.push(i);
      }),
    );
    const dividers = [...edges.values()]
      .filter(
        (e) =>
          e.cells.length === 2 &&
          Math.hypot((e.points[0][0] - e.points[1][0]) * model.r, e.points[0][1] - e.points[1][1]) >
            0.018,
      )
      .map((edge) => {
        const [i, j] = edge.cells,
          p = model.seeds[i],
          q = model.seeds[j],
          v = [(q[0] - p[0]) * model.r, q[1] - p[1]],
          length = Math.hypot(...v);
        return {
          ...edge,
          type: 'power',
          id: `pair:${i}:${j}`,
          point: edge.points[0].map((v, k) => (v + edge.points[1][k]) / 2),
          normal: v.map((v) => v / length),
          separation: length,
          label: `Share space between photos ${i + 1} and ${j + 1}`,
        };
      });
    return {
      polygons,
      dividers,
      adjacency: [...edges.values()]
        .filter((e) => e.cells.length === 2)
        .map((e) =>
          e.cells
            .slice()
            .sort((a, b) => a - b)
            .join(':'),
        )
        .sort()
        .join('|'),
    };
  }
  function inlayOuter(model, angle) {
    const x = Math.cos(angle) / model.r,
      y = Math.sin(angle),
      d = Math.min(0.5 / Math.abs(x), 0.5 / Math.abs(y));
    return [0.5 + x * d, 0.5 + y * d];
  }
  function initialiseInlayCuts(model, params) {
    const angles = model.angles,
      cumulative = [0],
      outer = (a) => inlayOuter(model, a);
    for (let i = 1; i < angles.length; i++)
      cumulative.push(
        cumulative[i - 1] +
          area([
            outer(angles[i - 1]),
            outer(angles[i]),
            model.inner(angles[i]),
            model.inner(angles[i - 1]),
          ]),
      );
    const k = model.count - 1,
      total = cumulative.at(-1),
      cuts = [-PI / 2];
    for (let i = 1; i < k; i++) {
      const target = (total * i) / k;
      let lo = 0,
        hi = cumulative.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cumulative[mid] < target) lo = mid;
        else hi = mid;
      }
      cuts.push(
        angles[lo] +
          ((angles[hi] - angles[lo]) * (target - cumulative[lo])) /
            (cumulative[hi] - cumulative[lo]),
      );
    }
    cuts.push((3 * PI) / 2);
    model.inlayCuts = cuts;
    model.inlayAnchors = cuts.slice(0, -1).map(outer);
  }
  function segmentCross(a, b, c, d) {
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    return cross(a, b, c) * cross(a, b, d) < -1e-16 && cross(c, d, a) * cross(c, d, b) < -1e-16;
  }
  function inside(point, polygon) {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i],
        b = polygon[j];
      if (
        a[1] > point[1] !== b[1] > point[1] &&
        point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
      )
        hit = !hit;
    }
    return hit;
  }
  function buildInlay(model, params) {
    if (!model.inlayCuts) initialiseInlayCuts(model, params);
    const k = model.count - 1,
      scale = params.scale,
      inner = (a) => model.inner(a).map((v) => 0.5 + (v - 0.5) * scale);
    const offsets = params.inlayOffsets || Array(k).fill(0);
    const outerOffsets = params.outerOffsets || Array(k).fill(0);
    const outerCuts = model.inlayCuts.slice(0, -1).map((a, i) => a + outerOffsets[i]);
    outerCuts.push(outerCuts[0] + TAU);
    for (let i = 0; i < k; i++)
      if (outerCuts[i + 1] - outerCuts[i] < 0.12) throw Error("Keep outside junctions apart.");
    const cuts = model.inlayCuts.slice(0, -1).map((a, i) => a + offsets[i]);
    cuts.push(cuts[0] + TAU);
    for (let i = 0; i < k; i++)
      if (
        cuts[i + 1] - cuts[i] <
        Math.max(0.1, (model.inlayCuts[i + 1] - model.inlayCuts[i]) * 0.4)
      )
        throw Error('Keep space between neighbouring attachments.');
    const allAngles = [...new Set(model.angles.flatMap((a) => [a - TAU, a, a + TAU]))].sort(
      (a, b) => a - b,
    );
    const arc = (a, b) => [a, ...allAngles.filter((t) => t > a + 1e-10 && t < b - 1e-10), b];
    const contour = [],
      polygons = [],
      joins = [];
    for (let i = 0; i < k; i++) {
      const innerArc = arc(cuts[i], cuts[i + 1]);
      const outerArc = arc(outerCuts[i], outerCuts[i + 1]);
      contour.push(...innerArc.slice(0, -1).map(inner));
      polygons.push([
        ...outerArc.map((a) => inlayOuter(model, a)),
        ...innerArc.slice().reverse().map(inner),
      ]);
      joins.push([inner(cuts[i]), inlayOuter(model, outerCuts[i])]);
    }
    polygons.unshift(contour);
    let inlaySafe = true;
    for (let i = 0; i < joins.length && inlaySafe; i++) {
      const [a, b] = joins[i],
        probe = a.map((v, j) => v + (b[j] - v) * 0.001);
      if (inside(probe, contour)) {
        inlaySafe = false;
        break;
      }
      for (let j = 0; j < contour.length; j++)
        if (segmentCross(a, b, contour[j], contour[(j + 1) % contour.length])) {
          inlaySafe = false;
          break;
        }
      for (let j = 0; j < i; j++)
        if (segmentCross(a, b, ...joins[j])) {
          inlaySafe = false;
          break;
        }
    }
    const dividers = [];
    // A single conventional diagonal size grip avoids the heart's cleft and
    // distinguishes whole-shape scaling from the surrounding seam controls.
    const p = inner(PI / 4),
      v = [(p[0] - 0.5) * model.r, p[1] - 0.5],
      radius = Math.hypot(...v);
    dividers.push({
      id: 'shape:resize',
      type: 'shape',
      points: [...contour, contour[0]],
      point: p,
      normal: v.map((v) => v / radius),
      radius,
      cells: [0],
      label: 'Resize centre shape proportionally',
    });
    for (let i = 0; i < k; i++) {
      const [a, b] = joins[i];
      const cells = i === 0 ? [1, k] : [i, i + 1];
      const outerAngle = outerCuts[i];
      const before = inlayOuter(model, outerAngle - 1e-5);
      const after = inlayOuter(model, outerAngle + 1e-5);
      const tangent = [(after[0] - before[0]) * model.r / 2e-5, (after[1] - before[1]) / 2e-5];
      const speed = Math.hypot(...tangent);
      dividers.push({
        id: `outer:${i}`, type: 'outer', index: i,
        points: [a, b], point: b,
        normal: tangent.map(v => v / speed), sensitivity: 1 / speed,
        cells, label: `Move outside join between photos ${cells[0] + 1} and ${cells[1] + 1}`,
      });

    }
    return { polygons, dividers, inlaySafe };
  }
  function create(design, count, ratio) {
    if (
      !Number.isInteger(count) ||
      count < 5 ||
      count > 10 ||
      !Number.isFinite(ratio) ||
      ratio <= 0
    )
      throw Error('Choose 5–10 photos and a valid format.');
    const model = {
      design,
      count,
      ratio,
      r: Math.min(ratio, 1 / ratio),
      type:
        design.family === 'Inlay'
          ? 'inlay'
          : ['facets', 'honeycomb', 'crystal'].includes(design.id)
            ? 'power'
            : 'rails',
    };
    const params = {
      cuts: {},
      weights: Array(count).fill(0),
      scale: 1,
      shares: Array(count - 1).fill(1),
    };
    if (model.type === 'rails') {
      const variants = {
          tide: 1,
          river: 2,
          arcade: 2,
          silk: 3,
          scallop: 0,
          ribbon: 1,
          chevron: 2,
          kite: 4,
        },
        transpose = ['river', 'ribbon'].includes(design.id);
      model.tree =
        design.id === 'fold'
          ? split(count, model.r, 1)
          : mosaic(count, transpose ? 1 / model.r : model.r, variants[design.id], transpose);
    } else if (model.type === 'power') {
      const variant = { facets: 1, honeycomb: 3, crystal: 0 }[design.id],
        initial = boxes(mosaic(count, model.r, variant + 1), params).leaves;
      model.seeds = initial.map((b, i) => [
        b.x + b.w * (0.5 + 0.2 * Math.sin(i * 2.4 + variant)),
        b.y + b.h * (0.5 + 0.2 * Math.cos(i * 1.9 + variant)),
      ]);
      for (let i = 0; i < variant; i++)
        model.seeds = power(model.seeds, model.r, params.weights).map(centroid);
    } else {
      params.inlayOffsets = Array(count - 1).fill(0);
      const original = globalThis.InterlockingLayouts.frames(design, count, model.r)[0].points;
      const ring = [
        ...new Map(
          original.map((p) => {
            let a = Math.atan2(p[1] - 0.5, (p[0] - 0.5) * model.r);
            while (a < -PI / 2) a += TAU;
            return [Math.round(a * 1e10), { a, p }];
          }),
        ).values(),
      ].sort((a, b) => a.a - b.a);
      model.inner = (angle) => {
        while (angle < -PI / 2) angle += TAU;
        while (angle >= (3 * PI) / 2) angle -= TAU;
        let lo = 0,
          hi = ring.length;
        while (lo < hi) {
          const m = (lo + hi) >> 1;
          if (ring[m].a <= angle) lo = m + 1;
          else hi = m;
        }
        const a = ring[(lo - 1 + ring.length) % ring.length].p,
          b = ring[lo % ring.length].p;
        const x = Math.cos(angle) / model.r,
          y = Math.sin(angle),
          dx = b[0] - a[0],
          dy = b[1] - a[1],
          den = x * dy - y * dx;
        const t = ((a[0] - 0.5) * dy - (a[1] - 0.5) * dx) / den;
        return [0.5 + x * t, 0.5 + y * t];
      };
      const corners = rect(0, 0, 1, 1).map((p) => {
        let a = Math.atan2(p[1] - 0.5, (p[0] - 0.5) * model.r);
        while (a < -PI / 2) a += TAU;
        return a;
      });
      model.angles = [
        ...new Set([-PI / 2, (3 * PI) / 2, ...ring.map((v) => v.a), ...corners]),
      ].sort((a, b) => a - b);
    }
    model.initialParams = params;
    const initial = build(model, params);
    model.adjacency = initial.adjacency;
    model.limits = initial.polygons.map((p) => ({ area: area(p), width: thickness(p, ratio) }));
    return model;
  }
  function build(model, params) {
    const result =
      model.type === 'rails'
        ? buildRails(model, params)
        : model.type === 'power'
          ? buildPower(model, params)
          : buildInlay(model, params);
    if (model.ratio > 1) {
      result.polygons = result.polygons.map((p) => p.map(([x, y]) => [y, x]));
      result.dividers = result.dividers.map((d) => ({
        ...d,
        points: d.points.map(([x, y]) => [y, x]),
        ...(d.fixedAnchor ? { fixedAnchor: [d.fixedAnchor[1], d.fixedAnchor[0]] } : {}),
        point: [d.point[1], d.point[0]],
        normal: [d.normal[1], d.normal[0]],
        sensitivity: d.sensitivity
          ? (d.type === 'sector' || d.type === 'outer')
            ? d.sensitivity * model.r
            : d.sensitivity / model.r
          : d.sensitivity,
        radius: d.radius ? d.radius / model.r : d.radius,
        separation: d.separation ? d.separation / model.r : d.separation,
      }));
    }
    return result;
  }
  function thickness(p, r) {
    const perimeter = p.reduce((s, a, i) => {
      const b = p[(i + 1) % p.length];
      return s + Math.hypot((b[0] - a[0]) * r, b[1] - a[1]);
    }, 0);
    return (2 * area(p) * r) / perimeter;
  }
  function valid(model, result) {
    if (model.type === 'inlay' && !result.inlaySafe) return false;
    if (
      model.type === 'power' &&
      model.adjacency !== undefined &&
      result.adjacency !== model.adjacency
    )
      return false;
    if (
      result.polygons.some(
        (p) =>
          p.length < 3 ||
          p.some((v) => v.some((x) => !Number.isFinite(x) || x < -1e-7 || x > 1 + 1e-7)),
      )
    )
      return false;
    if (Math.abs(result.polygons.reduce((s, p) => s + area(p), 0) - 1) > 3e-5) return false;
    return result.polygons.every(
      (p, i) =>
        area(p) >= Math.max(0.035, model.limits[i].area * 0.5) &&
        thickness(p, model.ratio) >= model.limits[i].width * 0.55,
    );
  }
  function move(model, params, divider, distance) {
    function candidate(d) {
      const next = copy(params);
      if (divider.type === 'rail') next.cuts[divider.key] = divider.value + d / divider.sensitivity;
      if (divider.type === 'power') {
        // Weights use canonical-board units even when the display is transposed.
        const scale = model.ratio > 1 ? model.r : 1,
          delta = divider.separation * scale * scale * d;
        next.weights[divider.cells[0]] += delta;
        next.weights[divider.cells[1]] -= delta;
      }
      if (divider.type === 'shape') {
        next.scale += d / divider.radius;
        if (next.scale < 0.65 || next.scale > 1.5) return null;
      }
      if (divider.type === 'outer') {
        next.outerOffsets ||= Array(model.count - 1).fill(0);
        next.outerOffsets[divider.index] += d * divider.sensitivity;
      }
      try {
        const result = build(model, next);
        return valid(model, result) ? { params: next, ...result } : null;
      } catch {
        return null;
      }
    }
    const requested = Math.max(-1, Math.min(1, distance));
    let lo = 0,
      hi = 1,
      blocked = false;
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      if (!candidate(requested * t)) {
        hi = t;
        blocked = true;
        break;
      }
      lo = t;
    }
    if (blocked)
      for (let i = 0; i < 20; i++) {
        const t = (lo + hi) / 2;
        if (candidate(requested * t)) lo = t;
        else hi = t;
      }
    return {
      ...(candidate(requested * lo) || { params: copy(params), ...build(model, params) }),
      distance: requested * lo,
      limited: Math.abs(requested * lo - distance) > 1e-6,
    };
  }
  globalThis.StructuredDividers = { create, build, move, valid, area, bounds };
})();
