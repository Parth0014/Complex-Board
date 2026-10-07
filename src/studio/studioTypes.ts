/** Studio shell types for Module 1 (engine mounting + shell). */

export type StudioTab =
  'templates' | 'elements' | 'uploads' | 'text' | 'create' | 'background' | 'ai';

export const STUDIO_TABS: readonly StudioTab[] = [
  'templates',
  'elements',
  'uploads',
  'text',
  'create',
  'background',
  'ai',
];

/** Which build module delivers each tab's real panel. */
export const STUDIO_TAB_MODULE: Record<StudioTab, number> = {
  templates: 3,
  elements: 4,
  text: 4,
  uploads: 4,
  create: 4,
  background: 4,
  ai: 5,
};

export const STUDIO_TAB_LABELS: Record<StudioTab, string> = {
  templates: 'Templates',
  elements: 'Elements',
  text: 'Text',
  uploads: 'Uploads',
  create: 'Create',
  background: 'Background',
  ai: 'AI',
};
