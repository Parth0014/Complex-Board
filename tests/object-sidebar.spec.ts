import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('object sidebar separates editing from geometry and shows only shared tools for mixed selections', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  const ids = await handle.evaluate(({ adapter }) => {
    adapter.createTextPreset({
      id: 'inspector',
      label: 'Text',
      sample: 'Make room for good things',
      fontFamily: 'georgia',
      fontSize: 48,
      color: '#33272b',
    });
    adapter.createShape('rectangle');
    const ids = adapter.history.document.items.map((item) => item.id);
    adapter.select([ids[0]]);
    return ids;
  });
  await page.getByRole('button', { name: 'Formatting', exact: true }).click();
  const dock = page.getByRole('complementary', { name: 'Object formatting', exact: true });
  await expect(dock.getByRole('tab', { name: 'Edit', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(dock.getByLabel('Styled text', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.godmode/screenshots/sidebar-text.png' });
  await expect(dock.getByLabel('Bounds width', { exact: true })).toHaveCount(0);
  await dock.getByRole('tab', { name: 'Layout', exact: true }).click();
  await dock.getByLabel('Bounds width', { exact: true }).fill('600');
  await dock.getByLabel('Bounds width', { exact: true }).press('Tab');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items[0].width)).toBe(600);
  await handle.evaluate(({ adapter }, ids) => adapter.select(ids), ids);
  await dock.getByRole('tab', { name: 'Edit', exact: true }).click();
  await expect(dock.getByLabel('Styled text', { exact: true })).toHaveCount(0);
  await dock
    .locator('summary')
    .filter({ hasText: /^Opacity$/ })
    .click();
  await expect(dock.getByLabel('Opacity (%)', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.godmode/screenshots/sidebar-mixed.png' });
});

test('photo, shape, drawing and locked selections keep a focused sidebar on desktop and mobile', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  const ids = await handle.evaluate(async ({ adapter }) => {
    adapter.createShape('rectangle');
    const shape = adapter.selectedIds[0];
    adapter.createDrawing([100, 100, 200, 150, 300, 110], '#4a3fd8', 5);
    const drawing = adapter.selectedIds[0];
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 180;
    canvas.getContext('2d')!.fillRect(0, 0, 120, 180);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!)));
    await adapter.uploadPhotos([new File([blob], 'inspector.png', { type: 'image/png' })]);
    return { shape, drawing, photo: adapter.selectedIds[0] };
  });
  await page.getByRole('button', { name: 'Image effects', exact: true }).click();
  const dock = page.getByRole('complementary', { name: 'Object formatting', exact: true });
  await expect(dock.locator('summary').filter({ hasText: /^(Fit|Filters)$/ })).toHaveCount(0);
  await expect(dock.getByRole('button', { name: /^(Fit|Fill) image$/ })).toHaveCount(0);
  await expect(dock.getByLabel('Brightness (%)', { exact: true })).toBeHidden();
  await expect(dock.getByRole('button', { name: 'Compare original image' })).toHaveCount(0);
  await expect(dock.getByLabel('Temperature', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: '.godmode/screenshots/sidebar-photo.png' });
  await dock.getByRole('tab', { name: 'Layout', exact: true }).click();
  await expect(dock.getByLabel('Bounds width', { exact: true })).toBeVisible();
  await expect(dock.getByLabel('Position X', { exact: true })).toHaveCount(0);
  await expect(dock.getByRole('button', { name: 'Fit to content' })).toHaveCount(0);
  await handle.evaluate(({ adapter }, id) => adapter.select([id]), ids.shape);
  await dock.getByRole('tab', { name: 'Edit', exact: true }).click();
  await expect(dock.getByRole('button', { name: 'Shape fill color', exact: true })).toBeVisible();
  await expect(dock.getByRole('button', { name: 'Text color', exact: true })).toHaveCount(0);
  await expect(dock.getByRole('button', { name: 'Add gradient', exact: true })).toHaveCount(0);
  await expect(dock.getByLabel('Shadow preset', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: '.godmode/screenshots/sidebar-shape.png' });
  await handle.evaluate(({ adapter }, id) => adapter.select([id]), ids.drawing);
  await expect(dock.getByLabel('Pen width', { exact: true })).toBeVisible();
  await expect(dock.getByLabel('Border width', { exact: true })).toHaveCount(0);
  await handle.evaluate(
    ({ adapter }, id) => adapter.patchItems([{ id, patch: { locked: true } }]),
    ids.drawing,
  );
  await expect(dock.getByLabel('Pen width', { exact: true })).toBeDisabled();
  await dock.getByRole('button', { name: 'Unlock selection', exact: true }).click();
  await expect(dock.getByLabel('Pen width', { exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(
    dock.getByRole('button', { name: 'Close editor panel', exact: true }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.godmode/screenshots/sidebar-mobile.png' });
});

test('layers keep long names within the panel and actions reachable', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => {
    adapter.createTextPreset({
      id: 'long',
      label: 'Text',
      sample: 'VeryLongUnbrokenLayerName'.repeat(20),
      fontFamily: 'georgia',
      fontSize: 48,
      color: '#33272b',
    });
  });
  await page.getByRole('button', { name: 'Formatting', exact: true }).click();
  const dock = page.getByRole('complementary', { name: 'Object formatting', exact: true });
  await dock.getByRole('tab', { name: 'Layers', exact: true }).click();
  const body = dock.locator('.object-inspector-body');

  expect(await body.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(dock.getByRole('button', { name: 'Lock layer', exact: true })).toBeInViewport();
  await dock.getByRole('button', { name: 'Lock layer', exact: true }).click();
  await expect(dock.getByRole('button', { name: 'Unlock layer', exact: true })).toBeVisible();
  await page.screenshot({ path: '.godmode/screenshots/sidebar-layers.png' });
});

test('sidebar crop controls stay contained through apply and cancel', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(async ({ adapter }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 360;
    canvas.getContext('2d')!.fillRect(0, 0, 240, 360);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!)));
    await adapter.uploadPhotos([new File([blob], 'crop-test.png', { type: 'image/png' })]);
    adapter.setImageFit('fill');
  });
  await page.getByRole('button', { name: 'Image effects', exact: true }).click();
  const dock = page.getByRole('complementary', { name: 'Object formatting', exact: true });
  for (const action of ['Cancel crop', 'Apply crop']) {
    await page.getByRole('button', { name: 'Adjust photo', exact: true }).click();
    await expect(page.getByRole('slider', { name: 'Photo zoom', exact: true })).toBeVisible();
    await expect(dock.getByRole('slider', { name: 'Photo zoom', exact: true })).toHaveCount(0);
    expect(
      await dock
        .locator('.object-inspector-body')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    const button = page.getByRole('button', { name: action, exact: true });
    await button.scrollIntoViewIfNeeded();
    const contained = await button.evaluate((el) => {
      const panel = el.closest('.vs-top-editing-bar')!.getBoundingClientRect(),
        box = el.getBoundingClientRect();
      return box.left >= panel.left && box.right <= panel.right;
    });

    expect(contained).toBe(true);
    await page.screenshot({ path: '.godmode/screenshots/sidebar-crop.png' });
    await button.click();
    await expect(page.getByRole('button', { name: 'Adjust photo', exact: true })).toBeVisible();
    expect(await handle.evaluate(({ adapter }) => !!adapter.cropDraft)).toBe(false);
  }
});
