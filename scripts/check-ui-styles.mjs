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
for (const file of walk(root).filter((file) => file.endsWith('.css'))) {
  const css = readFileSync(file, 'utf8');
  const name = relative(root, file);
  const report = (message) => errors.push(name + ': ' + message);
  if (css.includes('!important')) report('Remove the override and resolve its cascade.');
  if (/--vs-/.test(css)) report('Use the shared --gs-* tokens.');
  for (const [, token] of css.matchAll(/var\((--gs-[\w-]+)/g)) {
    if (!tokens.has(token)) report('Undefined token ' + token);
  }
  if (file !== resolve(root, 'design-system/foundations.css')) {
    if (/--fluent-/.test(css)) report('Keep Fluent aliases in foundations.css.');
    if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(css)) report('Keep palette values in foundations.css.');
    if (/font-size\s*:\s*[^;{}]*\d+(?:px|rem)/.test(css)) report('Use the five typography tokens.');
  }
}
if (errors.length) {
  console.error([...new Set(errors)].join('\n'));
  process.exitCode = 1;
} else console.log('UI styles: shared tokens and cascade checks passed.');
