import type { BoardItem } from '../vision/document';

/** Hidden objects stay outside both keyboard and menu select-all commands. */
export function selectableIds(items: readonly BoardItem[]): string[] {
  return items.filter((item) => !item.hidden).map((item) => item.id);
}
