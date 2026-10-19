import { test, expect, type Page } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

async function openArranger(page: Page, mode: 'failure' | 'pending' | 'ready', saved?: string) {
  await createBoard(page, { layout: 'Portrait' });
  const handle = await runtime(page);
  await handle.evaluate(async ({ adapter }, mode) => {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 120;
    const files: File[] = [];
    for (let i = 0; i < 5; i++) {
      const context = canvas.getContext('2d')!;
      context.fillStyle = `hsl(${i * 60} 60% 50%)`;
      context.fillRect(0, 0, 80, 120);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!)));
      files.push(new File([blob], `audit-${i}.png`, { type: 'image/png' }));
    }
    await adapter.storePhotos(files);
    const preview = canvas.toDataURL();
    let failed = false;
    let calls = 0;
    adapter.previewPhotoArrangement = async () => {
      const index = calls++;
      if (mode === 'failure' && !failed) {
        failed = true;
        throw new Error('Preview temporarily unavailable');
      }
      if (mode === 'pending' && index > 0) return new Promise<string>(() => {});
      return preview;
    };
  }, mode);
  if (saved)
    await page.evaluate((saved) => {
      localStorage.setItem(
        `visbo-arrange:${new URL(location.href).searchParams.get('board')}`,
        saved,
      );
    }, saved);
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page.getByRole('button', { name: 'Arrange photos', exact: true }).click();
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  return handle;
}

test('one failed preview does not stop the remaining collages and can be retried', async ({
  page,
}) => {
  await openArranger(page, 'failure');
  await expect(page.locator('.scrapbook-preset-art img')).toHaveCount(17);
  await page.getByRole('button', { name: /Retry.*preview/i }).click();
  await expect(page.locator('.scrapbook-preset-art img')).toHaveCount(18);
});

test('invalid saved photo selection recovers to a usable picker', async ({ page }) => {
  await openArranger(page, 'ready', 'null');
  await expect(page.locator('.scrapbook-preset-art img')).toHaveCount(18);
});

test('ready collage is usable while other previews are still loading', async ({ page }) => {
  await openArranger(page, 'pending');
  await expect(page.locator('.scrapbook-preset-art img')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Add to canvas', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Shuffle photos in/ }).first()).toBeEnabled();
});

test('busy dialog cannot disappear on Escape and background cannot take focus', async ({
  page,
}) => {
  const handle = await openArranger(page, 'ready');
  const dialog = page.getByRole('dialog', { name: 'Arrange photos', exact: true });
  await expect(page.locator('.scrapbook-preset-art img')).toHaveCount(18);
  await handle.evaluate(({ adapter }) => {
    adapter.arrangePhotos = () => new Promise<void>(() => {});
  });
  // Programmatic focus also respects the modal, not just its Tab loop.
  const escaped = await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('.vs-rail__tab')!.focus();
    return !!document.activeElement?.closest('[role="dialog"]');
  });
  expect(escaped).toBe(true);
  await page.getByRole('button', { name: 'Add to canvas', exact: true }).click();
  await dialog.focus();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveClass(/gs-dialog-exit/);
  await expect(dialog).toBeVisible();
});

test('replacement opens uploads without starting remote providers', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ json: {} });
  });
  await createBoard(page, { closeLibrary: true });
  const file = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page
    .getByRole('button', { name: 'Upload photos', exact: true })
    .setInputFiles({ name: 'replace.png', mimeType: 'image/png', buffer: file });
  await page
    .getByRole('button', { name: 'Add uploaded photo replace.png to board', exact: true })
    .click();
  await page.getByRole('button', { name: 'Replace image', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Replace image', exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Unsplash', exact: true }).click();
  await expect.poll(() => requests.some((url) => url.includes('/api/images/status'))).toBe(true);
  await page.getByRole('button', { name: 'Your uploads', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose replace.png', exact: true })).toBeVisible();
});
