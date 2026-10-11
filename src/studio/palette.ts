/**
 * palette.ts – shared content-color swatches for pickers and panels.
 *
 * These are user content colors (what the user picks for fills, text, backgrounds),
 * NOT UI tokens. UI tokens live in foundations.css.
 */

export interface PaletteSwatch {
  hex: string;
  name: string;
}

export const PALETTE: readonly PaletteSwatch[] = [
  { hex: '#ffffff', name: 'White' },
  { hex: '#222222', name: 'Ink' },
  { hex: '#d15b52', name: 'Coral' },
  { hex: '#d7a64c', name: 'Saffron' },
  { hex: '#7a9c77', name: 'Sage' },
  { hex: '#5988b5', name: 'Sky' },
  { hex: '#9578b5', name: 'Lavender' },
  { hex: '#e8b5bf', name: 'Blush' },
  { hex: '#4a3fd8', name: 'Violet' },
  { hex: '#ff7b5c', name: 'Flame' },
  { hex: '#f6c453', name: 'Butter' },
  { hex: '#83d3bb', name: 'Mint' },
] as const;

/** Legacy alias – the raw hex array for callers that haven't migrated to PALETTE. */
export const STUDIO_PALETTE = PALETTE.map((s) => s.hex);
