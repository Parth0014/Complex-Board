import { expect, it } from 'vitest';
import { imagesPdf } from './pdf';
it('writes multiple pages with byte-correct cross references', () => {
  const bytes = imagesPdf([
    { jpeg: new Uint8Array([255, 216, 255, 217]), width: 100, height: 200 },
    { jpeg: new Uint8Array([255, 216, 255, 217]), width: 300, height: 100 },
  ]);
  const text = new TextDecoder('latin1').decode(bytes);
  expect(text).toContain('/Count 2');
  expect(text).toContain('/MediaBox [0 0 225 75]');
  const offset = Number(text.match(/startxref\n(\d+)/)?.[1]);
  expect(new TextDecoder().decode(bytes.slice(offset, offset + 4))).toBe('xref');
  const entries = text.slice(offset).split('\n').slice(3, 11);
  entries.forEach((entry, index) => {
    const start = Number(entry.slice(0, 10));
    expect(new TextDecoder().decode(bytes.slice(start, start + 7))).toContain(`${index + 1} 0 obj`);
  });
});
