import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { canvasColors } from '../../vision/canvas/colors';

const css = readFileSync(new URL('./foundations.css', import.meta.url), 'utf8');
const tokens = new Map(
  [...css.matchAll(/(--gs-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);
function resolve(name: string): string {
  const value = tokens.get(name);
  if (!value) throw new Error(`Missing token ${name}`);
  return value.replace(/var\((--gs-[\w-]+)\)/g, (_, key) => resolve(key));
}
function luminance(color: string) {
  const rgb = color.startsWith('#')
    ? (color.length === 4 ? [...color.slice(1)].map((c) => c + c).join('') : color.slice(1))
        .match(/../g)!
        .map((c) => parseInt(c, 16))
    : color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
  const linear = rgb.map((c) =>
    c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
const pairs: [string, string, number][] = [
  ['text', 'surface', 4.5],
  ['text-secondary', 'surface', 4.5],
  ['text-secondary', 'workspace', 4.5],
  ['text-placeholder', 'surface', 4.5],
  ['text-placeholder', 'surface-muted', 4.5],
  ['on-accent', 'accent', 4.5],
  ['accent', 'surface', 4.5],
  ['accent', 'accent-soft', 4.5],
  ['danger', 'danger-soft', 4.5],
  ['warning', 'warning-soft', 4.5],
  ['success', 'success-soft', 4.5],
  ['control-line', 'surface', 3],
  ['control-line', 'workspace', 3],
  ['control-line-hover', 'surface', 3],
  ['focus-color', 'surface', 3],
  ['focus-color', 'workspace', 3],
  ['canvas-guide', 'white', 3],
];
describe('Atelier contrast thresholds', () => {
  for (const [foreground, background, minimum] of pairs) {
    test(`${foreground} / ${background} >= ${minimum}:1`, () => {
      const a = luminance(resolve('--gs-' + foreground));
      const b = luminance(resolve('--gs-' + background));
      expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(minimum);
    });
  }
});
test('canvas fallback colors match the authoritative tokens', () => {
  for (const [key, color] of Object.entries(canvasColors())) {
    const suffix = key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
    const canonical = resolve('--gs-canvas-' + suffix).replace(/\s+/g, '');
    expect(color.replace(/\s+/g, '')).toBe(canonical);
  }
});
