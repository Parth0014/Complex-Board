import type { BoardItem } from '../document';
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function boundsOf(
  item: Pick<BoardItem, 'x' | 'y' | 'width' | 'height' | 'rotation'>,
): Bounds {
  const angle = (item.rotation * Math.PI) / 180;
  const corners = [
    [0, 0],
    [item.width, 0],
    [0, item.height],
    [item.width, item.height],
  ].map(([x, y]) => ({
    x: item.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: item.y + x * Math.sin(angle) + y * Math.cos(angle),
  }));
  const xs = corners.map((p) => p.x),
    ys = corners.map((p) => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}
export function unionBounds(items: Bounds[]): Bounds {
  if (!items.length) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...items.map((i) => i.x)),
    y = Math.min(...items.map((i) => i.y));
  return {
    x,
    y,
    width: Math.max(...items.map((i) => i.x + i.width)) - x,
    height: Math.max(...items.map((i) => i.y + i.height)) - y,
  };
}
export function constrainItems(
  items: BoardItem[],
  page: { width: number; height: number },
): BoardItem[] {
  const units = new Map<string, BoardItem[]>();
  for (const item of items) {
    const key = item.groupId || item.id;
    units.set(key, [...(units.get(key) || []), item]);
  }
  const constrained = new Map<string, BoardItem>();
  for (const members of units.values()) {
    const original = unionBounds(members.map(boundsOf));
    const factor = Math.min(
      1,
      page.width / Math.max(1, original.width),
      page.height / Math.max(1, original.height),
    );
    const resized =
      factor < 1
        ? members.map((item) => ({
            ...item,
            x: original.x + (item.x - original.x) * factor,
            y: original.y + (item.y - original.y) * factor,
            width: item.width * factor,
            height: item.height * factor,
            ...(item.fontSize ? { fontSize: item.fontSize * factor } : {}),
          }))
        : members;
    const box = unionBounds(resized.map(boundsOf));
    const dx = Math.max(-box.x, Math.min(0, page.width - box.x - box.width));
    const dy = Math.max(-box.y, Math.min(0, page.height - box.y - box.height));
    for (const item of resized)
      constrained.set(item.id, dx || dy ? { ...item, x: item.x + dx, y: item.y + dy } : item);
  }
  return items.map((item) => constrained.get(item.id)!);
}
export function snapMovement(
  moving: Bounds,
  others: Bounds[],
  page: { width: number; height: number },
  threshold: number,
) {
  const targetsX = [
    0,
    page.width / 2,
    page.width,
    ...others.flatMap((b) => [b.x, b.x + b.width / 2, b.x + b.width]),
  ];
  const targetsY = [
    0,
    page.height / 2,
    page.height,
    ...others.flatMap((b) => [b.y, b.y + b.height / 2, b.y + b.height]),
  ];
  const closest = (edges: number[], targets: number[]) => {
    let best: { delta: number; guide: number } | undefined;
    for (const edge of edges)
      for (const guide of targets) {
        const delta = guide - edge;
        if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta)))
          best = { delta, guide };
      }
    return best;
  };
  const x = closest([moving.x, moving.x + moving.width / 2, moving.x + moving.width], targetsX);
  const y = closest([moving.y, moving.y + moving.height / 2, moving.y + moving.height], targetsY);
  return { dx: x?.delta || 0, dy: y?.delta || 0, vertical: x?.guide, horizontal: y?.guide };
}
/** Snap the moving resize edges while keeping the opposite anchor fixed. */
export function snapResize(
  box: Bounds,
  anchor: string,
  others: Bounds[],
  page: { width: number; height: number },
  threshold: number,
  ratio: boolean,
) {
  const left = anchor.includes('left'),
    right = anchor.includes('right'),
    top = anchor.includes('top'),
    bottom = anchor.includes('bottom');
  const nearest = (edge: number, targets: number[]) =>
    targets
      .map((guide) => ({ guide, delta: guide - edge }))
      .filter((value) => Math.abs(value.delta) <= threshold)
      .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
  let x =
    left || right
      ? nearest(left ? box.x : box.x + box.width, [
          0,
          page.width / 2,
          page.width,
          ...others.flatMap((other) => [other.x, other.x + other.width / 2, other.x + other.width]),
        ])
      : undefined;
  let y =
    top || bottom
      ? nearest(top ? box.y : box.y + box.height, [
          0,
          page.height / 2,
          page.height,
          ...others.flatMap((other) => [
            other.y,
            other.y + other.height / 2,
            other.y + other.height,
          ]),
        ])
      : undefined;
  const next = { ...box };
  if (ratio && (left || right) && (top || bottom)) {
    if (x && (!y || Math.abs(x.delta) <= Math.abs(y.delta))) {
      y = undefined;
      const width = box.width + x.delta * (left ? -1 : 1),
        height = (box.height * width) / box.width;
      next.width = width;
      next.height = height;
      if (left) next.x = box.x + box.width - width;
      if (top) next.y = box.y + box.height - height;
    } else if (y) {
      x = undefined;
      const height = box.height + y.delta * (top ? -1 : 1),
        width = (box.width * height) / box.height;
      next.width = width;
      next.height = height;
      if (left) next.x = box.x + box.width - width;
      if (top) next.y = box.y + box.height - height;
    }
  } else {
    if (x) {
      next.width += x.delta * (left ? -1 : 1);
      if (left) next.x += x.delta;
    }
    if (y) {
      next.height += y.delta * (top ? -1 : 1);
      if (top) next.y += y.delta;
    }
  }
  return { box: next, vertical: x?.guide, horizontal: y?.guide };
}
