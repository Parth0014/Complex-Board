import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';
test('curated artwork preserves its source proportions with balanced bubble lettering', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await createBoard(page, { layout: 'Portrait', closeLibrary: true });
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByLabel('Search elements').fill('yes');
  const bubble = page.locator('.elements-card').filter({ has: page.locator('img[alt="Yes!"]') });
  await expect(bubble).toBeVisible();
  const source = await bubble.locator('img').getAttribute('src');
  expect(decodeURIComponent(source!.split(',').slice(1).join(','))).toContain('font-size="96.0"');
  await bubble.click();
  const handle = await runtime(page);
  const result = await handle.evaluate(({ adapter }) => {
    const item = adapter.history.document.items[0];
    const image = adapter.images.get(item.asset!.assetUrl)!;
    return {
      ratio: item.width / item.height,
      sourceRatio: item.asset!.width! / item.asset!.height!,
      width: item.width,
      decodedWidth: image.naturalWidth,
      font: decodeURIComponent(image.src.split(',').slice(1).join(',')),
      item: JSON.stringify(item),
    };
  });
  expect(result.ratio).toBeCloseTo(result.sourceRatio, 8);
  expect(result.width).toBeCloseTo(1080 * 0.36);
  expect(result.decodedWidth).toBe(4096);
  expect(result.font).toContain('font-size="96.0"');
  await page.screenshot({
    path: '.godmode/screenshots/elements-polished-canvas.png',
    animations: 'disabled',
  });
  await page.reload();
  const restored = await runtime(page);
  expect(
    await restored.evaluate(({ adapter }) => JSON.stringify(adapter.history.document.items[0])),
  ).toBe(result.item);
  await page.locator('[data-camera-space]').evaluate((node) => {
    const element = node as HTMLElement,
      bounds = element.getBoundingClientRect();
    const scale = Number(element.dataset.scale);
    const dataTransfer = new DataTransfer();
    dataTransfer.setData(
      'application/x-gratitude-asset',
      JSON.stringify({ id: 'vision-svg:bubbles/yes' }),
    );
    element.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: bounds.left + Number(element.dataset.pageLeft) + 540 * scale,
        clientY: bounds.top + Number(element.dataset.pageTop) + 1300 * scale,
      }),
    );
  });
  await expect
    .poll(() => restored.evaluate(({ adapter }) => adapter.history.document.items.length))
    .toBe(2);
  const dropped = await restored.evaluate(({ adapter }) => {
    const item = adapter.history.document.items[1];
    return {
      width: item.width,
      centerX: item.x + item.width / 2,
      centerY: item.y + item.height / 2,
    };
  });
  expect(dropped.width).toBeCloseTo(result.width);
  // Browser drag coordinates are rounded to screen pixels at the fitted zoom.
  expect(Math.abs(dropped.centerX - 540)).toBeLessThan(3);
  expect(Math.abs(dropped.centerY - 1300)).toBeLessThan(3);
});
