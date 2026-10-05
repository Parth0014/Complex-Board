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
    if (
      previous &&
      JSON.stringify({ ...previous, start: undefined, end: undefined }) === JSON.stringify(style)
    )
      previous.end = index + 1;
    else result.push({ ...style, start: index, end: index + 1 });
  });
  return result;
}
