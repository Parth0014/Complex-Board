export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  script?: 'normal' | 'super' | 'sub';
}

export interface TextRun extends TextStyle {
  start: number;
  end: number;
}

export function isSameStyle(a?: TextStyle, b?: TextStyle): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    !!a.bold === !!b.bold &&
    !!a.italic === !!b.italic &&
    !!a.underline === !!b.underline &&
    !!a.strike === !!b.strike &&
    (a.color || undefined) === (b.color || undefined) &&
    (a.script || 'normal') === (b.script || 'normal')
  );
}

export function formatRange(
  text: string,
  runs: TextRun[],
  start: number,
  end: number,
  patch: TextStyle,
): TextRun[] {
  const styles = Array.from({ length: text.length }, (_, index) => ({
    ...runs.find((run) => index >= run.start && index < run.end),
    start: undefined,
    end: undefined,
  }));
  for (let index = Math.max(0, start); index < Math.min(text.length, end); index++)
    styles[index] = { ...styles[index], ...patch };
  const result: TextRun[] = [];
  styles.forEach((style, index) => {
    const previous = result.at(-1);
    if (previous && isSameStyle(previous, style)) {
      previous.end = index + 1;
    } else {
      result.push({ ...style, start: index, end: index + 1 });
    }
  });
  return result.filter(
    (run) =>
      run.bold ||
      run.italic ||
      run.underline ||
      run.strike ||
      run.color ||
      (run.script && run.script !== 'normal'),
  );
}

export function isRangeActive(
  runs: TextRun[],
  start: number,
  end: number,
  prop: keyof TextStyle,
  expectedVal: unknown = true,
): boolean {
  if (start >= end) return false;
  for (let i = start; i < end; i++) {
    const run = runs.find((r) => i >= r.start && i < r.end);
    const val = run ? run[prop] : undefined;
    if (prop === 'script') {
      if ((val || 'normal') !== expectedVal) return false;
    } else {
      if (!!val !== !!expectedVal) return false;
    }
  }
  return true;
}

export function shiftRuns(runs: TextRun[], oldText: string, newText: string): TextRun[] {
  if (!runs || !runs.length) return [];
  if (oldText === newText) return runs;

  let prefix = 0;
  while (
    prefix < oldText.length &&
    prefix < newText.length &&
    oldText[prefix] === newText[prefix]
  ) {
    prefix++;
  }

  let oldSuffix = oldText.length - 1;
  let newSuffix = newText.length - 1;
  while (
    oldSuffix >= prefix &&
    newSuffix >= prefix &&
    oldText[oldSuffix] === newText[newSuffix]
  ) {
    oldSuffix--;
    newSuffix--;
  }

  const removedLen = oldSuffix - prefix + 1;
  const insertedLen = newSuffix - prefix + 1;
  const delta = insertedLen - removedLen;

  const adjusted: TextRun[] = [];
  for (const run of runs) {
    let { start, end } = run;

    if (end <= prefix) {
      adjusted.push({ ...run, start, end });
      continue;
    }

    if (start >= prefix + removedLen) {
      adjusted.push({ ...run, start: start + delta, end: end + delta });
      continue;
    }

    const overlapStart = Math.max(start, prefix);
    const overlapEnd = Math.min(end, prefix + removedLen);
    const lostInRun = overlapEnd - overlapStart;

    if (start < prefix) {
      end = Math.max(start, end - lostInRun + insertedLen);
      if (end > start) adjusted.push({ ...run, start, end });
    } else {
      start = prefix + insertedLen;
      end = Math.max(start, end + delta);
      if (end > start) adjusted.push({ ...run, start, end });
    }
  }

  return adjusted
    .map((r) => ({
      ...r,
      start: Math.max(0, Math.min(newText.length, r.start)),
      end: Math.max(0, Math.min(newText.length, r.end)),
    }))
    .filter((r) => r.start < r.end);
}
