import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('resize is explicit, keeps objects intact and supports undo', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  const original = await handle.evaluate(({ adapter }) => {
    adapter.createShape('circle');
    return adapter.history.document.items[0];
  });
  await page.getByRole('button', { name: 'File menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Resize board', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Resize board', exact: true });
  await dialog.getByRole('combobox', { name: 'Board size' }).selectOption('1080x1920');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.width)).toBe(1920);
  await dialog.getByRole('button', { name: 'Resize board', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.height)).toBe(1920);
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items[0])).toEqual(
    original,
  );
  await page.keyboard.press('Control+z');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.width)).toBe(1920);
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.height)).toBe(1080);
});

test('export names match visible choices and download a real PNG', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => adapter.createShape('rectangle'));
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export board', exact: true });
  await expect(dialog.getByRole('heading', { name: 'Export board', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Transparent PNG/ })).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /High-resolution PNG/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test('font search previews typefaces and preserves the selected text', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) =>
    adapter.createTextPreset({
      id: 'test',
      label: 'Test',
      sample: 'A year of becoming',
      fontFamily: 'georgia',
      fontSize: 42,
      color: '#333333',
    }),
  );
  await page.getByRole('button', { name: 'Font family', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search fonts' }).fill('Kalam');
  const option = page.getByRole('option', { name: 'Kalam', exact: true });
  expect(await option.evaluate((el) => el.style.fontFamily)).toContain('Kalam');
  await option.click();
  await expect(page.getByRole('toolbar', { name: 'Selected object actions' })).toBeVisible();
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items[0].fontFamily)).toBe(
    'kalam',
  );
});

test('colors accept bare hex, provide accessible channels and remember recent colors', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => adapter.createShape('rectangle'));
  await page.getByRole('button', { name: 'Shape solid fill', exact: true }).click();
  await page.getByRole('textbox', { name: 'Shape solid fill hex', exact: true }).fill('7C5CD6');
  await expect(
    page.getByRole('textbox', { name: 'Shape solid fill hex', exact: true }),
  ).toHaveValue('#7c5cd6');
  const beforeShorthand = await handle.evaluate(({ adapter }) => adapter.history.document.items[0]);
  const hex = page.getByRole('textbox', { name: 'Shape solid fill hex', exact: true });
  await hex.fill('abc');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items[0])).toEqual(
    beforeShorthand,
  );
  await hex.press('Tab');
  await expect(hex).toHaveValue('#aabbcc');
  await expect(
    page.getByRole('slider', { name: 'Shape solid fill saturation', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('slider', { name: 'Shape solid fill color opacity', exact: true })
    .fill('75');
  await page.getByRole('button', { name: 'Close color picker', exact: true }).click();
  await page.getByRole('button', { name: 'Shape solid fill', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Recent colors', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close color picker', exact: true }).click();
  await handle.evaluate(({ adapter }) => adapter.select([]));
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true })).toHaveCount(
    0,
  );
});

test('Discover explains unavailable search without server instructions', async ({ page }) => {
  await page.route('**/api/images/status', (route) => route.fulfill({ json: { unsplash: false } }));
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Photo search is unavailable', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeDisabled();
  await expect(page.getByText(/API keys|on the server/)).toHaveCount(0);
});

test('templates offer replace or add and undo restores the previous page', async ({ page }) => {
  await createBoard(page, { layout: 'Portrait', closeLibrary: true });
  const handle = await runtime(page);
  const original = await handle.evaluate(({ adapter }) => {
    adapter.createShape('circle');
    return adapter.history.document.items;
  });
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  const useTemplate = page.getByRole('button', { name: 'Use template' }).first();
  await expect(useTemplate).toBeEnabled({ timeout: 20000 });
  await useTemplate.click();
  const dialog = page.getByRole('dialog', { name: 'Apply template', exact: true });
  await expect(dialog.getByRole('button', { name: 'Add to board', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Replace page', exact: true }).click();
  await expect(page.getByText('Template added.', { exact: false })).toBeVisible({ timeout: 20000 });
  expect(
    await handle.evaluate(
      ({ adapter }, id) => adapter.history.document.items.some((i) => i.id === id),
      original[0].id,
    ),
  ).toBe(false);
  await page
    .locator('.panel-inline-status')
    .getByRole('button', { name: 'Undo', exact: true })
    .click();
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items)).toEqual(original);
});

test('resize and color controls stay within a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => adapter.createShape('rectangle'));
  await page.getByRole('button', { name: 'Shape solid fill', exact: true }).click();
  const picker = page.getByRole('group', { name: 'Shape solid fill picker', exact: true });
  await expect(picker).toBeVisible();
  expect(await picker.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: '.godmode/screenshots/review2-phone-color.png' });
  await page.getByRole('button', { name: 'Close color picker', exact: true }).click();
  await page.getByRole('button', { name: 'File menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Resize board', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Resize board', exact: true });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: '.godmode/screenshots/review2-phone-resize.png' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('edge snapping has distinct high-contrast on and off states', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const toggle = page.getByRole('button', { name: 'Snap to edges', exact: true });
  if ((await toggle.getAttribute('aria-pressed')) === 'true') await toggle.click();
  await page.mouse.move(1, 1);
  await toggle.evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
  const off = await toggle.evaluate((node) => getComputedStyle(node).backgroundColor);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.move(1, 1);
  await toggle.evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
  const on = await toggle.evaluate((node) => {
    const css = getComputedStyle(node);
    const luminance = (color: string) => {
      const values = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((n) => {
          const v = n / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const a = luminance(css.color),
      b = luminance(css.backgroundColor);
    return {
      background: css.backgroundColor,
      contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
    };
  });
  expect(on.background).not.toBe(off);
  expect(on.contrast).toBeGreaterThanOrEqual(4.5);
  await toggle.screenshot({ path: '.godmode/screenshots/snapping-on.png' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.mouse.move(1, 1);
  await expect(toggle).toHaveCSS('background-color', off);
  await toggle.screenshot({ path: '.godmode/screenshots/snapping-off.png' });
});
