import { expect, it } from 'vitest';
import { formatRange, isSameStyle, isRangeActive, shiftRuns } from './text';

it('preserves prior formatting while editing an overlapping range', () => {
  const first = formatRange('Dream big', [], 0, 5, { bold: true });
  const next = formatRange('Dream big', first, 3, 9, { script: 'super' });
  expect(next.find((run) => run.start <= 2 && run.end > 2)?.bold).toBe(true);
  const overlap = next.find((run) => run.start <= 4 && run.end > 4);
  expect(overlap?.bold).toBe(true);
  expect(overlap?.script).toBe('super');
  expect(next.find((run) => run.start <= 8 && run.end > 8)?.bold).not.toBe(true);
});

it('correctly compares styles regardless of object key order', () => {
  expect(isSameStyle({ bold: true, italic: true }, { italic: true, bold: true })).toBe(true);
  expect(isSameStyle({ script: 'normal' }, {})).toBe(true);
  expect(isSameStyle({ bold: true }, { bold: false })).toBe(false);
});

it('detects if range is active and supports toggling', () => {
  const runs = formatRange('Hello world', [], 0, 5, { bold: true });
  expect(isRangeActive(runs, 0, 5, 'bold')).toBe(true);
  expect(isRangeActive(runs, 0, 7, 'bold')).toBe(false);
  expect(isRangeActive(runs, 6, 11, 'bold')).toBe(false);
});

it('shifts runs accurately on insertion, deletion and editing', () => {
  const original = formatRange('Hello world', [], 6, 11, { bold: true }); // "world" is bold
  // Insert "brave new " before "world"
  const inserted = shiftRuns(original, 'Hello world', 'Hello brave new world');
  expect(inserted[0].start).toBe(16);
  expect(inserted[0].end).toBe(21);
  expect(inserted[0].bold).toBe(true);

  // Delete "brave new "
  const deleted = shiftRuns(inserted, 'Hello brave new world', 'Hello world');
  expect(deleted[0].start).toBe(6);
  expect(deleted[0].end).toBe(11);
});
