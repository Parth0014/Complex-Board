import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';
test('inspector numeric fields integrate step buttons, units and typing with reversible edits', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => {
    adapter.createShape('rectangle');
  });
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  const dock = page.getByRole('complementary', { name: 'Object formatting', exact: true });
  await expect(dock.locator('details, select, summary')).toHaveCount(0);
  const field = dock.getByLabel('Border width', { exact: true });
  const original = await field.inputValue();
  await field.fill('3');
  await field.press('Enter');
  await expect(field).toHaveValue('3');
  await page.keyboard.press('Control+z');
  await expect(field).toHaveValue(original);
  await dock.getByRole('button', { name: 'Increase Border width', exact: true }).click();
  await expect(field).toHaveValue(String(Number(original) + 1));
  await page.keyboard.press('Control+z');
  await expect(field).toHaveValue(original);
  await field.focus();
  await field.press('ArrowUp');
  await field.press('Shift+ArrowUp');
  await expect(field).toHaveValue(String(Number(original) + 11));
  await field.press('Escape');
  await expect(field).toHaveValue(original);
  const geometry = await field.evaluate((input) => {
    const group = input.closest('.gs-number-field')!;
    const unit = group.querySelector('.gs-number-field__unit')!;
    return {
      shellBorder: getComputedStyle(group).borderLeftWidth,
      inputBorder: getComputedStyle(input).borderLeftWidth,
      unitRight: unit.getBoundingClientRect().right,
      shellRight: group.getBoundingClientRect().right,
      appearance: getComputedStyle(input, '::-webkit-inner-spin-button').getPropertyValue(
        '-webkit-appearance',
      ),
    };
  });
  expect(geometry.shellBorder).toBe('1px');
  expect(geometry.inputBorder).toBe('0px');
  expect(geometry.unitRight).toBeLessThan(geometry.shellRight + 1);
  await page.screenshot({
    path: '.godmode/screenshots/inspector-edit-polished.png',
    animations: 'disabled',
  });
  await dock.getByRole('tab', { name: 'Layout', exact: true }).click();
  await expect(dock.getByLabel('Bounds width', { exact: true })).toBeVisible();
  const width = dock.getByLabel('Bounds width', { exact: true });
  const startingWidth = await width.inputValue();
  await width.fill('600');
  await width.press('Enter');
  await dock.getByRole('button', { name: 'Reset bounds', exact: true }).click();
  await expect(width).toHaveValue(startingWidth);
  await page.keyboard.press('Control+z');
  await expect(width).toHaveValue('600');

  await page.screenshot({
    path: '.godmode/screenshots/inspector-layout-polished.png',
    animations: 'disabled',
  });
  await dock.getByRole('tab', { name: 'Layers', exact: true }).click();
  await expect(dock.locator('.vs-layer')).toHaveCount(1);
  await expect(dock.getByRole('button', { name: 'Forward', exact: true }).locator('svg')).toHaveCount(1);
  expect(await dock.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({
    path: '.godmode/screenshots/inspector-layers-polished.png',
    animations: 'disabled',
  });
  await handle.evaluate(({ adapter }) => adapter.createShape('heart'));
  await expect(dock).toHaveCount(0);
});
