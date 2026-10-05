const star = (count: number) => {
  const points = Array.from({ length: count * 2 }, (_, i) => {
    const angle = (i * Math.PI) / count - Math.PI / 2;
    const radius = i % 2 ? 22 : 50;
    return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius };
  });
  const minX = Math.min(...points.map((p) => p.x)),
    minY = Math.min(...points.map((p) => p.y));
  const width = Math.max(...points.map((p) => p.x)) - minX,
    height = Math.max(...points.map((p) => p.y)) - minY;
  return (
    points
      .map(
        (p, i) =>
          `${i ? 'L' : 'M'}${((p.x - minX) * 100) / width} ${((p.y - minY) * 100) / height}`,
      )
      .join(' ') + ' Z'
  );
};

export const shapeGeometry: Record<
  string,
  { path: string; x: number; y: number; width: number; height: number }
> = {
  rectangle: { path: 'M0 0H100V100H0Z', x: 0, y: 0, width: 100, height: 100 },
  triangle: { path: 'M50 0L100 100H0Z', x: 0, y: 0, width: 100, height: 100 },
  star: { path: star(5), x: 0, y: 0, width: 100, height: 100 },
  burst: { path: star(12), x: 0, y: 0, width: 100, height: 100 },
  heart: {
    path: 'M50 95C-30 35 5-15 50 20C95-15 130 35 50 95Z',
    x: 2.2394,
    y: 8.4268,
    width: 95.5212,
    height: 86.5732,
  },
  cloud: {
    path: 'M20 80C-10 80-5 40 20 40C15 5 65 0 70 30C110 20 120 80 85 80Z',
    x: -0.6674,
    y: 10.3014,
    width: 107.0652,
    height: 69.6986,
  },
  blob: {
    path: 'M20 10C70-20 120 40 90 85C60 120-20 75 20 10Z',
    x: 9.0275,
    y: 1.925,
    width: 90.0294,
    height: 95.2805,
  },
};
