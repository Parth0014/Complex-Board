import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';
test('SVG canvas uses a sharp backing surface without altering artwork or hit geometry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await createBoard(page, { layout: 'Portrait', closeLibrary: true });
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByLabel('Search elements').fill('yes');
  await page
    .locator('.elements-card')
    .filter({ has: page.locator('img[alt="Yes!"]') })
    .click();
  const handle = await runtime(page);
  await expect
    .poll(() =>
      handle.evaluate(({ adapter, stage }) => {
        const node = stage.findOne((entry) => entry.id() === adapter.selectedIds[0]);
        return node?.opacity();
      }),
    )
    .toBe(1);
  const info = await handle.evaluate(({ stage, adapter }) => {
    const layer = stage.getLayers()[0],
      surface = layer.getCanvas();
    return {
      ratio: surface.getPixelRatio(),
      native: window.devicePixelRatio,
      smoothing: layer.getContext()._context.imageSmoothingQuality,
      canvasWidth: surface.width,
      viewportWidth: stage.width(),
      hitRatio: layer.getHitCanvas().getPixelRatio(),
      item: JSON.stringify(adapter.history.document.items[0]),
    };
  });
  console.log(
    JSON.stringify({ ratio: info.ratio, native: info.native, smoothing: info.smoothing }),
  );
  expect(info.ratio).toBeGreaterThanOrEqual(2);
  expect(info.smoothing).toBe('high');
  expect(info.hitRatio).toBe(1);
  expect(info.canvasWidth / info.viewportWidth).toBeCloseTo(info.ratio, 2);
  await page.screenshot({
    path: '.godmode/screenshots/svg-canvas-quality.png',
    animations: 'disabled',
  });
  const exported = await handle.evaluate(async ({ adapter }) => {
    const source = adapter.previewBoard();
    const image = new Image();
    image.src = source;
    await image.decode();
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      item: JSON.stringify(adapter.history.document.items[0]),
    };
  });
  expect(exported.width).toBe(1080);
  expect(exported.height).toBe(1920);
  expect(exported.item).toBe(info.item);
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect
    .poll(() => handle.evaluate(({ stage }) => stage.getLayers()[0].getCanvas().getPixelRatio()))
    .toBe(2);
  expect(
    await handle.evaluate(
      ({ stage }) => stage.getLayers()[0].getContext()._context.imageSmoothingQuality,
    ),
  ).toBe('high');
  const point = await handle.evaluate(({ adapter }) => {
    const item = adapter.history.document.items[0];
    adapter.select([]);
    const view = document.querySelector<HTMLElement>('[data-camera-space]')!;
    const rect = view.getBoundingClientRect();
    const scale = Number(view.dataset.scale);
    return {
      id: item.id,
      x: rect.left + Number(view.dataset.pageLeft) + (item.x + item.width / 2) * scale,
      y: rect.top + Number(view.dataset.pageTop) + (item.y + item.height / 2) * scale,
    };
  });
  await page.mouse.click(point.x, point.y);
  expect(await handle.evaluate(({ adapter }) => adapter.selectedIds)).toEqual([point.id]);
});
