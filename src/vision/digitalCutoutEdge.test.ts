import { describe, expect, it } from 'vitest';
import { studioCutouts } from '../assets/studioCutouts';
import type { BoardItem } from './document';
import { withDigitalCutoutEdge } from './digitalCutoutEdge';

const digital = studioCutouts.find((asset) => asset.id === 'studio-cutout:digital-camera')!;
const item: Extract<BoardItem, { kind: 'asset' }> = {
  id: 'cutout',
  kind: 'asset',
  asset: digital,
  x: 0,
  y: 0,
  width: 300,
  height: 300,
  rotation: 0,
  opacity: 1,
};

describe('digital cutout sticker edges', () => {
  it('keeps the approved lifestyle PNGs baked white edge without adding another outline', () => {
    const reviewed = studioCutouts.filter((asset) =>
      asset.id.startsWith('studio-cutout:lifestyle-'),
    );
    expect(reviewed).toHaveLength(26);
    for (const asset of reviewed) {
      const cutout = { ...item, asset };
      expect(withDigitalCutoutEdge(cutout)).toBe(cutout);
      expect(cutout.stickerWidth).toBeUndefined();
    }
  });
  it('adds a white edge without replacing the source image or mutating the original item', () => {
    const outlined = withDigitalCutoutEdge(item);
    expect(outlined).toMatchObject({ stickerWidth: 8, stickerColor: '#ffffff' });
    expect(outlined.asset).toBe(digital);
    expect(item.stickerWidth).toBeUndefined();
  });

  it('preserves an explicit removal and existing custom settings on reload', () => {
    for (const width of [0, 4, 15]) {
      const custom = { ...item, stickerWidth: width, stickerColor: '#ddbbaa' };
      expect(withDigitalCutoutEdge(custom)).toBe(custom);
    }
  });

  it('does not outline torn-paper dividers', () => {
    const paper = {
      ...item,
      asset: studioCutouts.find((asset) => asset.id === 'studio-cutout:paper-divider-ivory'),
    };
    expect(withDigitalCutoutEdge(paper)).toBe(paper);
  });
});
