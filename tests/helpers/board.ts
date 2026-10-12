import { expect, type Page } from '@playwright/test';

export async function createBoard(
  page: Page,
  {
    name = 'Desktop craft',
    topic,
    layout = 'Landscape',
    closeLibrary = false,
  }: {
    name?: string;
    topic?: string;
    layout?: 'Landscape' | 'Portrait' | 'Square';
    closeLibrary?: boolean;
  } = {},
) {
  await page.goto('/');
  await page.getByRole('button', { name: '+ New board', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill(name);
  if (topic) {
    await page.getByRole('radio', { name: 'Topic', exact: true }).check();
    await page.getByRole('radio', { name: topic, exact: true }).check();
  }
  await page.getByRole('radio', { name: layout, exact: true }).check();
  await page.getByRole('button', { name: 'Create board', exact: true }).click();
  await expect(page.getByLabel('Editable vision board', { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  if (closeLibrary) {
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await expect(page.locator('.vs-lib')).toHaveClass(/is-collapsed/);
  }
}
