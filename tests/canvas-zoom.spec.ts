import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('continuous zoom reuses artwork, settles to editable full quality and stays centered', async ({
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
    return {
      x:
        (el.clientWidth / 2 - Number(el.getAttribute('data-page-left'))) /
        Number(el.getAttribute('data-scale')),
      y:
        (el.clientHeight / 2 - Number(el.getAttribute('data-page-top'))) /
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
    return {
      x:
        (el.clientWidth / 2 - Number(el.getAttribute('data-page-left'))) /
        Number(el.getAttribute('data-scale')),
      y:
        (el.clientHeight / 2 - Number(el.getAttribute('data-page-top'))) /
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

test('horizontal scrolling is available only when the board exceeds the viewport', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'Dismiss canvas introduction' }).click();
  const viewport = page.locator('.gs-artboard');
  const surface = page.locator('.konvajs-content');
  await surface.hover();
  const before = await viewport.evaluate((node) => ({ x: node.scrollLeft, y: node.scrollTop }));
  await page.mouse.wheel(180, 0);
  await page.keyboard.down('Shift');
  await page.mouse.wheel(0, 180);
  await page.keyboard.up('Shift');
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBe(before.x);
  await expect.poll(() => viewport.evaluate((node) => node.scrollTop)).toBe(before.y);
  await page.mouse.wheel(0, 80);
  await expect.poll(() => viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(before.y);
  expect(await viewport.evaluate((node) => node.scrollLeft)).toBe(before.x);
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => adapter.zoomView!(1));
  await expect
    .poll(() => viewport.evaluate((node) => node.scrollWidth > node.clientWidth))
    .toBe(true);
  await surface.hover();
  const wideX = await viewport.evaluate((node) => node.scrollLeft);
  await page.mouse.wheel(180, 0);
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(wideX);
  const shiftedX = await viewport.evaluate((node) => node.scrollLeft);
  await page.keyboard.down('Shift');
  await page.mouse.wheel(0, -100);
  await page.keyboard.up('Shift');
  await expect.poll(() => viewport.evaluate((node) => node.scrollLeft)).toBeLessThan(shiftedX);
  await handle.evaluate(({ adapter }) => adapter.fitBoard());
  await expect.poll(() => viewport.evaluate((node) => node.scrollWidth - node.clientWidth)).toBe(0);
  expect(await viewport.evaluate((node) => node.scrollLeft)).toBe(0);
});

test('corner wheel zoom and slider zoom keep the board centered even after horizontal panning', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  const viewport = page.locator('.gs-artboard');
  const centered = () =>
    viewport.evaluate((node) => {
      const view = node as HTMLElement;
      const scale = Number(view.dataset.scale);
      return Math.max(
        Math.abs(Number(view.dataset.pageLeft) + (1920 * scale) / 2 - view.clientWidth / 2),
        Math.abs(Number(view.dataset.pageTop) + (1080 * scale) / 2 - view.clientHeight / 2),
      );
    });
  await handle.evaluate(({ adapter }) => adapter.zoomView!(1));
  await expect.poll(centered).toBeLessThan(1);
  await viewport.evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
  });
  const rect = (await viewport.boundingBox())!;
  await page.mouse.move(rect.x + 24, rect.y + rect.height - 40);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -80);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => Number(await viewport.getAttribute('data-scale')))
    .toBeGreaterThan(1);
  await expect.poll(centered).toBeLessThan(1);
  const slider = page.getByRole('slider', { name: 'Zoom', exact: true });
  await slider.focus();
  await slider.press('Home');
  await expect.poll(centered).toBeLessThan(1);
  expect(await viewport.evaluate((node) => node.scrollWidth - node.clientWidth)).toBe(0);
  await slider.press('End');
  await expect.poll(centered).toBeLessThan(1);
  await expect
    .poll(() => viewport.evaluate((node) => node.scrollWidth > node.clientWidth))
    .toBe(true);
});
