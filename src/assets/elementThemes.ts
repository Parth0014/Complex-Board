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
] as const;

const themeRules: [string, RegExp][] = [
  [
    'love',
    /\b(love|kind|kindly|kindness|friend|friends|family|people|connection|heart|hearts|ring|letter)\b/,
  ],
  [
    'health',
    /\b(health|healthy|wellness|fitness|body|feed|food|care|self care|move|movement|dumbbell|dumbbells|yoga|sneaker|juice|salad|smoothie|avocado|strawberries|lemon)\b/,
  ],
  [
    'growth',
    /\b(growth|grow|growing|progress|learn|learning|skills|lesson|brave|scared|confident|proud|effort|step|steps|begin|start|small|pace|bloom|enough|perfection|control|feelings|space|setbacks|curious|worth|did it|on my way|little by little|steady)\b/,
  ],
  [
    'calm',
    /\b(calm|peace|rest|breath|breathe|slowly|soften|gentle|balance|meditation|sleep|sleeping|bed|bathtub|candle|nights|mornings|letting go|one day at a time|one task|less scrolling)\b/,
  ],
  [
    'joy',
    /\b(joy|happy|happiness|grateful|gratitude|thankful|thank|smile|good|pleasure|win|memories|memory|ordinary|glow|yes|celebrate|confetti)\b/,
  ],
  [
    'career',
    /\b(career|work|job|business|purpose|ideas|task|effort|skills|briefcase|laptop|diploma|graduation|trophy|wristwatch|show up)\b/,
  ],
  [
    'money',
    /\b(money|savings|saving|debt|cash|coin|coins|stacks|credit|piggy|worth|diamond|freedom)\b/,
  ],
  [
    'travel',
    /\b(travel|adventure|places|world|wander|arrived|next stop|boarding|pass|plane|airplane|globe|camera|suitcase|ticket|passport|map|mountains|beach|palm|tent|sunset|sunsets|sunglasses|balloon)\b/,
  ],
  [
    'home',
    /\b(home|house|cozy|armchair|bathtub|bed|teapot|latte|coffee|keys|key|photo frame|cat|mornings)\b/,
  ],
  [
    'nature',
    /\b(botanicals|flowers|flower|plant|leaf|blossom|fern|eucalyptus|ginkgo|gypsophila|grass|poppy|daisy|lavender|rose|tulip|violet|hydrangea|pansy|cosmos|camellia|butterfly|sky|cloud|clouds|moon|rainbow|saturn|star|stars|sun|sparkle|cherries|waves)\b/,
  ],
  [
    'planning',
    /\b(vision|dream|dreams|goal|goals|habit|2027|year|month|focus|hope|soon|looking forward)\b/,
  ],
];

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
  const content = (
    words +
    ' ' +
    (folder === 'affirmations' ? '' : name.replace(/-/g, ' '))
  ).toLowerCase();
  const topics = themeRules.filter(([, rule]) => rule.test(content)).map(([id]) => id);
  if (
    folder.startsWith('letters-') ||
    ['frames', 'patterns', 'washi-tape'].includes(folder) ||
    !topics.length
  )
    topics.push('creative');
  return { title, topics: [...new Set(topics)] };
}
