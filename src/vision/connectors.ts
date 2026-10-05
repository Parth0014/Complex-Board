import type { BoardItem } from './document';
const center = (item: BoardItem) => {
  const angle = (item.rotation * Math.PI) / 180;
  return {
    x: item.x + (item.width / 2) * Math.cos(angle) - (item.height / 2) * Math.sin(angle),
    y: item.y + (item.width / 2) * Math.sin(angle) + (item.height / 2) * Math.cos(angle),
  };
};
function edge(item: BoardItem, toward: { x: number; y: number }) {
  const point = center(item),
    angle = (item.rotation * Math.PI) / 180,
    dx = toward.x - point.x,
    dy = toward.y - point.y;
  const localX = dx * Math.cos(angle) + dy * Math.sin(angle),
    localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
  const factor = Math.min(
    localX ? item.width / 2 / Math.abs(localX) : Infinity,
    localY ? item.height / 2 / Math.abs(localY) : Infinity,
  );
  return Number.isFinite(factor) ? { x: point.x + dx * factor, y: point.y + dy * factor } : point;
}
export function updateConnectors(items: BoardItem[]): BoardItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return items.map((item) => {
    if (!item.connector) return item;
    const from = byId.get(item.connector.from),
      to = byId.get(item.connector.to);
    if (!from || !to || from.connector || to.connector) return { ...item, connector: undefined };
    const start = edge(from, center(to)),
      end = edge(to, center(from)),
      angle = Math.atan2(end.y - start.y, end.x - start.x),
      height = 10;
    return {
      ...item,
      x: start.x + (Math.sin(angle) * height) / 2,
      y: start.y - (Math.cos(angle) * height) / 2,
      width: Math.max(10, Math.hypot(end.x - start.x, end.y - start.y)),
      height,
      rotation: (angle * 180) / Math.PI,
    };
  });
}
