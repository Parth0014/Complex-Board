import { test, expect } from '@playwright/test';

test('asset selection changes redraw only the overlay, not the image artwork', async ({ page }) => {
  await page.addInitScript(() => {
    const counter = window as Window & { imageDraws: number };
    counter.imageDraws = 0;
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: Parameters<typeof original>) {
      counter.imageDraws++;
      return original.apply(this, args);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.locator('.v1-asset-grid button').first().click();
  await page.waitForTimeout(400);
  await page.evaluate(() => (window as Window & { imageDraws: number }).imageDraws = 0);
  const board = page.getByLabel('Editable vision board', { exact: true });
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('toolbar', { name: 'Selection controls' })).toHaveCount(0);
    const box = (await board.locator('canvas').first().boundingBox())!;
    const scale = Number(await board.getAttribute('data-scale'));
    await page.mouse.click(box.x + Number(await board.getAttribute('data-page-left')) + 180 * scale,
      box.y + Number(await board.getAttribute('data-page-top')) + 180 * scale);
    await expect(page.getByRole('toolbar', { name: 'Selection controls' })).toBeVisible();
  }
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as Window & { imageDraws: number }).imageDraws)).toBe(0);
});

test('drawing tools live in the slim sidebar and Escape returns to arranging', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('toolbar', { name: 'Canvas tools' })).toHaveCount(0);
  await page.getByLabel('Drawing tools', { exact: true }).click();
  const trigger = (await page.getByLabel('Drawing tools', { exact: true }).boundingBox())!;
  await expect.poll(async () => {
    const palette = (await page.locator('.vs-draw-pop').boundingBox())!;
    return Math.abs(palette.y - trigger.y);
  }).toBeLessThan(2);
  expect((await page.locator('.vs-draw-pop').boundingBox())!.x).toBeGreaterThan(trigger.x + trigger.width);
  await page.getByRole('button', { name: 'pen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'marker', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select', exact: true })).toBeVisible();
  const board = page.getByLabel('Editable vision board', { exact: true });
  expect(await board.evaluate(node => getComputedStyle(node).cursor)).toContain('url(');
  await page.getByRole('button', { name: 'Select', exact: true }).click();
  expect(await board.evaluate(node => getComputedStyle(node).cursor)).toBe('default');
  await page.getByLabel('Drawing tools', { exact: true }).click();
  await page.getByRole('button', { name: 'pen', exact: true }).click();
  await page.keyboard.press('Escape');
  expect(await board.evaluate(node => getComputedStyle(node).cursor)).toBe('default');
});

test('objects beyond board edges do not expand or reposition the canvas surface', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'rectangle', exact: true }).click();
  await page.getByRole('button', { name: 'Open properties', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Snap to edges', exact: true }).uncheck();
  await page.waitForTimeout(350);
  const board = page.getByLabel('Editable vision board', { exact: true });
  const geometry = () => board.evaluate(node => ({
    left: node.getAttribute('data-page-left'), top: node.getAttribute('data-page-top'),
    width: node.scrollWidth, height: node.scrollHeight,
  }));
  const before = await geometry();
  await page.getByRole('spinbutton', { name: 'Item X', exact: true }).fill('-200');
  await page.getByRole('spinbutton', { name: 'Item X', exact: true }).blur();
  expect(await geometry()).toEqual(before);
});

test('editing toolbar leaves the canvas fixed and marquee can start outside the board', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'rectangle', exact: true }).click();
  await page.waitForTimeout(350); // Let the library opening transition settle.
  const board = page.getByLabel('Editable vision board', { exact: true });
  const canvas = board.locator('canvas').first();
  const selectedBounds = await canvas.boundingBox();
  await canvas.evaluate(node => node.setAttribute('data-stable-canvas', 'original'));
  const selectedScale = await board.getAttribute('data-scale');
  const toolbar = page.getByRole('toolbar', { name: 'Selection controls' });
  expect(await toolbar.evaluate(node => getComputedStyle(node).position)).toBe('fixed');
  const toolbarBounds = (await toolbar.boundingBox())!;
  const boardTop = selectedBounds!.y + Number(await board.getAttribute('data-page-top'));
  expect(toolbarBounds.y + toolbarBounds.height).toBeLessThanOrEqual(boardTop);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('toolbar', { name: 'Selection controls' })).toHaveCount(0);
  expect(await canvas.boundingBox()).toEqual(selectedBounds);
  await expect(canvas).toHaveAttribute('data-stable-canvas', 'original');
  expect(await board.getAttribute('data-scale')).toBe(selectedScale);
  const box = (await canvas.boundingBox())!;
  const left = Number(await board.getAttribute('data-page-left'));
  const top = Number(await board.getAttribute('data-page-top'));
  const scale = Number(selectedScale);
  await page.mouse.move(box.x + left - 20, box.y + top + 100 * scale);
  await page.mouse.down();
  await page.mouse.move(box.x + left + 800 * scale, box.y + top + 800 * scale, { steps: 30 });
  await page.mouse.up();
  await expect(page.getByRole('toolbar', { name: 'Selection controls' })).toBeVisible();
  expect(await canvas.boundingBox()).toEqual(selectedBounds);
  await expect(canvas).toHaveAttribute('data-stable-canvas', 'original');
  expect(await board.getAttribute('data-scale')).toBe(selectedScale);
});

test('clicking empty workspace outside the board clears selection without deleting content', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  const controls = page.getByRole('toolbar', { name: 'Selection controls' });
  await expect(controls).toBeVisible();
  await page.waitForTimeout(350);
  const board = page.getByLabel('Editable vision board', { exact: true });
  const box = (await board.locator('canvas').first().boundingBox())!;
  const left = Number(await board.getAttribute('data-page-left'));
  await page.mouse.click(box.x + Math.max(4, left / 2), box.y + box.height / 2);
  await expect(controls).toHaveCount(0);
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
});

test('deleting the final selected item leaves an empty board without a selection-like focus ring', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  await expect(page.getByRole('toolbar', { name: 'Selection controls' })).toBeVisible();
  const board = page.getByLabel('Editable vision board', { exact: true });
  await board.focus();
  await page.keyboard.press('Delete');
  await expect(page.getByText('Board items (0)', { exact: true })).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'Selection controls' })).toHaveCount(0);
  await expect(board).toBeFocused();
  expect(await board.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('none');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
});
