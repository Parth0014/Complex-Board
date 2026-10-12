/**
 * colors.ts – canvas color constants for Konva rendering.
 *
 * Reads --gs-canvas-* tokens from the document so the canvas matches the
 * design system. Falls back to constants matching the token defaults.
 */

/* ── Fallback constants (match foundations.css token values) ── */
const FALLBACK = {
  selection: '#4a3fd8',
  guide: '#b53a24',
  marqueeFill: 'rgba(74, 63, 216, 0.12)',
  marqueeStroke: '#4a3fd8',
  highlighter: '#f6c453',
  pen: '#1e1a36',
  dots: 'rgba(30, 26, 54, 0.16)',
  artboardStroke: '#c4bcdc',
  artboardShadow: 'rgba(30, 26, 54, 0.22)',
} as const;

/* ── Item-content default colors (legacy, kept unchanged) ── */
export const ITEM_FILL_DEFAULT = '#b48ce3';
export const ITEM_INK_DEFAULT = '#33272b';
export const ITEM_HIGHLIGHT_DEFAULT = '#fff3bd';
export const ITEM_WHITE = '#fff';
export const ITEM_BLACK = '#000';

export interface CanvasColors {
  selection: string;
  guide: string;
  marqueeFill: string;
  marqueeStroke: string;
  highlighter: string;
  pen: string;
  dots: string;
  artboardStroke: string;
  artboardShadow: string;
}

function readToken(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Read canvas colors from CSS custom properties.
 * Call once per render context (e.g. on mount or when the document changes).
 */
export function canvasColors(doc?: Document): CanvasColors {
  const win = doc?.defaultView;
  if (!doc || !win) return { ...FALLBACK };
  const probe = doc.createElement('span');
  probe.hidden = true;
  doc.documentElement.appendChild(probe);
  const values = {} as CanvasColors;
  try {
    const style = win.getComputedStyle(doc.documentElement);
    for (const key of Object.keys(FALLBACK) as (keyof CanvasColors)[]) {
      const suffix = key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
      probe.style.color = '';
      probe.style.color = readToken(style, '--gs-canvas-' + suffix, FALLBACK[key]);
      values[key] = probe.style.color ? win.getComputedStyle(probe).color : FALLBACK[key];
    }
  } finally {
    probe.remove();
  }
  return values;
}
