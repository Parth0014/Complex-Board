import { test, expect, type Page } from '@playwright/test';

async function point(page: Page, x: number, y: number) {
  const viewport = page.getByLabel('Editable vision board', { exact: true });
  const canvas = viewport.locator('canvas').first();
  const box = (await canvas.boundingBox())!;
  const left = Number(await viewport.getAttribute('data-page-left')),
    top = Number(await viewport.getAttribute('data-page-top')),
    scale = Number(await viewport.getAttribute('data-scale'));
  return { x: box.x + left + x * scale, y: box.y + top + y * scale };
}
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}
async function createPair(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByLabel('Category', { exact: true }).selectOption('goal-objects');
  await page.getByRole('button', { name: 'Focused desk', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Item X', exact: true }).fill('500');
  await page.getByRole('spinbutton', { name: 'Item Y', exact: true }).fill('400');
  await page.getByRole('spinbutton', { name: 'Item Y', exact: true }).blur();
}
test('box selection, group dragging, one-step undo, and ungrouping', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await createPair(page);
  await drag(page, await point(page, 50, 100), await point(page, 760, 650));
  await expect(page.getByRole('button', { name: 'Group', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Group', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Alignment guides', exact: true }).uncheck();
  await drag(page, await point(page, 200, 240), await point(page, 300, 320));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Ungroup', exact: true }).click();
  // The original item should be back at its initial position after undoing the entire group move.
  await page.keyboard.press('Escape');
  await page.mouse.click((await point(page, 200, 240)).x, (await point(page, 200, 240)).y);
  await expect(page.getByRole('spinbutton', { name: 'Item X', exact: true })).toHaveValue('100');
  await expect(page.getByRole('spinbutton', { name: 'Item Y', exact: true })).toHaveValue('160');
  await page.keyboard.press('Escape');
  const second = await point(page, 600, 480);
  await page.mouse.click(second.x, second.y);
  await expect(page.getByRole('spinbutton', { name: 'Item X', exact: true })).toHaveValue('500');
  await expect(page.getByRole('spinbutton', { name: 'Item Y', exact: true })).toHaveValue('400');
  expect(errors).toEqual([]);
});
test('drag snaps to page edge and keyboard selection/group shortcuts work', async ({ page }) => {
  await createPair(page);
  await drag(page, await point(page, 600, 480), await point(page, 104, 480));
  await expect(page.getByRole('spinbutton', { name: 'Item X', exact: true })).toHaveValue('0');
  await page.keyboard.press('Control+a');
  await expect(page.getByRole('button', { name: 'Group', exact: true })).toBeEnabled();
  await page.keyboard.press('Control+g');
  await expect(page.getByRole('button', { name: 'Ungroup', exact: true })).toBeEnabled();
  await page.keyboard.press('Control+Shift+g');
  await expect(page.getByRole('button', { name: 'Ungroup', exact: true })).toBeDisabled();
});
test('drops a library asset at the pointer and supports object snapping, rotation and lock', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  const destination = await point(page, 500, 600);
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await page
    .getByRole('button', { name: 'Focused desk', exact: true })
    .dispatchEvent('dragstart', { dataTransfer });
  await page
    .getByLabel('Editable vision board', { exact: true })
    .dispatchEvent('drop', { dataTransfer, clientX: destination.x, clientY: destination.y });
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  // DOM drag events quantize client coordinates to screen pixels; allow one pixel at the current zoom.
  const tolerance = Math.ceil(
    1 /
      Number(
        await page.getByLabel('Editable vision board', { exact: true }).getAttribute('data-scale'),
      ),
  );
  expect(
    Math.abs(
      Number(await page.getByRole('spinbutton', { name: 'Item X', exact: true }).inputValue()) -
        400,
    ),
  ).toBeLessThanOrEqual(tolerance);
  expect(
    Math.abs(
      Number(await page.getByRole('spinbutton', { name: 'Item Y', exact: true }).inputValue()) -
        520,
    ),
  ).toBeLessThanOrEqual(tolerance);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Lock', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Item X', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Unlock', exact: true }).click();
  await page.getByRole('button', { name: 'Rotate 15°', exact: true }).click();
  await page.screenshot({ path: 'test-results/canvas-interactions.png' });
});
test('Alt bypasses snapping, Shift constrains dragging, and the hand tool pans without editing', async ({
  page,
}) => {
  await createPair(page);
  await drag(page, await point(page, 600, 480), await point(page, 404, 480));
  await expect(page.getByRole('spinbutton', { name: 'Item X', exact: true })).toHaveValue('300');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.keyboard.down('Alt');
  await drag(page, await point(page, 600, 480), await point(page, 404, 480));
  await page.keyboard.up('Alt');
  const actual = Number(
    await page.getByRole('spinbutton', { name: 'Item X', exact: true }).inputValue(),
  );
  const scale = Number(
    await page.getByLabel('Editable vision board', { exact: true }).getAttribute('data-scale'),
  );
  expect(Math.abs(actual - 304)).toBeLessThanOrEqual(1 / scale);
  expect(actual).toBeGreaterThan(300);
  await page.getByRole('checkbox', { name: 'Alignment guides', exact: true }).uncheck();
  await page.keyboard.down('Shift');
  await drag(page, await point(page, 404, 480), await point(page, 504, 510));
  await page.keyboard.up('Shift');
  await expect(page.getByRole('spinbutton', { name: 'Item Y', exact: true })).toHaveValue('400');
  const xBefore = await page.getByRole('spinbutton', { name: 'Item X', exact: true }).inputValue();
  await page.getByRole('slider', { name: 'Zoom', exact: true }).focus();
  await page.getByRole('slider', { name: 'Zoom', exact: true }).press('End');
  await expect(page.getByRole('slider', { name: 'Zoom', exact: true })).toHaveValue('150');
  await page.getByRole('button', { name: 'Hand tool', exact: true }).click();
  const viewport = page.getByLabel('Editable vision board', { exact: true });
  const box = (await viewport.boundingBox())!;
  await drag(page, { x: box.x + 200, y: box.y + 160 }, { x: box.x + 100, y: box.y + 60 });
  expect(await viewport.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  expect(await viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByRole('spinbutton', { name: 'Item X', exact: true })).toHaveValue(xBefore);
  await expect(page.getByRole('spinbutton', { name: 'Item Y', exact: true })).toHaveValue('400');
});
test('artboard bounds remain mandatory with alignment guides disabled and Alt held', async ({
  page,
}) => {
  await createPair(page);
  await expect(page.getByRole('checkbox', { name: 'Alignment guides', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Alignment guides', exact: true }).uncheck();
  await page.keyboard.down('Alt');
  await drag(page, await point(page, 600, 480), await point(page, -100, 480));
  await expect(page.getByRole('spinbutton', { name: 'Item X', exact: true })).toHaveValue('0');
  await drag(page, await point(page, 100, 480), await point(page, 1200, 480));
  await expect(page.getByRole('spinbutton', { name: 'Item X', exact: true })).toHaveValue('880');
  await page.keyboard.up('Alt');
  await page.getByRole('spinbutton', { name: 'Item Y', exact: true }).fill('-100');
  await expect(page.getByRole('spinbutton', { name: 'Item Y', exact: true })).toHaveValue('0');
  await page.getByRole('spinbutton', { name: 'Item Y', exact: true }).fill('2000');
  await expect(page.getByRole('spinbutton', { name: 'Item Y', exact: true })).toHaveValue('1190');
  await page.getByRole('checkbox', { name: 'Snap to edges', exact: true }).uncheck();
  await page.getByRole('spinbutton', { name: 'Item X', exact: true }).fill('-100');
  await expect(page.getByRole('spinbutton', { name: 'Item X', exact: true })).toHaveValue('-100');
  await page.getByRole('checkbox', { name: 'Snap to edges', exact: true }).check();
  await expect(page.getByRole('spinbutton', { name: 'Item X', exact: true })).toHaveValue('0');
});
test('clipboard, one-step layers and contextual graphic/text styles work with history', async ({
  page,
}) => {
  await createPair(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByText('Graphic style', { exact: true }).click();
  await page.getByRole('button', { name: 'Flip horizontal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Flip horizontal', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByLabel('Border width', { exact: true }).fill('4');
  await page.getByLabel('Shadow', { exact: true }).selectOption('soft');
  await page.getByText('Graphic style', { exact: true }).click();
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await page.getByRole('button', { name: 'Paste', exact: true }).click();
  await expect(page.getByText('Board items (3)', { exact: true })).toBeVisible();
  await page.getByText('Graphic style', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Flip horizontal', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Border width', { exact: true })).toHaveValue('4');
  await page.getByText('Graphic style', { exact: true }).click();
  await page.getByRole('button', { name: 'Backward', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  await page.getByText('Text style', { exact: true }).click();
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await page.getByRole('button', { name: 'Italic', exact: true }).click();
  await page.getByLabel('Letter spacing', { exact: true }).fill('3');
  await page.getByLabel('Line height', { exact: true }).fill('1.5');
  await expect(page.getByRole('button', { name: 'Bold', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(errors).toEqual([]);
});
