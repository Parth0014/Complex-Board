import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const root = resolve('src/studio');
const walk = (folder) =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = resolve(folder, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
const foundation = readFileSync(resolve(root, 'design-system/foundations.css'), 'utf8');
const tokens = new Set([...foundation.matchAll(/(--gs-[\w-]+)\s*:/g)].map((match) => match[1]));
const errors = [];
const breakpointValues = Object.values(
  JSON.parse(readFileSync(resolve(root, 'design-system/breakpoints.json'), 'utf8')),
);

for (const file of walk(root).filter((file) => file.endsWith('.css'))) {
  const css = readFileSync(file, 'utf8');
  const name = relative(root, file);
  const report = (message) => errors.push(name + ': ' + message);
  if (css.includes('!important')) report('Remove the override and resolve its cascade.');
  if (/--vs-/.test(css)) report('Use the shared --gs-* tokens.');
  if (/transition\s*:\s*[^;{}]*\ball\b/.test(css))
    report('Forbid transition: all; list properties explicitly.');
  checkHoverGating(css, report);
  for (const [, params] of css.matchAll(/@media\s+([^{}]+)/g)) {
    for (const [, kind, value] of params.matchAll(/(max|min)-width:\s*(\d+)px/g)) {
      if (!breakpointValues.includes(Number(value) - (kind === 'min' ? 1 : 0)))
        report('Use a shared compact, tablet or desktop breakpoint: ' + value + 'px');
    }
  }
  for (const [, token] of css.matchAll(/var\((--gs-[\w-]+)/g)) {
    if (!tokens.has(token)) report('Undefined token ' + token);
  }
  if (file !== resolve(root, 'design-system/foundations.css')) {
    if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(css)) report('Keep palette values in foundations.css.');
    if (/font-size\s*:\s*[^;{}]*\d+(?:px|rem)/.test(css)) report('Use the typography tokens.');
  }
}
/**
 * Item 46: `:hover` styles must sit inside a `@media (hover: hover)` block so
 * touch devices never get stuck hover styles. `:focus-visible` rules are exempt.
 */
function checkHoverGating(css, report) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const mediaStack = [];
  let depth = 0;
  let i = 0;
  const n = stripped.length;
  while (i < n) {
    if (stripped.startsWith('@media', i) && i + 6 < n && /[\s(]/.test(stripped[i + 6])) {
      const brace = stripped.indexOf('{', i + 6);
      if (brace === -1) break;
      const condition = stripped.slice(i + 6, brace);
      mediaStack.push({
        bodyDepth: depth + 1,
        gated: /\(\s*hover\s*:\s*hover\s*\)/.test(condition),
      });
      i = brace;
      continue;
    }
    const ch = stripped[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      while (mediaStack.length && mediaStack[mediaStack.length - 1].bodyDepth > depth)
        mediaStack.pop();
    } else if (stripped.startsWith(':hover', i)) {
      const lineStart = stripped.lastIndexOf('\n', i) + 1;
      const lineEnd = stripped.indexOf('\n', i);
      const line = stripped.slice(lineStart, lineEnd === -1 ? n : lineEnd);
      const gated = mediaStack.some((m) => m.gated);
      if (!gated && !/:focus-visible/.test(line)) {
        report('`:hover` outside a `@media (hover: hover)` block.');
      }
      i += 6;
      continue;
    }
    i++;
  }
}

if (errors.length) {
  console.error([...new Set(errors)].join('\n'));
  process.exitCode = 1;
} else console.log('UI styles: shared tokens and cascade checks passed.');
