export const TEMPLATE_DRAFT_PREFIX = 'template-draft:';
const KEY = 'visbo:template-maker:drafts:v1';
export interface TemplateDraftMeta {
  id: string;
  description: string;
  sourceId?: string;
  publishedAt?: number;
  publishedId?: string;
}
export function readTemplateDraftMeta(owner: Window): TemplateDraftMeta[] {
  const raw = owner.localStorage.getItem(KEY);
  if (!raw) return [];
  const entries: unknown = JSON.parse(raw);
  if (
    !Array.isArray(entries) ||
    entries.some(
      (entry) =>
        !entry ||
        typeof entry.id !== 'string' ||
        !entry.id.startsWith(TEMPLATE_DRAFT_PREFIX) ||
        typeof entry.description !== 'string' ||
        (entry.sourceId !== undefined && typeof entry.sourceId !== 'string') ||
        (entry.publishedAt !== undefined && !Number.isFinite(entry.publishedAt)) ||
        (entry.publishedId !== undefined && !/^studio-[a-zA-Z0-9-]{1,80}$/.test(entry.publishedId)),
    )
  )
    throw new Error('Template details could not be read. Your saved drafts have not been cleared.');
  return entries;
}
export function writeTemplateDraftMeta(owner: Window, entry: TemplateDraftMeta) {
  const entries = readTemplateDraftMeta(owner).filter((candidate) => candidate.id !== entry.id);
  owner.localStorage.setItem(KEY, JSON.stringify([...entries, entry]));
}
export const publishedIdFor = (id: string) => 'studio-' + id.replace(/[^a-zA-Z0-9-]/g, '-');
