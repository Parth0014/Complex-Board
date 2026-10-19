import type { BoardItem } from './document';
import { interlockingDesigns, interlockingFrames } from './interlockingGeometry';
import { create, build, bounds, valid, type Params } from './structuredDividers';
import { coverCrop } from './crop';
export interface CollageLayout {
  version: 1;
  group: string;
  preset: string;
  slot: number;
  count: number;
  width: number;
  height: number;
  params: Params;
}
const modelCache = new Map<string, ReturnType<typeof create>>();
function layoutModel(design: (typeof interlockingDesigns)[number], count: number, ratio: number) {
  const key = `${design.id}:${count}:${ratio}`;
  let model = modelCache.get(key);
  if (!model) {
    model = create(design, count, ratio);
    if (modelCache.size >= 64) modelCache.delete(modelCache.keys().next().value!);
    modelCache.set(key, model);
  }
  return model;
}
export function resolveCollage(items: BoardItem[], id?: string) {
  const meta = items.find((i) => i.id === id)?.collageLayout;
  if (
    !meta ||
    meta.version !== 1 ||
    meta.count < 5 ||
    meta.count > 10 ||
    !(meta.width > 0 && meta.height > 0)
  )
    return;
  const design = interlockingDesigns.find((d) => `interlocking:${d.id}` === meta.preset);
  if (!design) return;
  const members = items
    .filter((i) => i.collageLayout?.group === meta.group)
    .sort((a, b) => a.collageLayout!.slot - b.collageLayout!.slot);
  if (
    members.length !== meta.count ||
    members.some(
      (i, slot) =>
        i.collageLayout!.slot !== slot ||
        i.locked ||
        i.hidden ||
        i.rotation ||
        !i.scrapbookPhoto ||
        JSON.stringify(i.collageLayout!.params) !== JSON.stringify(meta.params),
    )
  )
    return;
  try {
    const model = layoutModel(design, meta.count, meta.width / meta.height),
      result = build(model, meta.params);
    if (!valid(model, result)) return;
    if (
      members.some((i, slot) => {
        const b = bounds(result.polygons[slot]);
        return (
          Math.abs(i.x - b.x * meta.width) > 0.05 ||
          Math.abs(i.y - b.y * meta.height) > 0.05 ||
          Math.abs(i.width - b.w * meta.width) > 0.05 ||
          Math.abs(i.height - b.h * meta.height) > 0.05
        );
      })
    )
      return;
    return { meta, members, model, result };
  } catch {
    return;
  }
}
/** Keep each source's focal point and uniform scale while its polygon changes. */
export function adjustedCollageItems(
  members: BoardItem[],
  params: Params,
  polygons: [number, number][][],
): BoardItem[] {
  return members.map((item, slot) => {
    const meta = item.collageLayout!,
      b = bounds(polygons[slot]);
    const x = b.x * meta.width,
      y = b.y * meta.height,
      width = b.w * meta.width,
      height = b.h * meta.height;
    const nw = item.asset?.width || item.width,
      nh = item.asset?.height || item.height;
    const old = item.crop || coverCrop(nw / nh, item.width / item.height);
    const scale = Math.max(item.width / (nw * old.width), item.height / (nh * old.height));
    const anchorX = item.x + item.width / 2,
      anchorY = item.y + item.height / 2;
    const nextScale = Math.max(scale, width / nw, height / nh);
    const cw = width / (nw * nextScale),
      ch = height / (nh * nextScale);
    const cx =
      old.x +
      old.width / 2 +
      ((x + width / 2 - anchorX) / (nw * nextScale)) * (item.flipX ? -1 : 1);
    const cy =
      old.y +
      old.height / 2 +
      ((y + height / 2 - anchorY) / (nh * nextScale)) * (item.flipY ? -1 : 1);
    return {
      ...item,
      x,
      y,
      width,
      height,
      crop: {
        x: Math.max(0, Math.min(1 - cw, cx - cw / 2)),
        y: Math.max(0, Math.min(1 - ch, cy - ch / 2)),
        width: cw,
        height: ch,
      },
      collageLayout: { ...meta, params },
      scrapbookPhoto: {
        ...item.scrapbookPhoto!,
        width,
        height,
        clip: polygons[slot].flatMap(([px, py]) => [
          (100 * (px - b.x)) / b.w,
          (100 * (py - b.y)) / b.h,
        ]),
      },
    };
  });
}
/** Recognise an untouched older study by its complete polygon geometry, never by
 * photo content. Upgrade only on the user's Adjust layout action. */
export function legacyCollage(items: BoardItem[], selected?: string) {
  const members = items.filter(
    (i) => i.kind === 'asset' && i.scrapbookPhoto?.style === 'raw' && !i.collageLayout,
  );
  if (
    members.length < 5 ||
    members.length > 10 ||
    !members.some((i) => i.id === selected) ||
    members.some((i) => i.locked || i.hidden || i.rotation)
  )
    return;
  const width = Math.max(...members.map((i) => i.x + i.width)),
    height = Math.max(...members.map((i) => i.y + i.height));
  for (const design of interlockingDesigns) {
    const frames = interlockingFrames(design, members.length, width / height);
    if (
      !members.every((i, slot) => {
        const f = frames[slot],
          clip = i.scrapbookPhoto?.clip;
        return (
          Math.abs(i.x - f.x * width) < 0.05 &&
          Math.abs(i.y - f.y * height) < 0.05 &&
          Math.abs(i.width - f.w * width) < 0.05 &&
          Math.abs(i.height - f.h * height) < 0.05 &&
          clip?.length === f.points.length * 2 &&
          f.points.every(
            ([x, y], j) =>
              Math.abs((i.x + (clip[j * 2] * i.width) / 100) / width - x) < 1e-6 &&
              Math.abs((i.y + (clip[j * 2 + 1] * i.height) / 100) / height - y) < 1e-6,
          )
        );
      })
    )
      continue;
    const model = create(design, members.length, width / height),
      params = model.initialParams;
    return members.map((i, slot) => ({
      ...i,
      collageLayout: {
        version: 1 as const,
        group: `legacy:${members[0].id}`,
        preset: `interlocking:${design.id}`,
        slot,
        count: members.length,
        width,
        height,
        params,
      },
    }));
  }
}
/** Copy frame membership as a complete layout or detach an individual photo.
 * A full-page collage stays at its authored origin; offsetting separate cells
 * would clamp each one differently and break their shared boundaries. */
export function copyCollageLayouts(
  sources: BoardItem[],
  copies: BoardItem[],
  board: { width: number; height: number },
): BoardItem[] {
  const complete = new Map<string, string>();
  const checked = new Set<string>();
  for (const [index, source] of sources.entries()) {
    const meta = source.collageLayout;
    if (!meta || checked.has(meta.group)) continue;
    checked.add(meta.group);
    if (
      meta &&
      !complete.has(meta.group) &&
      meta.width === board.width &&
      meta.height === board.height &&
      resolveCollage(sources, source.id)
    ) {
      complete.set(meta.group, copies[index].id);
    }
  }
  return copies.map((copy, index) => {
    const source = sources[index],
      meta = source.collageLayout;
    if (!meta) return copy;
    const group = complete.get(meta.group);
    return group
      ? {
          ...copy,
          x: source.x,
          y: source.y,
          collageLayout: { ...meta, group, params: structuredClone(meta.params) },
        }
      : { ...copy, collageLayout: undefined };
  });
}
