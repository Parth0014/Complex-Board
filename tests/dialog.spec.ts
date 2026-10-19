import { test, expect } from '@playwright/test';
import { runtime } from './appearance-helpers';

test('dialog focus trap, exit animation, focus return', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ New board' }).click();
  await page.getByLabel('Name').fill('Dialog test');
  await page.getByRole('button', { name: 'Create board' }).click();
  await page.waitForURL(/board=/);
  await page.getByLabel('Editable vision board', { exact: true }).waitFor({ timeout: 15000 });
  // add a shape so Share enables
  const h = await runtime(page);
  await h.evaluate(async ({ adapter }) => {
    adapter.createShape('rectangle');
  });
  const shareBtn = page.getByRole('button', { name: 'Export' });
  await expect(shareBtn).toBeEnabled();
  await shareBtn.focus();
  await shareBtn.click();
  const dialog = page.getByRole('dialog', { name: 'Export board' });
  await expect(dialog).toBeVisible();
  // focus trap: tab twice, focus stays inside
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  expect(inside).toBe(true);
  // Escape: exit class appears, then unmount, focus returns
  await page.keyboard.press('Escape');
  await expect(page.locator('.gs-dialog-exit')).toBeAttached({ timeout: 2000 });
  await expect(dialog).toHaveCount(0, { timeout: 3000 });
  await expect(shareBtn).toBeFocused();
});
