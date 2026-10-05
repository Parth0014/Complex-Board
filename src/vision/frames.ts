export const framePaths = {
  circle: 'M50 0 A50 50 0 1 1 49.999 0 Z',
  heart: 'M50 95 C-30 35 5-15 50 20 C95-15 130 35 50 95 Z',
  triangle: 'M50 0 L100 100 L0 100 Z',
  hexagon: 'M25 0 L75 0 L100 50 L75 100 L25 100 L0 50 Z',
  star: 'M50 0 L61 35 L98 35 L68 57 L79 93 L50 71 L21 93 L32 57 L2 35 L39 35 Z',
  cloud: 'M20 80 C-10 80-5 40 20 40 C15 5 65 0 70 30 C110 20 120 80 85 80 Z',
} as const;
export type FrameShape = keyof typeof framePaths;
