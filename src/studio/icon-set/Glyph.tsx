import React from 'react';
import { GLYPHS, type GlyphData, type GlyphName } from './glyphs';

export type GlyphProps = {
  name: GlyphName;
  size?: number;
  /** Base stroke in the 24px viewBox. Compensated automatically at small sizes. */
  strokeWidth?: number;
  /** Render the soft tint layer. Rail/active states raise it via --gs-glyph-tint. */
  duotone?: boolean;
  className?: string;
};

/** Optical stroke compensation so 14-16px glyphs don't turn hairline. */
function opticalStroke(size: number, base: number) {
  if (size >= 20) return base;
  if (size >= 16) return base + 0.15;
  return base + 0.3;
}

export function Glyph({
  name,
  size = 16,
  strokeWidth = 1.5,
  duotone = true,
  className,
}: GlyphProps) {
  const glyph: GlyphData = GLYPHS[name];
  const sw = opticalStroke(size, strokeWidth) + (glyph.sw ? glyph.sw - 1.5 : 0);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `gs-glyph gs-icon ${className}` : 'gs-glyph gs-icon'}
    >
      {duotone && glyph.t ? (
        <path d={glyph.t} fill="currentColor" stroke="none" className="gs-icon__tint" />
      ) : null}
      {glyph.s ? <path d={glyph.s} fill="currentColor" stroke="none" /> : null}
      {glyph.d ? <path d={glyph.d} /> : null}
      {glyph.dots?.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.15} fill="currentColor" stroke="none" />
      ))}
    </svg>
  );
}
