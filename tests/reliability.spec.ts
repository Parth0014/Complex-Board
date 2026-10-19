import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('copied collages keep independent layout controls and partial copies leave the original editable', async ({
  page,
}) => {
  await createBoard(page, { layout: 'Portrait' });
  const handle = await runtime(page);
  const sourceIds = await handle.evaluate(async ({ adapter }) => {
    const files: File[] = [];
    for (let i = 0; i < 5; i++) {
      const c = document.createElement('canvas');
      c.width = 80;
      c.height = 120;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = `hsl(${i * 65} 60% 50%)`;
      ctx.fillRect(0, 0, 80, 120);
      const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
      files.push(new File([blob], `photo-${i}.png`, { type: 'image/png' }));
    }
    const ids = await adapter.storePhotos(files);
    await adapter.arrangePhotos(ids, 'interlocking:moon');
    const source = adapter.history.document.items.map((i) => i.id);
    adapter.select(source);
    adapter.duplicateSelection();
    return source;
  });
  await page.getByRole('button', { name: 'Adjust layout', exact: true }).click();
  await expect(page.locator('[data-collage-divider]')).toHaveCount(5);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await handle.evaluate(({ adapter }, ids) => adapter.select([ids[0]]), sourceIds);
  await expect(page.getByRole('button', { name: 'Adjust layout', exact: true })).toBeVisible();
  await handle.evaluate(({ adapter }) => adapter.duplicateSelection());
  await handle.evaluate(({ adapter }, ids) => adapter.select([ids[0]]), sourceIds);
  await page.getByRole('button', { name: 'Adjust layout', exact: true }).click();
  await expect(page.locator('[data-collage-divider]')).toHaveCount(5);
});

test('font changes retain selection and held keyboard moves redo with Ctrl+Y', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) =>
    adapter.createTextPreset({
      id: 'audit',
      label: 'Audit',
      sample: 'A year of becoming',
      category: 'editorial',
      fontFamily: 'georgia',
      fontSize: 38,
      color: '#30252b',
    }),
  );
  for (const name of ['Cinzel', 'Kalam', 'Outfit']) {
    await page.getByRole('button', { name: 'Font family', exact: true }).click();
    await page.getByRole('option', { name, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Font family', exact: true })).toBeVisible();
  }
  await page.getByLabel('Editable vision board', { exact: true }).focus();
  const initial = await handle.evaluate(({ adapter }) => adapter.history.document.items[0].x);
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items[0].x)).toBe(
    initial + 5,
  );
  await page.keyboard.press('Control+z');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items[0].x)).toBe(initial);
  await page.keyboard.press('Control+y');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items[0].x)).toBe(
    initial + 5,
  );
});

test('templates reopen from cache and reduced-motion narrow layout remains usable', async ({
  page,
}) => {
  await createBoard(page, { layout: 'Portrait' });
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  if (!(await page.getByRole('region', { name: 'Templates panel', exact: true }).isVisible()))
    await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await expect(page.locator('.templates-panel__card img')).toHaveCount(3);
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => {
    const original = adapter.previewScrapbookTemplate.bind(adapter);
    adapter.previewScrapbookTemplate = () => {
      throw new Error('Cached preview rebuilt');
    };
    (window as unknown as { restorePreview: () => void }).restorePreview = () => {
      adapter.previewScrapbookTemplate = original;
    };
  });
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Templates panel', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Templates', exact: true }).click();
    await expect(page.locator('.templates-panel__card img')).toHaveCount(3);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Close panel', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
