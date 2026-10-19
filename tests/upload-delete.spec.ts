import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('upload deletion overlays the visible editor and preserves photos already on the board', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(async ({ adapter }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#4a3fd8';
    context.fillRect(0, 0, 120, 120);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!)));
    await adapter.uploadPhotos([new File([blob], 'confirmation.png', { type: 'image/png' })]);
  });
  const board = await handle.evaluate(({ adapter }) => JSON.stringify(adapter.history.document));
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  const remove = page.getByRole('button', {
    name: 'Delete uploaded photo confirmation.png',
    exact: true,
  });
  await expect(remove).toHaveCSS('opacity', '0');
  await page.locator('.discover-photo').first().hover();
  await expect(remove).toHaveCSS('opacity', '1');
  const photo = page.locator('.discover-photo img').first();
  const imageBounds = (await photo.boundingBox())!;
  const deleteBounds = (await remove.boundingBox())!;
  expect(deleteBounds.y).toBeGreaterThan(imageBounds.y);
  expect(deleteBounds.y + deleteBounds.height).toBeLessThan(imageBounds.y + imageBounds.height);
  expect(deleteBounds.x).toBeGreaterThan(imageBounds.x + imageBounds.width / 2);
  await remove.click();
  const dialog = page.getByRole('dialog', { name: 'Delete uploaded photo', exact: true });
  await expect(dialog).toBeVisible();
  const alpha = await dialog.evaluate((node) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    context.fillStyle = getComputedStyle(node.parentElement!).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data[3];
  });
  expect(alpha).toBeGreaterThan(0);
  expect(alpha).toBeLessThan(100);
  await page.screenshot({ path: '.godmode/screenshots/upload-delete.png' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(remove).toBeFocused();
  await remove.click();
  await dialog.getByRole('button', { name: 'Delete photo', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(remove).toHaveCount(0);
  expect(await handle.evaluate(({ adapter }) => JSON.stringify(adapter.history.document))).toBe(
    board,
  );
});
