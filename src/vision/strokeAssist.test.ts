import { describe, expect, it } from 'vitest';
import { assistStroke } from './strokeAssist';
describe('stroke assist', () => {
  it('snaps rough near-closed rectangles and triangles with imperfect corners', () => {
    const vertices = [
      [10, 8],
      [90, 0],
      [105, 70],
      [5, 78],
      [0, 12],
    ];
    const stroke = vertices
      .slice(1)
      .flatMap((end, i) =>
        Array.from({ length: 15 }, (_, j) => {
          const t = j / 15;
          return [
            vertices[i][0] + t * (end[0] - vertices[i][0]),
            vertices[i][1] + t * (end[1] - vertices[i][1]),
          ];
        }),
      )
      .concat([vertices[4]])
      .flat();
    expect(assistStroke(stroke).recognized).toBe('rectangle');
    const triangle = [
      [50, 0],
      [100, 90],
      [0, 100],
      [47, 5],
    ];
    const triangleStroke = triangle
      .slice(1)
      .flatMap((end, i) =>
        Array.from({ length: 20 }, (_, j) => {
          const t = j / 20;
          return [
            triangle[i][0] + t * (end[0] - triangle[i][0]),
            triangle[i][1] + t * (end[1] - triangle[i][1]),
          ];
        }),
      )
      .concat([triangle[3]])
      .flat();
    expect(assistStroke(triangleStroke).recognized).toBe('triangle');
  });
  it('recognizes uneven loops with a small closure gap', () => {
    const points = Array.from({ length: 100 }, (_, i) => {
      const angle = 0.3 + (i / 99) * (Math.PI * 2 - 0.24);
      const ripple = 1 + 0.07 * Math.sin(angle * 3);
      return [100 + 80 * ripple * Math.cos(angle), 100 + 60 * ripple * Math.sin(angle)];
    }).flat();
    expect(assistStroke(points).recognized).toBe('ellipse');
  });
  it('straightens a noisy diagonal without changing its endpoints', () => {
    const points = Array.from({ length: 50 }, (_, i) => [i * 3, i * 2 + Math.sin(i) * 0.8]).flat();
    const result = assistStroke(points);
    expect(result.recognized).toBe('line');
    expect(result.points).toEqual([...points.slice(0, 2), ...points.slice(-2)]);
  });
  it('fits circles and ellipses regardless of the starting point', () => {
    for (const ry of [80, 40]) {
      const points = Array.from({ length: 121 }, (_, i) => {
        const angle = 0.73 + (i * Math.PI) / 60;
        return [100 + 80 * Math.cos(angle), 100 + ry * Math.sin(angle)];
      }).flat();
      expect(assistStroke(points).recognized).toBe('ellipse');
    }
  });
  it('preserves figure eights instead of coercing them into circles', () => {
    const points = Array.from({ length: 201 }, (_, i) => {
      const angle = (i * Math.PI) / 100;
      return [100 + 80 * Math.sin(angle), 100 + 60 * Math.sin(angle * 2)];
    }).flat();
    const result = assistStroke(points);
    expect(result.recognized).toBe('outline');
    expect(result.points.length).toBeGreaterThan(16);
  });
  it('preserves corners of stars and arbitrary polygons', () => {
    const vertices = Array.from({ length: 11 }, (_, i) => {
      const radius = i % 2 ? 35 : 80;
      return [
        100 + radius * Math.cos((i * Math.PI) / 5),
        100 + radius * Math.sin((i * Math.PI) / 5),
      ];
    });
    const result = assistStroke(vertices.flat());
    expect(result.recognized).toBe('outline');
    expect(result.tension).toBe(0);
    expect(result.points).toEqual(vertices.flat());
  });
  it('does not close an open curved stroke or collapse a backtracking line', () => {
    const arc = Array.from({ length: 60 }, (_, i) => [
      80 * Math.cos(i / 40),
      80 * Math.sin(i / 40),
    ]).flat();
    expect(assistStroke(arc).recognized).toBe('outline');
    expect(assistStroke([0, 0, 80, 0, 20, 0, 100, 0]).recognized).toBe('outline');
    expect(assistStroke([0, 0, 80, 0, 20, 0, 100, 0]).points).toEqual([0, 0, 80, 0, 20, 0, 100, 0]);
  });
});
