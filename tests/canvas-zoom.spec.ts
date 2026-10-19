import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('continuous zoom reuses artwork, settles to editable full quality and preserves its anchor', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => {
    for (let i = 0; i < 30; i++) adapter.createShape(i % 2 ? 'circle' : 'rectangle');
    adapter.select([]);
  });
  const result = await handle.evaluate(async ({ adapter, stage }) => {
    const art = stage.findOne('#artboard')!;
    const first = art.children![1];
    let draws = 0;
    const original = first.drawScene;
    first.drawScene = function (...args: Parameters<typeof original>) {
      draws++;
      return original.apply(this, args);
    };
    const doc = adapter.history.document;
    adapter.zoomView!(0.5);
    const cached = art.isCached();
    for (let i = 0; i < 8; i++) {
      adapter.zoomView!(0.5 + i * 0.02);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    first.drawScene = original;
    return { cached, draws, unchanged: doc === adapter.history.document };
  });
  expect(result.cached).toBe(true);
  expect(result.draws).toBeLessThan(5);
  expect(result.unchanged).toBe(true);
  await expect
    .poll(() => handle.evaluate(({ stage }) => stage.findOne('#artboard')!.isCached()))
    .toBe(false);
  const zoom = page.getByRole('slider', { name: 'Zoom', exact: true });
  await zoom.focus();
  await zoom.press('Home');
  await expect(zoom).toHaveValue('10');
  await zoom.press('ArrowRight');
  await expect(zoom).toHaveValue('11');
  const viewport = page.locator('[data-scale]');
  const rect = (await viewport.boundingBox())!;
  const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  const before = await viewport.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      x:
        (el.scrollLeft + r.width / 2 - Number(el.getAttribute('data-page-left'))) /
        Number(el.getAttribute('data-scale')),
      y:
        (el.scrollTop + r.height / 2 - Number(el.getAttribute('data-page-top'))) /
        Number(el.getAttribute('data-scale')),
    };
  });
  await page.mouse.move(point.x, point.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -80);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => Number(await viewport.getAttribute('data-scale')))
    .toBeGreaterThan(0.11);
  const after = await viewport.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      x:
        (el.scrollLeft + r.width / 2 - Number(el.getAttribute('data-page-left'))) /
        Number(el.getAttribute('data-scale')),
      y:
        (el.scrollTop + r.height / 2 - Number(el.getAttribute('data-page-top'))) /
        Number(el.getAttribute('data-scale')),
    };
  });
  expect(Math.abs(after.x - before.x)).toBeLessThan(12);
  expect(Math.abs(after.y - before.y)).toBeLessThan(12);
  await expect
    .poll(() => handle.evaluate(({ stage }) => stage.findOne('#artboard')!.isCached()))
    .toBe(false);

  const wheelScale = Number(await viewport.getAttribute('data-scale'));
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 80);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => Number(await viewport.getAttribute('data-scale')))
    .toBeLessThan(wheelScale);
  const track = (await zoom.boundingBox())!;
  await page.mouse.move(track.x + 8, track.y + track.height / 2);
  await page.mouse.down();
  await page.mouse.move(track.x + track.width - 8, track.y + track.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await viewport.getAttribute('data-scale')))
    .toBeGreaterThan(1.2);
  await page.mouse.down();
  await page.mouse.move(track.x + 8, track.y + track.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await viewport.getAttribute('data-scale')))
    .toBeLessThan(0.3);
  await handle.evaluate(({ adapter }) => {
    adapter.zoomView!(0.7);
    adapter.patchItems([{ id: adapter.history.document.items[0].id, patch: { x: 120 } }]);
  });
  await expect
    .poll(() => handle.evaluate(({ stage }) => stage.findOne('#artboard')!.isCached()))
    .toBe(false);
  await handle.evaluate(({ adapter }) => adapter.select([adapter.history.document.items[0].id]));
  await expect(page.getByRole('toolbar', { name: 'Selected object actions' })).toBeVisible();
});
