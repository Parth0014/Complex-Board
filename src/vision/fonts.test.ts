import { expect, it } from 'vitest';
import { canonicalFontId, editorFonts, fontFamily } from './fonts';
import { VISION_TEXT_PRESETS } from './typography';

it('preserves the actual font families of legacy boards', () => {
  expect(fontFamily('comic-shanns')).toBe('Cascadia Code');
  expect(fontFamily('playfair-display')).toBe('Georgia');
  expect(fontFamily('nunito')).toBe('Georgia');
  expect(fontFamily('assistant')).toBe('Assistant');
  expect(canonicalFontId('comic-shanns')).toBe('cascadia');
  expect(canonicalFontId('playfair-display')).toBe('georgia');
});

it('new text presets select an actual available family', () => {
  for (const preset of VISION_TEXT_PRESETS) {
    expect(Object.hasOwn(editorFonts, preset.fontFamily)).toBe(true);
  }
});
