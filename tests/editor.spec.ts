import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(
  readFileSync(new URL('../public/curated-v1/manifest.json', import.meta.url), 'utf8'),
) as { categories: Array<{ id: string; label: string; count: number }> };
test('curated insertion, text, history and export', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Elements', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByLabel('Category', { exact: true }).selectOption('doodles');
  await expect(page.locator('.v1-asset-grid button')).toHaveCount(25);
  await page.locator('.v1-asset-grid button').first().click();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(page.getByText('Board items (2)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.getByText('Board items (2)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  await expect(page.getByText('Board items (3)', { exact: true })).toBeVisible();
  const fitZoom = await page.getByRole('slider', { name: 'Zoom', exact: true }).inputValue();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  expect(
    Number(await page.getByRole('slider', { name: 'Zoom', exact: true }).inputValue()),
  ).toBeGreaterThan(Number(fitZoom));
  await page.getByRole('button', { name: 'Fit board to view', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Zoom', exact: true })).toHaveValue(fitZoom);
  const toolbarBounds = await page
    .getByRole('toolbar', { name: 'Selection controls' })
    .boundingBox();
  const canvasBounds = await page
    .getByLabel('Editable vision board', { exact: true })
    .boundingBox();
  // The selection toolbar floats at the bottom of the canvas: it must stay inside the
  // viewport and keep clear of the board's center so it never covers the work.
  expect(toolbarBounds!.y).toBeGreaterThanOrEqual(
    canvasBounds!.y + canvasBounds!.height / 2,
  );
  expect(toolbarBounds!.y + toolbarBounds!.height).toBeLessThanOrEqual(
    canvasBounds!.y + canvasBounds!.height,
  );
  const railBounds = await page.getByRole('navigation', { name: 'Studio tools' }).boundingBox();
  expect(railBounds!.width).toBeLessThanOrEqual(90);
  await page.screenshot({ path: 'test-results/editor.png' });
  await page.getByRole('button', { name: /Share/ }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const download = await downloadEvent;
  const path = await download.path();
  expect(path).toBeTruthy();
  const png = readFileSync(path!);
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBe(1350);
  const highDownloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download 2× PNG', exact: true }).click();
  const highDownload = await highDownloadEvent;
  const highPng = readFileSync((await highDownload.path())!);
  expect(highPng.readUInt32BE(16)).toBe(2160);
  expect(highPng.readUInt32BE(20)).toBe(2700);
  expect(errors).toEqual([]);
});

test('mobile board view has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Elements', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await expect(page.getByLabel('Category', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/editor-mobile.png' });
});

test('replacement library shows its exact category counts and inserts a goal object', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await expect(page.locator('.v1-asset-grid button')).toHaveCount(250);
  for (const category of manifest.categories) {
    await page.getByLabel('Category', { exact: true }).selectOption(category.id);
    await expect(page.locator('.v1-asset-grid button')).toHaveCount(category.count);
    await expect(
      page.getByLabel('Category', { exact: true }).locator(`option[value="${category.id}"]`),
    ).toHaveText(`${category.label} · ${category.count}`);
  }
  await page.getByLabel('Category', { exact: true }).selectOption('goal-objects');
  await page.getByRole('button', { name: 'Focused desk', exact: true }).click();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/replacement-library.png' });
});
