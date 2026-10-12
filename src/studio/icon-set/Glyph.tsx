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
  size,
  strokeWidth = 1.5,
  duotone = true,
  className,
}: GlyphProps) {
  const glyph: GlyphData = GLYPHS[name];
  // Optical stroke: use the explicit size when given, else the token size.
  const resolved = size ?? 16;
  const sw = opticalStroke(resolved, strokeWidth) + (glyph.sw ? glyph.sw - 1.5 : 0);
  // Without an explicit size the icon sizes from --gs-icon-size via .gs-icon;
  // an explicit size sets attributes (presentation attributes lose to the
  // class, so the class is omitted then).
  const cls = size == null ? 'gs-glyph gs-icon' : 'gs-glyph';
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
      className={className ? `${cls} ${className}` : cls}
    >
      {duotone && glyph.t ? (
        <path
          d={glyph.t}
          fill="currentColor"
          stroke="none"
          style={{ fillOpacity: 'var(--gs-glyph-tint, 0.16)' }}
        />
      ) : null}
      {glyph.s ? <path d={glyph.s} fill="currentColor" stroke="none" /> : null}
      {glyph.d ? <path d={glyph.d} /> : null}
      {glyph.dots?.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.15} fill="currentColor" stroke="none" />
      ))}
    </svg>
  );
}
