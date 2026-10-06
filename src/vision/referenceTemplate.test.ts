import { describe, expect, it } from 'vitest';
import { compileReference } from './referenceTemplate';
describe('reference template compiler', () => {
  it('creates replaceable assets without copying reference pixels and keeps exact text', () => {
    let index = 0;
    const items = compileReference(
      {
        width: 1000,
        height: 1200,
        background: '#ffffff',
        elements: [
          {
            type: 'photo',
            x: 0.1,
            y: 0.2,
            width: 0.4,
            height: 0.3,
            rotation: -3,
            color: '#ffffff',
          },
          {
            type: 'text',
            text: 'My 2026\nDREAMS!',
            x: 0,
            y: 0,
            width: 1,
            height: 0.1,
            rotation: 0,
            color: '#111111',
            fontSize: 0.05,
          },
        ],
      },
      () => `item-${index++}`,
    );
    expect(items[0]).toMatchObject({
      kind: 'asset',
      x: 100,
      y: 240,
      width: 400,
      height: 360,
      rotation: -3,
      templatePlaceholder: true,
      asset: { provider: 'template-photo' },
    });
    expect(items[0].asset?.assetUrl).toMatch(/^data:image\/svg\+xml,/);
    expect(items[1]).toMatchObject({ kind: 'text', text: 'My 2026\nDREAMS!', fontSize: 50 });
    expect(new Set(items.map((item) => item.id)).size).toBe(2);
  });
});
