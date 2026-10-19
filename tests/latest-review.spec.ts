import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('fitted camera follows panels while the editing toolbar stays at the canvas top', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 1000 });
  await createBoard(page, { closeLibrary: true });
  const viewport = page.locator('[data-camera-space]');
  const initial = Number(await viewport.getAttribute('data-scale'));
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await expect
    .poll(async () => Number(await viewport.getAttribute('data-scale')))
    .toBeLessThan(initial);
  const themes = page.getByRole('group', { name: 'Browse by theme' });
  await themes.getByRole('button', { name: 'All artwork', exact: true }).click();
  await expect(themes.getByRole('button', { name: 'All artwork', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('Click to add or drag onto your board.')).toBeVisible();
  await page.locator('.elements-card').first().click();
  const handle = await runtime(page);
  await expect(page.getByRole('toolbar', { name: 'Selected object actions' })).toBeVisible();
  const geometry = await handle.evaluate(() => {
    const workspace = document.querySelector('.vs-stage-fill')!.getBoundingClientRect();
    const toolbar = document
      .querySelector('[aria-label="Selected object actions"]')!
      .getBoundingClientRect();
    return {
      top: toolbar.top,
      expected: workspace.top + 12,
      center: toolbar.x + toolbar.width / 2,
      expectedCenter: workspace.x + workspace.width / 2,
    };
  });
  expect(geometry.top).toBeCloseTo(geometry.expected);
  expect(geometry.center).toBeCloseTo(geometry.expectedCenter);
  await handle.evaluate(({ adapter }) => {
    const item = adapter.history.document.items[0];
    adapter.patchItems([{ id: item.id, patch: { x: item.x + 80, y: item.y + 120 } }]);
    adapter.zoomView?.(1);
  });
  await expect
    .poll(
      async () =>
        (await page.getByRole('toolbar', { name: 'Selected object actions' }).boundingBox())!.y,
    )
    .toBeCloseTo(geometry.top);
  await expect(
    page.getByRole('button', { name: 'Object transparency', exact: true }),
  ).toBeVisible();
});

test('empty export is visibly disabled and home offers editable backups', async ({ page }) => {
  await createBoard(page, { name: 'Backup example', closeLibrary: true });
  const exportButton = page.getByRole('button', { name: 'Export', exact: true });
  await expect(exportButton).toHaveAttribute('aria-disabled', 'true');
  expect(
    await exportButton.evaluate((node) => Number(getComputedStyle(node).opacity)),
  ).toBeLessThanOrEqual(0.4);
  await page.goto('/');
  await page.getByRole('button', { name: 'Back up boards', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Back up boards' });
  await expect(dialog).toHaveClass(/vs-dialog/);
  expect(await dialog.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(
    'rgba(0, 0, 0, 0)',
  );
  const box = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
  expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(2);
  await page.screenshot({
    path: '.godmode/screenshots/home-backup-dialog.png',
    animations: 'disabled',
  });
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download Backup example', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('Backup example.visbo');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Back up boards', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close backups' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Back up boards', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
