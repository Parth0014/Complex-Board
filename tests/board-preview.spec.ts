import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('preview fits, zooms for inspection and returns to editing without changing the board', async ({
  page,
}) => {
  await createBoard(page, { layout: 'Portrait', closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => adapter.createShape('circle'));
  const before = await handle.evaluate(({ adapter }) => JSON.stringify(adapter.history.document));
  const trigger = page.getByRole('button', { name: 'Preview board', exact: true });
  await trigger.click();
  const preview = page.getByRole('dialog', { name: 'Fullscreen board preview', exact: true });
  const image = preview.getByRole('img');
  await expect(image).toBeVisible();
  const box = (await image.boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(1080 / 1920, 2);
  await preview.getByRole('button', { name: 'Zoom in preview', exact: true }).click();
  expect((await image.boundingBox())!.height).toBeGreaterThan(box.height);
  await preview.getByRole('button', { name: 'Fit preview', exact: true }).click();
  await expect
    .poll(async () => Math.abs((await image.boundingBox())!.height - box.height))
    .toBeLessThan(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(
    preview.getByRole('button', { name: 'Back to editor', exact: true }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.godmode/screenshots/board-preview-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'File menu', exact: true })).toBeFocused();
  expect(await handle.evaluate(({ adapter }) => JSON.stringify(adapter.history.document))).toBe(
    before,
  );
});

test('preview failure stays recoverable inside the viewer', async ({ page }) => {
  await createBoard(page);
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => {
    const original = adapter.previewBoard.bind(adapter);
    let attempts = 0;
    adapter.previewBoard = () => {
      if (!attempts++) throw new Error('Preview temporarily unavailable');
      return original();
    };
  });
  await page.getByRole('button', { name: 'Preview board', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Fullscreen board preview', exact: true });
  await expect(preview.getByRole('alert')).toContainText('Preview temporarily unavailable');
  await preview.getByRole('button', { name: 'Retry preview', exact: true }).click();
  await expect(preview.getByRole('img')).toBeVisible();
});

test('preview supports detail panning and toggles browser fullscreen', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'Preview board', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Fullscreen board preview', exact: true });
  const image = preview.getByRole('img');
  await expect(image).toBeVisible();
  await image.dblclick();
  await expect(preview.getByLabel('Preview zoom', { exact: true })).toHaveText('100%');
  const viewport = preview.getByLabel('Board preview image', { exact: true });
  const before = await viewport.evaluate((node) => [node.scrollLeft, node.scrollTop]);
  const box = (await viewport.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 - 40, { steps: 5 });
  await page.mouse.up();
  const after = await viewport.evaluate((node) => [node.scrollLeft, node.scrollTop]);
  expect(after[0]).toBeGreaterThan(before[0]);
  expect(after[1]).toBeGreaterThan(before[1]);
  await preview.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect(preview.getByRole('button', { name: 'Exit fullscreen', exact: true })).toBeVisible();
  await preview.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
  await expect(preview.getByRole('button', { name: 'Fullscreen', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  // Chromium's native fullscreen window resize settles after fullscreenchange.
  // Restore the emulated viewport before reusing this worker for another page.
  await page.setViewportSize({ width: 1280, height: 720 });
  await preview.getByRole('button', { name: 'Back to editor', exact: true }).click();
  await expect(preview).toHaveCount(0);
  const board = await page.getByLabel('Editable vision board', { exact: true }).boundingBox();
  expect(board!.height).toBeLessThan(720);
});
