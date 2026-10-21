import type { BoardDocument } from './document';
import type { PortableMedia } from './media';

export interface PublishedTemplate {
  id: string;
  title: string;
  description: string;
  preview: string;
  project: BoardDocument & { media?: PortableMedia[] };
}

export const publishedTemplates = Object.values(
  import.meta.glob<PublishedTemplate>('./publishedTemplates/*.json', {
    eager: true,
    import: 'default',
  }),
).sort((a, b) => a.title.localeCompare(b.title));
