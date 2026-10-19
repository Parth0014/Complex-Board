import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
test('desktop File has a clear sequence without duplicate header actions or ambiguous backup icon', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await createBoard(page, { closeLibrary: true });
  await expect(
    page.getByRole('button', { name: 'Download editable backup', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'File menu', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'File actions' });
  await expect(menu.getByRole('menuitem')).toHaveText([
    'New board',
    'Resize board',
    'Open board file',
    'Download board file',
    'Keyboard shortcuts ?',
  ]);
  await expect(menu.getByText('Preview board', { exact: true })).toHaveCount(0);
  await expect(menu.getByText('Export board', { exact: true })).toHaveCount(0);
  expect(await menu.locator('.vs-menu__kicker').allTextContents()).toEqual([
    'Board',
    'Editable files',
    'Help',
  ]);
  await page.screenshot({
    path: '.godmode/screenshots/file-menu-organized.png',
    animations: 'disabled',
  });
  const download = page.waitForEvent('download');
  await menu.getByRole('menuitem', { name: 'Download board file', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.visbo$/);
});
test('compact File includes Preview and Export when header actions are hidden', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'File menu', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'File actions' });
  await expect(menu.getByRole('menuitem', { name: 'Preview board', exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Export board', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(menu.getByRole('menuitem', { name: 'Preview board', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Preview board', exact: true })).toBeVisible();
});
