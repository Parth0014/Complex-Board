import elementTopics from './elementTopics.json';

export const ELEMENT_THEMES = [
  { id: 'love', label: 'Love & Connection' },
  { id: 'health', label: 'Health & Wellness' },
  { id: 'growth', label: 'Growth & Confidence' },
  { id: 'calm', label: 'Calm & Rest' },
  { id: 'joy', label: 'Joy & Gratitude' },
  { id: 'career', label: 'Career & Purpose' },
  { id: 'money', label: 'Money & Abundance' },
  { id: 'travel', label: 'Travel & Adventure' },
  { id: 'home', label: 'Home & Comfort' },
  { id: 'nature', label: 'Nature & Wonder' },
  { id: 'planning', label: 'Dreams & Goals' },
  { id: 'creative', label: 'Creative Essentials' },
  { id: 'faith', label: 'Faith & Spirituality' },
] as const;

const decodeText = (text: string) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

export function describeElement(folder: string, name: string, svg: string) {
  const words = [...svg.matchAll(/<(?:text|tspan)\b[^>]*>([^<]*)/g)]
    .map((match) => decodeText(match[1]).trim())
    .filter(Boolean)
    .join(' ');
  const friendlyName = name.replace(/^(?:dark-|label-|torn-)/, '').replace(/-/g, ' ');
  let title = words || friendlyName;
  if (folder.startsWith('letters-')) {
    const symbols: Record<string, string> = {
      amp: '&',
      excl: '!',
      quest: '?',
      hash: '#',
      heart: 'Heart',
      star: 'Star',
    };
    const glyph = symbols[name] || name.replace('-lower', '').toLowerCase();
    title =
      (folder === 'letters-soft' ? glyph : glyph.length === 1 ? glyph.toUpperCase() : glyph) +
      ' · ' +
      folder.replace('letters-', '') +
      ' lettering';
  } else if (folder === 'calendar-2027') {
    title = name.replace(/^\d+-/, '') + ' 2027';
  }
  title = title.charAt(0).toUpperCase() + title.slice(1);
  // Topic order is editorial: the first topic is the primary browse section.
  // Filenames and isolated words cannot express the meaning of an affirmation.
  const key = `${folder}/${name}` as keyof typeof elementTopics;
  const topics = elementTopics[key] || ['creative'];
  return { title, topics: [...new Set(topics)] };
}
