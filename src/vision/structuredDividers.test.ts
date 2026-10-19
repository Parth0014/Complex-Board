import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as engine from './structuredDividers';
import { interlockingDesigns } from './interlockingGeometry';
it('retains approved V3 geometry and divider responses across all families and orientations', () => {
  const ctx: Record<string, unknown> = {};
  for (const file of ['layouts', 'structured-dividers'])
    runInNewContext(
      readFileSync(
        new URL(`../../design/collage-studies/interlocking/${file}.js`, import.meta.url),
        'utf8',
      ),
      ctx,
    );
  const html = ctx.StructuredDividers as typeof engine;
  for (const d of interlockingDesigns)
    for (const count of [5, 10])
      for (const ratio of [9 / 16, 1, 16 / 9]) {
        const m = engine.create(d, count, ratio),
          ref = html.create(d, count, ratio);
        expect(JSON.stringify(engine.build(m, m.initialParams))).toBe(
          JSON.stringify(html.build(ref, ref.initialParams)),
        );
        const a = engine.build(m, m.initialParams).dividers[0],
          b = html.build(ref, ref.initialParams).dividers[0];
        expect(JSON.stringify(engine.move(m, m.initialParams, a, 0.015))).toBe(
          JSON.stringify(html.move(ref, ref.initialParams, b, 0.015)),
        );
      }
}, 30000);
