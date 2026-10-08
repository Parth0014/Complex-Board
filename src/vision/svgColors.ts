const paintPattern =
  /((?:fill|stroke)\s*=\s*["']|(?:fill|stroke)\s*:\s*)(#[\da-f]{6}\b|#[\da-f]{3}\b|currentColor)(?=["';\s}])/gi;

export function svgSource(url: string) {
  if (!url.startsWith('data:image/svg+xml,')) return '';
  try {
    return decodeURIComponent(url.slice('data:image/svg+xml,'.length));
  } catch {
    return '';
  }
}

export function svgColors(url: string) {
  return [...new Set([...svgSource(url).matchAll(paintPattern)].map((m) => m[2].toLowerCase()))];
}

export function replaceSvgColors(source: string, overrides: Record<string, string>) {
  return source.replace(paintPattern, (match, prefix: string, color: string) =>
    overrides[color.toLowerCase()] ? `${prefix}${overrides[color.toLowerCase()]}` : match,
  );
}

export function svgColorValue(color: string) {
  if (color === 'currentcolor') return '#000000';
  return color.length === 4 ? `#${[...color.slice(1)].map((c) => c + c).join('')}` : color;
}
