import { migrateDocument } from '../src/vision/appearance/migration';
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('removed card generators leave saved card objects and exports unchanged', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ Create a vision board', exact: true }).click();
  await page.getByRole('button', { name: 'Create board', exact: true }).click();
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
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  expect(
    readFileSync((await (await exported).path())!).equals(
      readFileSync('exports/appearance-legacy/cards.png'),
    ),
  ).toBe(true);
});

test('representative legacy styles still export the captured pixels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ Create a vision board', exact: true }).click();
  await page.getByRole('button', { name: 'Create board', exact: true }).click();
  await page.getByLabel('File menu', { exact: true }).click();
  await page
    .getByLabel('Open board file', { exact: true })
    .setInputFiles('tests/fixtures/appearance-v2.json');
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(
    'Legacy appearance reference',
  );
  await page.getByLabel('File menu', { exact: true }).click();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  expect(
    readFileSync((await (await pending).path())!).equals(
      readFileSync('exports/appearance-legacy/styles.png'),
    ),
  ).toBe(true);
});
