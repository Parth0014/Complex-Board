import { describe, expect, it } from 'vitest';
import { replaceSvgColors, svgColors, svgColorValue } from './svgColors';

describe('SVG colors', () => {
  it('finds attribute and inline-style paints without treating none as a color', () => {
    const source = `<svg fill='none'><path fill='#abc' stroke="currentColor" style="fill: #123456;stroke:#abc"/></svg>`;
    expect(svgColors(`data:image/svg+xml,${encodeURIComponent(source)}`)).toEqual([
      '#abc',
      'currentcolor',
      '#123456',
    ]);
    expect(replaceSvgColors(source, { '#abc': '#ffffff' })).toContain("fill='#ffffff'");
    expect(replaceSvgColors(source, { '#abc': '#ffffff' })).toContain('stroke:#ffffff');
    expect(replaceSvgColors(source, { '#abc': '#ffffff' })).toContain("fill='none'");
    expect(svgColorValue('#abc')).toBe('#aabbcc');
  });
});
