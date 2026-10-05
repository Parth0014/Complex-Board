import { expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

it('keeps the new runtime independent of Excalidraw and Studio independent of Konva', () => {
  const root = resolve('src');
  const walk = (folder: string): string[] =>
    readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
      const path = resolve(folder, entry.name);
      return entry.isDirectory()
        ? walk(path)
        : /\.tsx?$/.test(path) && !/\.test\.ts$/.test(path)
          ? [path]
          : [];
    });
  for (const path of walk(root)) {
    const source = readFileSync(path, 'utf8');
    const imports = [
      ...source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]([^'"]+)['"]/g),
    ].map((match) => match[1]);
    expect(
      imports.some((name) => name.startsWith('@excalidraw/')),
      relative(root, path),
    ).toBe(false);
    if (!relative(root, path).replaceAll('\\', '/').startsWith('vision/canvas/')) {
      expect(
        imports.some((name) => /^(?:react-konva|konva)(?:\/|$)/.test(name)),
        relative(root, path),
      ).toBe(false);
    }
    if (relative(root, path).startsWith('studio'))
      expect(source, relative(root, path)).not.toMatch(/from\s*['"][^'"]*(?:konva|canvas\/)/i);
  }
});
