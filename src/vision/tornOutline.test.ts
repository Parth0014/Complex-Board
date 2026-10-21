import { describe, expect, it } from 'vitest';
import {
  TORN_SIDES,
  tornOutlinePreset,
  tornOutlinePoints,
  tornEdgePoint,
  validateTornOutline,
} from './tornOutline';
import { validateBoard } from './storage';
import { newBoard } from './document';
import { createAppearance } from './appearance/defaults';

describe('editable torn outlines', () => {
  it.each(['gentle', 'deep', 'strip'] as const)(
    'provides valid %s geometry with stable points',
    (preset) => {
      const outline = tornOutlinePreset(preset);
      expect(() => validateTornOutline(outline)).not.toThrow();
      const points = tornOutlinePoints(outline, 400, 600);
      expect(points).toEqual(tornOutlinePoints(outline, 400, 600));
      for (let i = 0; i < points.length; i += 2) {
        expect(points[i]).toBeGreaterThanOrEqual(0);
        expect(points[i]).toBeLessThanOrEqual(400);
        expect(points[i + 1]).toBeGreaterThanOrEqual(0);
        expect(points[i + 1]).toBeLessThanOrEqual(600);
      }
    },
  );
  it('resizes normalized bends while keeping unselected edges straight', () => {
    const outline = tornOutlinePreset('strip');
    const small = tornOutlinePoints(outline, 400, 600, false);
    const large = tornOutlinePoints(outline, 800, 1200, false);
    large.forEach((coordinate, i) => expect(coordinate).toBeCloseTo(small[i] * 2));
    for (const t of [0, 0.2, 0.5, 0.8, 1]) {
      expect(tornEdgePoint(outline, 'top', t, 400, 600).y).toBe(0);
      expect(tornEdgePoint(outline, 'bottom', t, 400, 600).y).toBe(600);
    }
  });
  it('changes fine tears only deliberately and keeps custom bend handles predictable', () => {
    const outline = tornOutlinePreset('deep');
    outline.points.left[2] = 0.3;
    expect(tornEdgePoint(outline, 'left', 0.5, 400, 600).x).toBeCloseTo(120);
    expect(tornOutlinePoints(outline, 400, 600)).not.toEqual(
      tornOutlinePoints({ ...outline, seed: 100 }, 400, 600),
    );
    expect(tornOutlinePoints({ ...outline, roughness: 0 }, 400, 600)).toEqual(
      tornOutlinePoints({ ...outline, roughness: 0, seed: 100 }, 400, 600),
    );
    for (const side of TORN_SIDES)
      for (let i = 0; i < 5; i++) outline.points[side][i] = i === 0 || i === 4 ? 0 : 0.4;
    for (const t of [0.01, 0.1, 0.2])
      expect(tornEdgePoint(outline, 'left', t, 400, 400).x).toBeLessThan(t * 400);
  });
  it('round-trips normalized controls and rejects malformed saved outlines', () => {
    const outline = tornOutlinePreset('strip');
    const board = {
      ...newBoard(),
      items: [
        {
          id: 'torn',
          kind: 'shape',
          shape: 'rectangle',
          x: 20,
          y: 20,
          width: 300,
          height: 500,
          rotation: 0,
          appearance: createAppearance('closed-shape'),
          paperEdge: { width: 12, color: '#fff6e6', outline },
        },
      ],
    };
    expect(validateBoard(JSON.parse(JSON.stringify(board))).items[0].paperEdge?.outline).toEqual(
      outline,
    );
    for (const invalid of [
      { ...outline, roughness: 2 },
      { ...outline, edges: ['left', 'left'] },
      { ...outline, points: { ...outline.points, left: [0, 10, 0, 0, 0] } },
    ])
      expect(() => validateTornOutline(invalid)).toThrow('Invalid torn-photo outline');
  });
});
