import { migrateDocument } from '../src/vision/appearance/migration';
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createBoard } from './helpers/board';
import { pixelDifference, runtime } from './appearance-helpers';

test('removed card generators leave saved card objects and exports unchanged', async ({ page }) => {
  await createBoard(page);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add goal card', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add affirmation', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Quick shapes')).toBeVisible();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByLabel('File menu', { exact: true }).click();
  await page
    .getByLabel('Open board file', { exact: true })
    .setInputFiles('tests/fixtures/legacy-cards.json');
  const fixture = JSON.parse(readFileSync('tests/fixtures/legacy-cards.json', 'utf8'));
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(fixture.title);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save .visbo file', exact: true }).click();
  const restored = JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
  expect(restored.version).toBe(3);
  expect(restored.items).toEqual(migrateDocument(fixture).items);
  await page.getByLabel('File menu', { exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Editable vision board', { exact: true })).toBeVisible();
  const exported = page.waitForEvent('download');
  // Captured fixtures are at document resolution; Share now intentionally exports at 2x.
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) =>
    adapter.downloadHighResolution(adapter.ownerWindow.document, 1),
  );
  expect(
    await pixelDifference(
      page,
      readFileSync((await (await exported).path())!),
      readFileSync('exports/appearance-legacy/cards.png'),
    ),
  ).toEqual({ count: 0, max: 0 });
});

test('representative legacy styles still export the captured pixels', async ({ page }) => {
  await createBoard(page);
  await page.getByLabel('File menu', { exact: true }).click();
  await page
    .getByLabel('Open board file', { exact: true })
    .setInputFiles('tests/fixtures/appearance-v2.json');
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(
    'Legacy appearance reference',
  );
  await page.getByLabel('File menu', { exact: true }).click();
  const pending = page.waitForEvent('download');
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) =>
    adapter.downloadHighResolution(adapter.ownerWindow.document, 1),
  );
  expect(
    await pixelDifference(
      page,
      readFileSync((await (await pending).path())!),
      readFileSync('exports/appearance-legacy/styles.png'),
    ),
  ).toEqual({ count: 0, max: 0 });
});
