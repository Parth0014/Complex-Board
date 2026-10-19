import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';
test.use({ viewport: { width: 1366, height: 768 } });

test('desktop foundation, drawing dismissal and camera shortcuts', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(
    /^"?DM Sans/,
  );
  const scale = () => page.locator('[data-camera-space]').getAttribute('data-scale');
  await page.keyboard.press('Control+1');
  await expect.poll(scale).toBe('1');
  await page.keyboard.press('Control+0');
  await expect.poll(async () => Number(await scale())).toBeLessThan(1);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Drawing tools', exact: true }).click();
  const palette = page.getByRole('toolbar', { name: 'Drawing palette' });
  await expect(palette).toBeVisible();
  await palette.getByRole('button', { name: 'Pen', exact: true }).click();
  await expect(palette).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Drawing tools', exact: true })).toHaveClass(
    /is-active/,
  );
  await expect(page.getByRole('button', { name: 'Create', exact: true })).not.toHaveClass(
    /is-active/,
  );
  await expect(page.getByRole('slider', { name: 'Brush size' })).toBeVisible();
  await page.getByRole('button', { name: 'Drawing tools', exact: true }).click();
  await page.mouse.click(1150, 620);
  await expect(palette).not.toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Canvas options', exact: true }).click();
  await expect(page.getByText('Alignment guides', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Alignment guides', { exact: true })).not.toBeVisible();
  await page.keyboard.press('Control+/');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('insertions cascade, fonts attach to trigger and original right-click actions stay available', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  const items = await handle.evaluate(({ adapter }) => {
    adapter.createShape('heart');
    adapter.createShape('star');
    return adapter.history.document.items.map(({ x, y, width }) => ({ x, y, width }));
  });
  expect(items[0].x).not.toBe(items[1].x);
  expect(items[0].width).toBeGreaterThan(1920 * 0.2);
  await expect(page.getByRole('button', { name: 'More selection actions' })).toHaveCount(0);
  await page.getByLabel('Editable vision board', { exact: true }).click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: /Align to page/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel__item').first().click();
  expect(
    await handle.evaluate(({ adapter }) => adapter.history.document.items.at(-1)!.fontSize),
  ).toBeGreaterThanOrEqual(120);
  const font = page.getByRole('button', { name: 'Font family', exact: true });
  await font.click();
  const triggerBounds = (await font.boundingBox())!;
  const menuBounds = (await page.getByRole('group', { name: 'Choose font' }).boundingBox())!;
  expect(Math.abs(triggerBounds.x - menuBounds.x)).toBeLessThanOrEqual(2);
  await page.screenshot({ path: '.godmode/screenshots/desktop-audit-toolbar.png' });
});

test('photo arranger escapes and collage inserts beneath existing content', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create photo collage', exact: true })).toBeDisabled();
  const handle = await runtime(page);
  const photoIds = await handle.evaluate(async ({ adapter }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f08';
    ctx.fillRect(0, 0, 80, 100);
    const files: File[] = [];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `hsl(${i * 60}, 70%, 50%)`;
      ctx.fillRect(0, 0, 80, 100);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!)));
      files.push(new File([blob], `photo-${i}.png`, { type: 'image/png' }));
    }
    const ids = await adapter.storePhotos(files);
    adapter.createShape('heart');
    return ids;
  });
  await page.getByRole('button', { name: 'Create photo collage', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create photo collage' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  const result = await handle.evaluate(async ({ adapter }, ids) => {
    const existing = adapter.history.document.items[0].id;
    await adapter.arrangePhotos(ids, 'interlocking:river');
    const last = adapter.history.document.items.at(-1)!.id;
    adapter.undo();
    return { existing, last, undoCount: adapter.history.document.items.length };
  }, photoIds);
  expect(result.last).toBe(result.existing);
  expect(result.undoCount).toBe(1);
});
