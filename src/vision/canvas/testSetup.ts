import Konva from 'konva';
import { vi } from 'vitest';

// Command/history tests need deterministic font metrics, not a DOM or native
// canvas dependency. Keep Konva's real wrapping/layout logic; browser tests
// exercise actual font rendering and export.
const context = {
  font: '10px sans-serif',
  save() {},
  restore() {},
  measureText(text: string) {
    const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 10);
    return { width: Array.from(text).length * size * 0.5 };
  },
};
vi.spyOn(Konva.Util, 'createCanvasElement').mockImplementation(
  () => ({ getContext: () => context }) as unknown as HTMLCanvasElement,
);
