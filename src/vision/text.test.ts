import { expect, it } from 'vitest';
import { formatRange } from './text';
it('preserves prior formatting while editing an overlapping range', () => {
  const first = formatRange('Dream big', [], 0, 5, { bold: true });
  const next = formatRange('Dream big', first, 3, 9, { script: 'super' });
  expect(next.find((run) => run.start <= 2 && run.end > 2)?.bold).toBe(true);
  const overlap = next.find((run) => run.start <= 4 && run.end > 4);
  expect(overlap?.bold).toBe(true);
  expect(overlap?.script).toBe('super');
  expect(next.find((run) => run.start <= 8 && run.end > 8)?.bold).not.toBe(true);
});
