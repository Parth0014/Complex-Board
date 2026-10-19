import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
test('canvas zoom slider preserves fractional targets and exact keyboard steps', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const slider = page.getByRole('slider', { name: 'Zoom', exact: true });
  await expect(slider).toHaveAttribute('step', 'any');
  await slider.fill('137.625');
  await expect.poll(async () => Number(await slider.inputValue())).toBe(137.625);
  await slider.press('Home');
  await expect(slider).toHaveValue('10');
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('11');
  await slider.fill('225.375');
  await expect.poll(async () => Number(await slider.inputValue())).toBe(225.375);
  await page.getByRole('button', { name: 'Fit board to view', exact: true }).click();
  await expect.poll(async () => Number(await slider.inputValue())).toBeLessThan(100);
});
