export type PhotoArrangement = 'grid' | 'hero' | 'columns';
export function photoLayout(count: number, style: PhotoArrangement, width: number, height: number) {
  if (!Number.isInteger(count) || count < 1 || count > 12)
    throw new Error('Choose 1 to 12 photos.');
  const margin = Math.min(width, height) * 0.04,
    gap = margin * 0.4,
    w = width - margin * 2,
    h = height - margin * 2;
  const grid = (n: number, x: number, y: number, areaW: number, areaH: number, cols: number) => {
    const rows = Math.ceil(n / cols);
    return Array.from({ length: n }, (_, i) => ({
      x: x + ((i % cols) * (areaW + gap)) / cols,
      y: y + (Math.floor(i / cols) * (areaH + gap)) / rows,
      width: (areaW - gap * (cols - 1)) / cols,
      height: (areaH - gap * (rows - 1)) / rows,
    }));
  };
  if (style === 'hero' && count > 1) {
    const mainW = (w - gap) * 0.58;
    return [
      { x: margin, y: margin, width: mainW, height: h },
      ...grid(count - 1, margin + mainW + gap, margin, w - mainW - gap, h, count > 5 ? 2 : 1),
    ];
  }
  return grid(
    count,
    margin,
    margin,
    w,
    h,
    style === 'columns'
      ? Math.min(count, 3)
      : Math.min(count, Math.ceil(Math.sqrt((count * w) / h))),
  );
}
