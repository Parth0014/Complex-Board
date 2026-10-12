/**
 * foundations.contrast.test.ts — Phase G craft gate G1 (contrast), locked by a unit test.
 *
 * Parses src/studio/design-system/foundations.css, resolves the var() chains,
 * and asserts WCAG contrast ratios for every semantic pair the plan names:
 * text >= 4.5:1, placeholder >= 4.5:1, control borders and focus ring >= 3:1,
 * UI icons (accent) >= 3:1.
 *
 * G1 state: §3.1 corrected the failing tokens, so every pair below asserts its
 * WCAG threshold. Disabled text is exempt by design and asserted dimmer than
 * placeholder text so the two states stay distinguishable.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canvasColors } from '../../vision/canvas/colors';

const css = readFileSync(new URL('./foundations.css', import.meta.url), 'utf8');
const rootBlock = css.match(/:root\s*{([\s\S]*?)}/)?.[1];
if (!rootBlock) throw new Error('foundations.css has no :root block');

const rawTokens = new Map<string, string>();
for (const m of rootBlock.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
  rawTokens.set(m[1], m[2].trim());
}

function resolveToken(name: string, seen = new Set<string>()): string {
  const value = rawTokens.get(name);
  if (value === undefined) throw new Error(`token --${name} is not defined in foundations.css`);
  // Resolve var() references anywhere in the value (top-level or nested, e.g.
  // rgba(var(--gs-ink-rgb), 0.07)).
  return value.replace(/var\(--([\w-]+)\)/g, (_match, ref: string) => {
    if (seen.has(ref)) throw new Error(`var() cycle at --${ref}`);
    seen.add(ref);
    return resolveToken(ref, seen);
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two token names, e.g. ratio('gs-text', 'gs-surface'). */
function ratio(fg: string, bg: string): number {
  const [lighter, darker] = [luminance(resolveToken(fg)), luminance(resolveToken(bg))].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe('foundations.css contrast (G1 gate)', () => {
  it('parses and resolves the token graph', () => {
    expect(resolveToken('gs-text')).toBe('#1e1a36');
    expect(resolveToken('gs-surface')).toBe('#fffdfc');
    expect(resolveToken('gs-accent')).toBe('#4a3fd8');
  });

  it('body text and secondary text meet 4.5:1', () => {
    expect(ratio('gs-text', 'gs-surface')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('gs-text-secondary', 'gs-surface')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('gs-text-secondary', 'gs-workspace')).toBeGreaterThanOrEqual(4.5);
  });

  it('on-accent text meets 4.5:1, accent as icon/UI meets 3:1', () => {
    expect(ratio('gs-on-accent', 'gs-accent')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('gs-accent', 'gs-surface')).toBeGreaterThanOrEqual(3);
    expect(ratio('gs-accent', 'gs-accent-soft')).toBeGreaterThanOrEqual(3);
  });

  it('warning pair already meets 4.5:1', () => {
    expect(ratio('gs-warning', 'gs-warning-soft')).toBeGreaterThanOrEqual(4.5);
  });

  it('focus ring meets 3:1 on surface and workspace', () => {
    expect(ratio('gs-focus-color', 'gs-surface')).toBeGreaterThanOrEqual(3);
    expect(ratio('gs-focus-color', 'gs-workspace')).toBeGreaterThanOrEqual(3);
  });

  it('placeholder text meets 4.5:1', () => {
    expect(ratio('gs-text-placeholder', 'gs-surface')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('gs-text-placeholder', 'gs-surface-muted')).toBeGreaterThanOrEqual(4.5);
  });

  it('control borders meet 3:1', () => {
    expect(ratio('gs-control-line', 'gs-surface')).toBeGreaterThanOrEqual(3);
    expect(ratio('gs-control-line', 'gs-workspace')).toBeGreaterThanOrEqual(3);
    expect(ratio('gs-control-line-hover', 'gs-surface')).toBeGreaterThanOrEqual(3);
  });

  it('danger, warning and success text meet 4.5:1 on their soft fills', () => {
    expect(ratio('gs-danger', 'gs-danger-soft')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('gs-warning', 'gs-warning-soft')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('gs-success', 'gs-success-soft')).toBeGreaterThanOrEqual(4.5);
  });

  it('canvas guide meets 3:1', () => {
    expect(ratio('gs-canvas-guide', 'gs-sheet')).toBeGreaterThanOrEqual(3);
    expect(ratio('gs-canvas-guide', 'gs-workspace')).toBeGreaterThanOrEqual(3);
  });

  it('disabled text stays below 4.5:1 by design (exempt from contrast)', () => {
    // Disabled controls are exempt from WCAG contrast; the token must stay
    // visibly dimmer than placeholder text so the states do not merge.
    expect(ratio('gs-text-disabled', 'gs-surface')).toBeLessThan(
      ratio('gs-text-placeholder', 'gs-surface'),
    );
  });
});

describe('colors.ts fallbacks match foundations.css token values (item 14)', () => {
  const fallbacks = canvasColors();
  it('every fallback equals its --gs-canvas-* token', () => {
    const entries: Array<[keyof typeof fallbacks, string]> = [
      ['selection', 'gs-canvas-selection'],
      ['guide', 'gs-canvas-guide'],
      ['marqueeFill', 'gs-canvas-marquee-fill'],
      ['marqueeStroke', 'gs-canvas-marquee-stroke'],
      ['highlighter', 'gs-canvas-highlighter'],
      ['pen', 'gs-canvas-pen'],
      ['dots', 'gs-canvas-dots'],
      ['artboardStroke', 'gs-canvas-artboard-stroke'],
      ['artboardShadow', 'gs-canvas-artboard-shadow'],
    ];
    for (const [key, token] of entries) {
      expect(
        fallbacks[key].replace(/\s+/g, '').toLowerCase(),
        `${key} fallback matches --${token}`,
      ).toBe(resolveToken(token).replace(/\s+/g, '').toLowerCase());
    }
  });
});
