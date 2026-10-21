import { describe, expect, it } from 'vitest';
import { paperEdgePixels, validatePaperEdge } from './paperEdge';
import { newBoard, type BoardItem } from './document';
import { validateBoard } from './storage';
import { createAppearance } from './appearance/defaults';

describe('torn paper silhouette', () => {
  const width = 80,
    height = 80;
  const source = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const r = Math.hypot(x - 40, y - 40);
      if (r <= 28 && r >= 13) source[(y * width + x) * 4 + 3] = 255;
    }
  const alpha = (pixels: Uint8ClampedArray, x: number, y: number) =>
    pixels[(y * width + x) * 4 + 3];

  it('follows a hollow silhouette while preserving transparent corners, gaps and the original pixels', () => {
    const original = source.slice();
    const paper = paperEdgePixels(source, width, height, 6, '#fff6e6', 7);
    expect(alpha(paper, 40, 40)).toBe(0);
    expect(alpha(paper, 12, 12)).toBe(0);
    expect(alpha(paper, 40, 8)).toBeGreaterThan(0);
    expect(alpha(paper, 40, 14)).toBe(255);
    expect(source).toEqual(original);
  });

  it('keeps the same tear on redraw and produces textured paper instead of a flat fill', () => {
    const paper = paperEdgePixels(source, width, height, 8, '#fff6e6', 17);
    expect(paper).toEqual(paperEdgePixels(source, width, height, 8, '#fff6e6', 17));
    expect(paper).not.toEqual(paperEdgePixels(source, width, height, 8, '#fff6e6', 38));
    const reds = new Set<number>();
    for (let i = 0; i < paper.length; i += 4) if (paper[i + 3] === 255) reds.add(paper[i]);
    expect(reds.size).toBeGreaterThan(5);
  });

  it('round-trips the effect on custom shapes and rejects invalid saved settings', () => {
    const shape: BoardItem = {
      id: 'paper-shape',
      kind: 'shape',
      shape: 'star',
      x: 40,
      y: 40,
      width: 200,
      height: 200,
      rotation: 0,
      appearance: createAppearance('closed-shape'),
      paperEdge: { width: 16, color: '#fff6e6' },
    };
    const saved = validateBoard(JSON.parse(JSON.stringify({ ...newBoard(), items: [shape] })));
    expect(saved.items[0].paperEdge).toEqual(shape.paperEdge);
    for (const edge of [
      { width: 0, color: '#ffffff' },
      { width: 99, color: '#ffffff' },
      { width: 8, color: 'bad' },
    ]) {
      expect(() => validatePaperEdge(edge)).toThrow('Invalid paper edge');
      expect(() =>
        validateBoard({ ...saved, items: [{ ...saved.items[0], paperEdge: edge }] }),
      ).toThrow('Invalid paper edge');
    }
  });
});
