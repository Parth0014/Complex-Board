import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('real-photo collage chooser supports families, shuffle, cached reopening and narrow screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await createBoard(page, { layout: 'Portrait' });
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  const folder = resolve('design/collage-studies/photos');
  const files = readdirSync(folder)
    .filter((name) => name.endsWith('.jpg'))
    .slice(0, 5)
    .map((name) => resolve(folder, name));
  await page.getByRole('button', { name: 'Upload photos', exact: true }).setInputFiles(files);
  await expect(page.locator('.discover-photo')).toHaveCount(5);
  await page.getByRole('button', { name: 'Create photo collage', exact: true }).click();
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.scrapbook-preset-art img')).toHaveCount(18, { timeout: 30000 });
  const families = page.getByRole('group', { name: 'Collage families', exact: true });
  await families.getByRole('button', { name: 'Inlay', exact: true }).click();
  await expect(page.locator('.scrapbook-preset')).toHaveCount(6);
  await page.locator('.scrapbook-preset').first().click();
  await page.screenshot({ path: '.godmode/screenshots/chooser-desktop.png' });
  const before = await page.locator('.scrapbook-preset-art img').first().getAttribute('src');
  await page
    .getByRole('button', { name: /Shuffle photos in/ })
    .first()
    .click();
  await expect(page.locator('.scrapbook-preset-art img').first()).not.toHaveAttribute(
    'src',
    before!,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Add to canvas', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.godmode/screenshots/chooser-mobile.png' });
  for (const card of await page.locator('.scrapbook-preset-card').all()) {
    const description = await card.locator('small').boundingBox();
    const shuffle = await card.getByRole('button', { name: /Shuffle/ }).boundingBox();
    expect(shuffle!.y).toBeGreaterThanOrEqual(description!.y + description!.height);
  }
  await page.getByRole('button', { name: 'Close photo arranger', exact: true }).click();
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => {
    adapter.previewPhotoArrangement = () => {
      throw new Error('Cache was not reused');
    };
  });
  await page.getByRole('button', { name: 'Create photo collage', exact: true }).click();
  await expect(page.locator('.scrapbook-preset-art img')).toHaveCount(18);
  await page.getByRole('button', { name: 'Add to canvas', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Create photo collage', exact: true })).toHaveCount(0);
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items.length)).toBe(5);
  expect(await handle.evaluate(({ adapter }) => adapter.selectedIds.length)).toBe(0);
});
