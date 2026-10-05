import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(
  readFileSync(new URL('../public/curated-v1/manifest.json', import.meta.url), 'utf8'),
) as { categories: Array<{ id: string; label: string; count: number }> };
test('curated artwork stays visible on the zoomed canvas and after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.locator('.v1-asset-grid button').filter({ hasText: 'Briefcase' }).click();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  const artworkPixels = () =>
    page.getByLabel('Editable vision board', { exact: true }).evaluate((board) => {
      const canvas = board.querySelector('canvas')!;
      const scale = Number(board.getAttribute('data-scale'));
      const pixelRatio = canvas.width / parseFloat(canvas.style.width);
      // Sample inside the briefcase, away from selection handles and the toolbar.
      const x = (Number(board.getAttribute('data-page-left')) + 140 * scale) * pixelRatio;
      const y = (Number(board.getAttribute('data-page-top')) + 200 * scale) * pixelRatio;
      const pixels = canvas
        .getContext('2d')!
        .getImageData(
          Math.round(x),
          Math.round(y),
          Math.round(120 * scale * pixelRatio),
          Math.round(80 * scale * pixelRatio),
        ).data;
      let dark = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i] < 80 && pixels[i + 1] < 80 && pixels[i + 2] < 80 && pixels[i + 3] > 0) dark++;
      return dark;
    });
  await expect.poll(artworkPixels).toBeGreaterThan(50);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(artworkPixels).toBeGreaterThan(50);
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await expect.poll(artworkPixels).toBeGreaterThan(50);
});

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
  // Context controls have their own row above the editable page viewport.
  expect(toolbarBounds!.y + toolbarBounds!.height).toBeLessThanOrEqual(canvasBounds!.y);
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
  expect(png.readUInt32BE(20)).toBe(1080);
  const highDownloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download 2× PNG', exact: true }).click();
  const highDownload = await highDownloadEvent;
  const highPng = readFileSync((await highDownload.path())!);
  expect(highPng.readUInt32BE(16)).toBe(2160);
  expect(highPng.readUInt32BE(20)).toBe(2160);
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

test('desktop panels and dock reserve space and inspector sections scroll without shrinking', async ({
  page,
}) => {
  for (const [width, height] of [
    [1280, 900],
    [1366, 768],
    [1440, 900],
    [1536, 730],
    [1920, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.getByRole('button', { name: 'Text', exact: true }).click();
    await page.locator('.text-panel button').first().click();
    await page.getByRole('button', { name: 'Open properties', exact: true }).click();
    const board = await page.getByLabel('Editable vision board', { exact: true }).boundingBox();
    const library = await page.locator('.vs-lib').boundingBox();
    const inspector = await page.locator('.vs-inspector').boundingBox();
    const dock = await page.getByLabel('Board controls', { exact: true }).boundingBox();
    expect(library!.x + library!.width).toBeLessThanOrEqual(board!.x);
    expect(board!.x + board!.width).toBeLessThanOrEqual(inspector!.x);
    expect(board!.y + board!.height).toBeLessThanOrEqual(dock!.y);
    expect(library!.y).toBe(inspector!.y);
    expect(library!.y + library!.height).toBe(inspector!.y + inspector!.height);
    expect(
      await page
        .locator('.vs-sec')
        .evaluateAll((sections) =>
          sections.every((section) => section.scrollWidth <= section.clientWidth + 2),
        ),
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const pills = await page
      .locator('.vs-bottom-dock > .vs-pages, .vs-bottom-dock > .vs-zoom, .canvas-tools')
      .all();
    const bounds = await Promise.all(pills.map((pill) => pill.boundingBox()));
    for (let i = 0; i < bounds.length; i++)
      for (let j = i + 1; j < bounds.length; j++) {
        const a = bounds[i]!,
          b = bounds[j]!;
        expect(
          a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y,
        ).toBe(true);
      }
    expect(
      await page
        .locator('.vs-inspector__body > .vs-sec')
        .evaluateAll((sections) =>
          sections.every(
            (section) =>
              getComputedStyle(section).flexShrink === '0' &&
              section.getBoundingClientRect().height >= 35,
          ),
        ),
    ).toBe(true);
    const body = page.locator('.vs-inspector__body');
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(body.locator('.vs-sec').last()).toBeInViewport();
  }
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
