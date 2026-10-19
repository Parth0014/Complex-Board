import { test, expect } from '@playwright/test';
import { runtime } from './appearance-helpers';

test('menu arrow-key navigation and Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ New board' }).click();
  await page.getByLabel('Name').fill('Menu test');
  await page.getByRole('button', { name: 'Create board' }).click();
  await page.waitForURL(/board=/);
  await page.getByLabel('Editable vision board', { exact: true }).waitFor({ timeout: 15000 });
  const h = await runtime(page);
  await h.evaluate(async ({ adapter }) => {
    adapter.createShape('rectangle');
  });
  // right-click the canvas to open the context menu
  const canvas = page.getByLabel('Editable vision board', { exact: true });
  await canvas.click({ button: 'right', position: { x: 100, y: 100 } });
  const menu = page.getByRole('menu', { name: 'Canvas actions' });
  await expect(menu).toBeVisible({ timeout: 5000 });
  // ArrowDown moves focus between menuitems
  const items = menu.getByRole('menuitem');
  const count = await items.count();
  expect(count).toBeGreaterThan(1);
  await items.first().focus();
  await page.keyboard.press('ArrowDown');
  const focusedIdx = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[role="menu"] [role="menuitem"]')];
    return els.indexOf(document.activeElement as Element);
  });
  expect(focusedIdx).toBe(1);
  // Escape dismisses
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0, { timeout: 3000 });
});
