import { VISION_LAYOUTS } from './layouts';

import type { VisionLayout } from './layouts';
import type { TemplateElement } from './collageTemplates';

export interface VisionTemplate {
  canvas?: { width: number; height: number };
  id: string;
  title: string;
  category: 'travel' | 'home' | 'career' | 'wellness' | 'gratitude' | 'future' | 'love' | 'finance';
  description: string;
  prompt: string;
  accent: string;
  backgroundColor: string;
  heading: string;
  layout: VisionLayout;
  elements?: TemplateElement[];
}

export const LEGACY_VISION_TEMPLATE_STYLES: Record<
  string,
  {
    accent: [string, string];
    background: [string, string];
  }
> = {
  'travel-story': {
    accent: ['#e684a5', '#c84b73'],
    background: ['#fff6ed', '#fffaf6'],
  },
  'peaceful-home': {
    accent: ['#9a7fba', '#795a9d'],
    background: ['#f4f0f7', '#faf8fc'],
  },
  'career-growth': {
    accent: ['#cf4977', '#b4325a'],
    background: ['#fdf1f5', '#fff8fa'],
  },
  'wellness-rhythm': {
    accent: ['#5e9d8b', '#3f7f6d'],
    background: ['#eff8f4', '#f7fcfa'],
  },
  'daily-gratitude': {
    accent: ['#d69b4c', '#a96d24'],
    background: ['#fff8e8', '#fffbf2'],
  },
};

const layout = (id: string) => {
  const match = VISION_LAYOUTS.find((candidate) => candidate.id === id);
  if (!match) {
    throw new Error(`Missing template layout: ${id}`);
  }
  return match;
};

// Retain definitions for resizing boards saved with the retired basic layouts.
export const LEGACY_VISION_TEMPLATES: VisionTemplate[] = [
  {
    id: 'travel-story',
    title: 'Places I will explore',
    category: 'travel',
    description: 'A playful wall of destinations and memories.',
    prompt: 'Where do you want your next chapter to take you?',
    accent: '#c84b73',
    backgroundColor: '#fffaf6',
    heading: 'Places I will explore',
    layout: layout('postcards'),
  },
  {
    id: 'peaceful-home',
    title: 'A home that restores me',
    category: 'home',
    description: 'A calm collection for rooms, rituals and belonging.',
    prompt: 'What would make everyday life feel lighter?',
    accent: '#795a9d',
    backgroundColor: '#faf8fc',
    heading: 'A home that restores me',
    layout: layout('editorial'),
  },
  {
    id: 'career-growth',
    title: 'Work with meaning',
    category: 'career',
    description: 'One central ambition supported by practical milestones.',
    prompt: 'What contribution would make you proud?',
    accent: '#b4325a',
    backgroundColor: '#fff8fa',
    heading: 'Work with meaning',
    layout: layout('hero-four'),
  },
  {
    id: 'wellness-rhythm',
    title: 'My nourishing rhythm',
    category: 'wellness',
    description: 'Balance movement, rest, nourishment and connection.',
    prompt: 'How do you want to feel in your body each day?',
    accent: '#3f7f6d',
    backgroundColor: '#f7fcfa',
    heading: 'My nourishing rhythm',
    layout: layout('center-focus'),
  },
  {
    id: 'daily-gratitude',
    title: 'What already matters',
    category: 'gratitude',
    description: 'Nine everyday moments worth noticing.',
    prompt: 'Which ordinary moments make life feel rich?',
    accent: '#a96d24',
    backgroundColor: '#fffbf2',
    heading: 'What already matters',
    layout: layout('nine-grid'),
  },
];
export const VISION_TEMPLATES: VisionTemplate[] = [];
