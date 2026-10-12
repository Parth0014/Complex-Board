export type PhotoArrangement = 'grid' | 'hero' | 'columns';
type Slot = { x: number; y: number; width: number; height: number };
export function photoLayout(
  count: number,
  style: PhotoArrangement,
  width: number,
  height: number,
  ratios: number[] = [],
): Slot[] {
  if (!Number.isInteger(count) || count < 1 || count > 12)
    throw new Error('Choose 1 to 12 photos.');
  const margin = Math.min(width, height) * 0.065,
    gap = Math.min(width, height) * 0.018;
  const area = { x: margin, y: margin, width: width - margin * 2, height: height - margin * 2 };
  const aspects = Array.from({ length: count }, (_, i) =>
    Math.max(0.55, Math.min(2.2, ratios[i] || 1.4)),
  );
  const gallery = (ids: number[], box: Slot): Slot[] => {
    if (ids.length === 1) {
      const ratio = aspects[ids[0]],
        w = Math.min(box.width, box.height * ratio),
        h = w / ratio;
      return [
        { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, width: w, height: h },
      ];
    }
    const mean = ids.reduce((s, i) => s + aspects[i], 0) / ids.length;
    const rows = Math.max(
      1,
      Math.min(ids.length, Math.ceil(Math.sqrt((ids.length * box.height) / (box.width * mean)))),
    );
    const groups: number[][] = [];
    let offset = 0;
    for (let row = 0; row < rows; row++) {
      const n = Math.ceil((ids.length - offset) / (rows - row));
      groups.push(ids.slice(offset, offset + n));
      offset += n;
    }
    const rowHeights = groups.map(
      (group) => (box.width - gap * (group.length - 1)) / group.reduce((s, i) => s + aspects[i], 0),
    );
    const total = rowHeights.reduce((s, h) => s + h, 0) + gap * (rows - 1);
    const scale = Math.min(1, box.height / total),
      rowWidth = box.width * scale;
    const result: Slot[] = [];
    let y = box.y + (box.height - total * scale) / 2;
    groups.forEach((group, r) => {
      let x = box.x + (box.width - rowWidth) / 2;
      const h = rowHeights[r] * scale;
      group.forEach((i) => {
        const w = h * aspects[i];
        result.push({ x, y, width: w, height: h });
        x += w + gap * scale;
      });
      y += h + gap * scale;
    });
    return result;
  };
  const ids = Array.from({ length: count }, (_, i) => i);
  if (style === 'hero' && count > 1) {
    if (width >= height) {
      const main = (area.width - gap) * 0.6;
      return [
        { x: area.x, y: area.y, width: main, height: area.height },
        ...gallery(ids.slice(1), {
          x: area.x + main + gap,
          y: area.y,
          width: area.width - main - gap,
          height: area.height,
        }),
      ];
    }
    const main = (area.height - gap) * 0.58;
    return [
      { x: area.x, y: area.y, width: area.width, height: main },
      ...gallery(ids.slice(1), {
        x: area.x,
        y: area.y + main + gap,
        width: area.width,
        height: area.height - main - gap,
      }),
    ];
  }
  if (style === 'columns' && count > 1) {
    const cols = Math.min(3, Math.ceil(Math.sqrt(count))),
      colWidth = (area.width - gap * (cols - 1)) / cols;
    const groups = Array.from({ length: cols }, () => [] as number[]);
    ids.forEach((id, i) => groups[i % cols].push(id));
    const heights = groups.map(
      (group) =>
        group.reduce((sum, id) => sum + colWidth / aspects[id], 0) + gap * (group.length - 1),
    );
    const scale = Math.min(1, area.height / Math.max(...heights));
    const actualW = colWidth * scale;
    const totalWidth = actualW * cols + gap * (cols - 1);
    const slots: Slot[] = Array(count);
    groups.forEach((group, col) => {
      let y = area.y + (area.height - heights[col] * scale) / 2;
      const x = area.x + (area.width - totalWidth) / 2 + col * (actualW + gap);
      group.forEach((id) => {
        const h = actualW / aspects[id];
        slots[id] = { x, y, width: actualW, height: h };
        y += h + gap * scale;
      });
    });
    return slots;
  }
  return gallery(ids, area);
}
