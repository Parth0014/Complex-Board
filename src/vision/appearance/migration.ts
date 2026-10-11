import type { BoardItem } from '../document';
import { validateBoard } from '../storage';
import { shapeGeometry } from '../shapeGeometry';
import {
  LEGACY_APPEARANCE_FIELDS,
  type Appearance,
  type CanonicalDocument,
  type CanonicalItem,
  type EditableItem,
} from './types';
import { normalizeAppearance, record } from './validation';

/** Match existing renderer defaults, not the inconsistent old inspector fallbacks. */
export function migrateItem(item: BoardItem): CanonicalItem {
  if (item.kind === 'asset') return structuredClone(item) as BoardItem & { kind: 'asset' };
  const open =
    item.kind === 'shape' &&
    (item.shape === 'line' || item.shape === 'arrow') &&
    !(item.vectorPath && item.vectorBox);
  const drawing = item.kind === 'drawing';
  const fillColor = item.color || item.fill || '#b48ce3';
  const glow = item.effect === 'glow';
  const base = {
    version: 1,
    opacity: item.opacity,
    effect: item.effect || 'none',
    silhouette: {
      width: Math.max(0, Math.min(30, item.stickerWidth || 0)),
      color: item.stickerColor || '#ffffff',
    },
    shadow: {
      enabled: !open && ((!!item.shadow && item.shadow !== 'none') || glow),
      color: item.shadowColor || (glow ? item.color || '#b48ce3' : '#000'),
      opacity: item.shadowOpacity ?? (glow ? 0.8 : 0.25),
      blur:
        item.shadowBlur ??
        (glow ? 20 : item.shadow === 'soft' ? 20 : item.shadow === 'medium' ? 10 : 0),
      offsetX: item.shadowOffsetX ?? (item.shadow === 'hard' ? 6 : glow ? 0 : 3),
      offsetY: item.shadowOffsetY ?? (item.shadow === 'hard' ? 6 : glow ? 0 : 5),
    },
    stroke: {
      color: open || drawing ? item.color || '#33272b' : item.borderColor || '#33272b',
      width: drawing
        ? item.strokeWidth || 4
        : open
          ? item.borderWidth || item.strokeWidth || 4
          : item.kind === 'text'
            ? item.borderWidth || (item.effect === 'outline' ? 2 : 0)
            : item.effect === 'outline'
              ? Math.max(2, item.borderWidth || 0)
              : item.borderWidth || 0,
      style: item.borderStyle || 'solid',
      cap: open || drawing ? 'round' : 'butt',
      join: item.kind === 'text' || open || drawing ? 'round' : 'miter',
      scaling:
        item.kind === 'shape' &&
        ((item.vectorPath && item.vectorBox) ||
          (shapeGeometry[item.shape || ''] && item.shape !== 'rectangle'))
          ? 'fixed'
          : 'transform',
    },
  };
  const kind =
    item.kind === 'text' ? 'text' : drawing ? 'drawing' : open ? 'open-shape' : 'closed-shape';
  const hasFill = kind === 'text' || kind === 'closed-shape';
  const appearance = normalizeAppearance({
    ...base,
    kind,
    ...(hasFill
      ? {
          fill: {
            enabled: !item.noFill,
            paint: item.gradient
              ? {
                  kind: item.gradientType === 'radial' ? 'radial' : 'linear',
                  stops: [fillColor, item.gradient],
                }
              : {
                  kind: 'solid',
                  color:
                    item.kind === 'text' &&
                    (item.textRuns?.length || item.kerning === false || item.ligatures === false)
                      ? item.color || '#33272b'
                      : fillColor,
                },
          },
        }
      : {}),
    ...(kind === 'text' ? { background: item.textBackground || null } : {}),
  });
  const data = { ...structuredClone(item) } as Partial<BoardItem>;
  for (const key of LEGACY_APPEARANCE_FIELDS) delete data[key];
  return { ...data, appearance } as EditableItem;
}

function validateItems(value: unknown): CanonicalItem[] {
  if (!Array.isArray(value)) throw new Error('Invalid canonical items.');
  return value.map((raw) => {
    const item = record(raw);
    if (item.kind === 'asset') {
      if ('appearance' in item) throw new Error('Assets cannot have editable appearance.');
      return structuredClone(item) as unknown as CanonicalItem;
    }
    if (!['text', 'shape', 'drawing'].includes(String(item.kind)))
      throw new Error('Invalid item kind.');
    if (LEGACY_APPEARANCE_FIELDS.some((key) => key in item))
      throw new Error('Canonical objects cannot contain legacy appearance fields.');
    const appearance = normalizeAppearance(item.appearance);
    const open =
      item.kind === 'shape' &&
      (item.shape === 'line' || item.shape === 'arrow') &&
      !(item.vectorPath && item.vectorBox);
    const kind = item.kind === 'shape' ? (open ? 'open-shape' : 'closed-shape') : item.kind;
    if (appearance.kind !== kind) throw new Error('Appearance kind does not match object.');
    return { ...structuredClone(item), appearance } as EditableItem;
  });
}
/** Geometry/provider validation remains the existing document validator's responsibility. */
export function validateCanonicalDocument(value: unknown): CanonicalDocument {
  const document = record(value);
  if (document.version !== 3) throw new Error('Unsupported canonical document version.');
  const items = validateItems(document.items);
  if (document.pages !== undefined && !Array.isArray(document.pages))
    throw new Error('Invalid pages.');
  const pages = (document.pages as unknown[] | undefined)?.map((raw) => {
    const page = record(raw);
    return { ...structuredClone(page), items: validateItems(page.items) };
  });
  // A validation-only geometry view. Never serialized or rendered, and never
  // reintroduces legacy appearance into the canonical document.
  const geometry = (list: CanonicalItem[]) =>
    list.map((item) =>
      item.kind === 'asset' ? item : { ...item, opacity: item.appearance.opacity },
    );
  validateBoard({
    ...document,
    version: 2,
    items: geometry(items),
    ...(pages ? { pages: pages.map((page) => ({ ...page, items: geometry(page.items) })) } : {}),
  });
  return { ...structuredClone(document), items, ...(pages ? { pages } : {}) } as CanonicalDocument;
}

/** One-way, deterministic and idempotent. Deliberately not imported by live loading code in B. */
export function migrateDocument(value: unknown): CanonicalDocument {
  const raw = record(value);
  if (raw.version === 3) return validateCanonicalDocument(raw);
  const legacy = validateBoard(raw);
  if (
    legacy.items.some((item) => 'appearance' in item) ||
    legacy.pages?.some((page) => page.items.some((item) => 'appearance' in item))
  )
    throw new Error('Mixed legacy and canonical document.');
  return validateCanonicalDocument({
    ...legacy,
    version: 3,
    items: legacy.items.map(migrateItem),
    ...(legacy.pages
      ? { pages: legacy.pages.map((page) => ({ ...page, items: page.items.map(migrateItem) })) }
      : {}),
  });
}

export interface CanonicalBackup {
  document: CanonicalDocument;
  media: unknown;
}
/** Portable media stays opaque here; existing media validation/resolution runs on activation. */
export function migrateBackup(value: unknown): CanonicalBackup {
  const { media, ...document } = record(value);
  return { document: migrateDocument(document), media: structuredClone(media) };
}
export function migrateClipboard(value: unknown, target: unknown) {
  const envelope = record(value);
  if (
    envelope.type !== 'gratitude-board-selection' ||
    ![1, 2].includes(envelope.version as number) ||
    !Number.isInteger(envelope.depth) ||
    Number(envelope.depth) < 0 ||
    Number(envelope.depth) > 20
  )
    throw new Error('Invalid clipboard selection.');
  const board = record(target);
  const prepared = migrateDocument({
    ...board,
    version: envelope.version === 1 ? 2 : 3,
    items: envelope.items,
    pages: undefined,
    activePageId: undefined,
  });
  return {
    type: 'gratitude-board-selection' as const,
    version: 2 as const,
    depth: envelope.depth as number,
    items: prepared.items,
  };
}

export function appearanceOf(item: CanonicalItem): Appearance | undefined {
  return item.kind === 'asset' ? undefined : item.appearance;
}
