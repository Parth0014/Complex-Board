import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';
test('color picker channels, hex and palette stay contained and usable', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => adapter.createShape('rectangle'));
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByRole('button', { name: 'Shape fill color', exact: true }).click();
  const picker = page.getByRole('group', { name: 'Shape fill color picker', exact: true });
  const hue = picker.getByRole('slider', { name: 'Shape fill color hue', exact: true });
  await hue.fill('210');
  await expect(hue).toHaveAttribute('aria-valuetext', '210 degrees');
  expect((await hue.boundingBox())!.width).toBeGreaterThan(100);
  const hex = picker.getByRole('textbox', { name: 'Shape fill color hex', exact: true });
  await hex.fill('#123456');
  await hex.press('Tab');
  await expect(hex).toHaveValue('#123456');
  const opacity = picker.getByRole('slider', {
    name: 'Shape fill color color opacity',
    exact: true,
  });
  await opacity.fill('50');
  expect(await hex.inputValue()).toBe('#12345680');
  const red = picker.getByLabel('Shape fill color R', { exact: true });
  await red.fill('200'); await red.press('Enter');
  await expect(hex).toHaveValue('#c8345680');
  await page.screenshot({ path: '.godmode/screenshots/color-picker-redesigned.png' });
  await picker.getByRole('button', { name: 'Close color picker' }).click();
  await expect(picker).toHaveCount(0);
});
