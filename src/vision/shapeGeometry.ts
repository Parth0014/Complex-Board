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
  diamond: {
    path: 'M50 0L100 50L50 100L0 50Z',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  },
  hexagon: {
    path: 'M25 6.7L75 6.7L100 50L75 93.3L25 93.3L0 50Z',
    x: 0,
    y: 6.7,
    width: 100,
    height: 86.6,
  },
  octagon: {
    path: 'M29.3 0H70.7L100 29.3V70.7L70.7 100H29.3L0 70.7V29.3Z',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  },
  badge: {
    path: 'M50 0L60.8 12.3L77 10.6L81.5 26.2L96 33.7L91.6 49.3L99.2 63.7L83.6 68.1L82.2 84.1L66.6 82.7L56 93.4L44 93.4L33.4 82.7L17.8 84.1L16.4 68.1L0.8 63.7L8.4 49.3L4 33.7L18.5 26.2L23 10.6L39.2 12.3Z',
    x: 0,
    y: 0,
    width: 100,
    height: 94,
  },
  flower: {
    path: 'M50 0C40 0 32 10 32 20C22 20 12 28 12 38C12 48 22 56 32 56C32 66 40 76 50 76C60 76 68 66 68 56C78 56 88 48 88 38C88 28 78 20 68 20C68 10 60 0 50 0Z',
    x: 12,
    y: 0,
    width: 76,
    height: 76,
  },
  arch: {
    path: 'M0 100V50C0 22.4 22.4 0 50 0C77.6 0 100 22.4 100 50V100Z',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  },
};
