import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import postcss from 'postcss';
import { execFileSync } from 'node:child_process';

const baseline = process.argv.find((argument) => argument.startsWith('--baseline='))?.slice(11);
let baselineRules = 0;
let baselineBraces = 0;
if (baseline) {
  const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline, '--', 'src'], {
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter((path) => path.endsWith('.css'));
  for (const path of paths) {
    const css = execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
    baselineBraces += (css.match(/\{/g) || []).length;
    postcss.parse(css).walkRules(() => baselineRules++);
  }
  console.log(
    `Baseline ${baseline}: ${baselineRules} PostCSS rules; ${baselineBraces} opening braces.`,
  );
}

const files = (path) =>
  readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const next = resolve(path, entry.name);
    return entry.isDirectory() ? files(next) : next.endsWith('.css') ? [next] : [];
  });
const selectors = new Map();
let braces = 0;
let rules = 0;
for (const file of files(resolve('src'))) {
  const css = readFileSync(file, 'utf8');
  braces += (css.match(/\{/g) || []).length;
  let count = 0;
  postcss.parse(css).walkRules((rule) => {
    count++;
    const parents = [];
    for (let node = rule.parent; node; node = node.parent) {
      if (node.type === 'atrule') parents.unshift(`@${node.name} ${node.params}`);
    }
    const key = `${parents.join(' > ')} | ${rule.selector.replace(/\s+/g, ' ').trim()}`;
    selectors.set(key, (selectors.get(key) || 0) + 1);
  });
  rules += count;
  console.log(`${relative(process.cwd(), file)}: ${count} PostCSS rules`);
}
console.log(
  `Total: ${rules} PostCSS rules (including keyframe steps); ${braces} opening braces (brief metric).`,
);
if (baseline) {
  console.log(
    `Change: ${rules - baselineRules} PostCSS rules; ${braces - baselineBraces} opening braces.`,
  );
}
console.log(
  `Repeated selector/context pairs: ${[...selectors.values()].filter((count) => count > 1).length}.`,
);
if (process.argv.includes('--duplicates')) {
  for (const [selector, count] of selectors) if (count > 1) console.log(`${count}x ${selector}`);
}
