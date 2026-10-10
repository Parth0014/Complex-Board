import { describe, it, expect } from 'vitest';
import { curatedAssets } from './curatedPack';
import { matchesElementSearch } from './elementSearch';
describe('element search', () => {
  it('does not match health from retired folder and filename labels on love artwork', () => {
    for (const id of ['health-love-calm-06', 'health-love-calm-07', 'health-love-calm-08']) {
      const love = curatedAssets.find((item) => item.id === 'vision-svg:affirmations/' + id)!;
      expect(matchesElementSearch(love, 'health')).toBe(false);
      expect(matchesElementSearch(love, 'love')).toBe(true);
    }
  });
  const asset = curatedAssets.find((item) => item.id === 'vision-svg:affirmations/health-love-calm-01')!;
  it('matches words in any order and ignores case and punctuation', () => {
    expect(matchesElementSearch(asset, 'GENTLY body')).toBe(true);
    expect(matchesElementSearch(asset, 'Health-Wellness')).toBe(true);
    expect(matchesElementSearch(asset, 'body travel')).toBe(false);
    expect(matchesElementSearch(asset, '   ')).toBe(true);
  });
});
