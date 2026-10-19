import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('new board setup is a focused modal with portrait as the default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home-example-boards img')).toHaveCount(3);
  await expect
    .poll(() =>
      page
        .locator('.home-example-boards img')
        .evaluateAll((nodes) =>
          nodes.every(
            (node) =>
              (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.screenshot({
    path: '.godmode/screenshots/home-example-boards.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: '+ New board', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a board', exact: true });
  await expect(dialog.getByLabel('Name', { exact: true })).toBeFocused();
  await expect(dialog.getByRole('radio', { name: 'Portrait', exact: true })).toBeChecked();
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({
    path: '.godmode/screenshots/new-board-modal.png',
    animations: 'disabled',
  });
  await dialog.getByRole('button', { name: 'Create board', exact: true }).click();
  const handle = await runtime(page);
  expect(
    await handle.evaluate(({ adapter }) => [
      adapter.history.document.width,
      adapter.history.document.height,
    ]),
  ).toEqual([1080, 1920]);
  const coverage = await page.locator('.gs-artboard').evaluate((node) => {
    const scale = Number((node as HTMLElement).dataset.scale);
    return Math.max((1080 * scale) / node.clientWidth, (1920 * scale) / node.clientHeight);
  });
  expect(coverage).toBeGreaterThan(0.75);
});

for (const width of [320, 390])
  test('mobile header keeps title, history and board actions at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await createBoard(page, { layout: 'Portrait', closeLibrary: true });
    const handle = await runtime(page);
    await handle.evaluate(({ adapter }) => adapter.createShape('circle'));
    await expect(page.getByRole('textbox', { name: 'Board name', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
    await expect(page.locator('.vs-save')).toBeVisible();
    await expect(page.locator('.vs-save > span:last-child')).toBeVisible();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(await handle.evaluate(({ adapter }) => adapter.history.document.items.length)).toBe(0);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await page.getByRole('button', { name: 'File menu', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'Preview board', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Export board', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.keyboard.press('Escape');
    await page.screenshot({
      path: `.godmode/screenshots/mobile-header-${width}.png`,
      animations: 'disabled',
    });
  });

test('mobile tools scroll to Discover and sheets stay compact without overlapping pills', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createBoard(page, { layout: 'Portrait', closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => adapter.createShape('circle'));
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Templates panel', exact: true });
  await expect(panel.getByRole('button', { name: 'Use template' }).first()).toBeEnabled({
    timeout: 20000,
  });
  await expect(panel.getByRole('button', { name: 'Use template' }).first()).toBeInViewport();
  expect((await panel.boundingBox())!.height).toBeLessThanOrEqual(844 * 0.4 + 1);
  await expect(page.getByRole('toolbar', { name: 'Selected object actions' })).toBeHidden();
  await expect(page.getByRole('group', { name: 'Board controls', exact: true })).toBeHidden();
  await page.screenshot({
    path: '.godmode/screenshots/mobile-template-sheet.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Collapse library panel', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search elements', exact: true }).fill('heart');
  await page.locator('.elements-card').first().click();
  await expect
    .poll(() => handle.evaluate(({ adapter }) => adapter.history.document.items.length))
    .toBe(2);
  const insertedY = await handle.evaluate(({ adapter }) => {
    const item = adapter.history.document.items.find(
      (entry) => entry.id === adapter.selectedIds[0],
    )!;
    const viewport = window.document.querySelector<HTMLElement>('.gs-artboard')!;
    return (
      viewport.getBoundingClientRect().y +
      Number(viewport.dataset.pageTop) +
      (item.y + item.height / 2) * Number(viewport.dataset.scale)
    );
  });
  expect(insertedY).toBeLessThan(
    (await page.getByRole('region', { name: 'Elements panel', exact: true }).boundingBox())!.y - 24,
  );
  await page.getByRole('button', { name: 'Collapse library panel', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Elements panel', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'More tools', exact: true }).click();
  const discover = page.getByRole('button', { name: 'Discover', exact: true });
  await expect
    .poll(async () => {
      const bounds = (await discover.boundingBox())!;
      return bounds.x >= 0 && bounds.x + bounds.width <= 390;
    })
    .toBe(true);
  await discover.click();
  await expect(page.getByRole('region', { name: 'Discover panel', exact: true })).toBeVisible();
});

test('unsupported template sizes offer a working portrait switch', async ({ page }) => {
  await createBoard(page, { layout: 'Landscape', closeLibrary: true });
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('button', { name: 'Switch to portrait', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Resize board', exact: true });
  await expect(dialog.getByRole('combobox', { name: 'Board size' })).toHaveValue('1080x1920');
  await dialog.getByRole('button', { name: 'Resize board', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use template' }).first()).toBeEnabled({
    timeout: 20000,
  });
});

test('elements insert at a useful size in the viewport and toolbar actions support undo', async ({
  page,
}) => {
  await createBoard(page, { layout: 'Portrait', closeLibrary: true });
  const handle = await runtime(page);
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search elements', exact: true }).fill('heart');
  await page.locator('.elements-card').first().click();
  await expect
    .poll(() => handle.evaluate(({ adapter }) => adapter.history.document.items.length))
    .toBe(1);
  const result = await handle.evaluate(({ adapter }) => {
    const board = adapter.history.document;
    const item = board.items[0];
    const center = adapter.insertionCenter!();
    return {
      ratio: Math.max(item.width / board.width, item.height / board.height),
      error: Math.max(
        Math.abs(item.x + item.width / 2 - center.x),
        Math.abs(item.y + item.height / 2 - center.y),
      ),
      aspect: item.width / item.height,
      source: item.asset!.width / item.asset!.height,
    };
  });
  expect(result.ratio).toBeGreaterThanOrEqual(0.12);
  expect(result.ratio).toBeLessThanOrEqual(0.78);
  expect(result.error).toBeLessThan(2);
  expect(result.aspect).toBeCloseTo(result.source);
  await page.keyboard.press('Control+d');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items.length)).toBe(2);
  await page.keyboard.press('Delete');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items.length)).toBe(1);
  await page.keyboard.press('Control+z');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items.length)).toBe(2);
});

test('phone board creation stays visible and reports storage errors inside the dialog', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '+ New board', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a board', exact: true });
  await expect(dialog.getByLabel('Name', { exact: true })).toBeFocused();
  await dialog.getByLabel('Name', { exact: true }).fill('My next chapter');
  expect((await dialog.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  await page.evaluate(() =>
    Object.defineProperty(IDBDatabase.prototype, 'transaction', {
      configurable: true,
      value: () => {
        throw new DOMException('Storage is full.', 'QuotaExceededError');
      },
    }),
  );
  await dialog.getByRole('button', { name: 'Create board', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue('My next chapter');
  await dialog.getByRole('button', { name: 'Close board setup', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
