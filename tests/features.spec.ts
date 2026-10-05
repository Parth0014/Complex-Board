import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('shapes, styling, drawing and autosave survive reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'heart', exact: true }).click();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByLabel('Stroke width', { exact: true }).fill('4');
  await page.getByLabel('Effect', { exact: true }).selectOption('glow');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'pen', exact: true }).click();
  await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  const viewport = page.getByLabel('Editable vision board', { exact: true }),
    canvas = viewport.locator('canvas').first(),
    box = (await canvas.boundingBox())!,
    scale = Number(await viewport.getAttribute('data-scale')),
    left = Number(await viewport.getAttribute('data-page-left')),
    top = Number(await viewport.getAttribute('data-page-top'));
  await page.mouse.move(box.x + left + 400 * scale, box.y + top + 400 * scale);
  await page.mouse.down();
  await page.mouse.move(box.x + left + 700 * scale, box.y + top + 600 * scale, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByText('Board items (2)', { exact: true })).toBeVisible();
  await expect(page.locator('.vs-save[role="status"]')).toHaveText('Saved');
  await page.reload();
  await expect(page.getByText('Board items (2)', { exact: true })).toBeVisible();
  await expect(page.locator('.vs-save[role="status"]')).toHaveText('Saved');
  expect(errors).toEqual([]);
});
test('curated frame clipping, crop and PDF/JPG export retain content after reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByLabel('Category', { exact: true }).selectOption('photo-frames');
  await page.getByRole('button', { name: 'Classic portrait', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByLabel('Frame content', { exact: true }).selectOption({ label: 'Focused desk' });
  await expect(page.getByLabel('Frame content', { exact: true })).not.toHaveValue('');
  await page.getByRole('button', { name: 'Edit crop', exact: true }).click();
  await page.getByLabel('Crop width', { exact: true }).fill('70');
  await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
  await page.getByLabel('Contrast', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Share', exact: false }).click();
  for (const format of ['PDF', 'JPEG', 'TRANSPARENT']) {
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: `Download ${format}`, exact: true }).click();
    const download = await pending;
    const bytes = readFileSync((await download.path())!);
    if (format === 'PDF') expect(bytes.subarray(0, 8).toString()).toContain('%PDF-1.4');
    else if (format === 'JPEG') expect(bytes[0]).toBe(255);
    else expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  }
  await page.getByRole('button', { name: 'Close export', exact: true }).click();
  await expect(page.locator('.vs-save[role="status"]')).toHaveText('Saved');
  await page.reload();
  await page.getByText('Board items (1)', { exact: true }).click();
  await page.locator('.v1-items li button').first().click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await expect(page.getByLabel('Frame content', { exact: true })).not.toHaveValue('');
  expect(errors).toEqual([]);
});
test('nested groups allow member edits without losing parent identity', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Add goal card', exact: true }).click();
  await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+g');
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.locator('.layer-group>summary').first().click();
  await page.locator('.layer-group .layer-group>summary').first().click();
  await page.locator('.layer-row>button').filter({ hasText: 'I am building' }).first().click();
  await expect(page.getByRole('button', { name: /Exit group/ })).toContainText('(2)');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('My edited goal');
  await page.getByRole('textbox', { name: 'Text', exact: true }).blur();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Board items (4)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Exit group/ })).toContainText('(1)');
});
test('AI preview creates editable content and surfaces server failures', async ({ page }) => {
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  await page.route('**/api/ai/generate', (route) =>
    route.fulfill({
      json: { title: 'My dream year', goals: ['Travel to Japan', 'Build my career'] },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByLabel('AI generation type', { exact: true }).selectOption('board');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My dream year', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add to board', exact: true }).click();
  await expect(page.getByText('Board items (7)', { exact: true })).toBeVisible();
  await page.route('**/api/ai/generate', (route) =>
    route.fulfill({ status: 429, json: { error: 'Generation quota reached' } }),
  );
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('quota');
});
test('page switching, graphic recolor and backups preserve independent content', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByLabel('Category', { exact: true }).selectOption('goal-objects');
  await page.getByRole('button', { name: 'Focused desk', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByLabel('Replace color currentcolor', { exact: true }).fill('#ff0000');
  await expect(page.getByLabel('Replace color currentcolor', { exact: true })).toHaveValue(
    '#ff0000',
  );
  await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  await expect(page.getByText('Board items (0)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'circle', exact: true }).click();
  await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await page.getByLabel('Active page', { exact: true }).selectOption({ label: '1' });
  await page.getByText('Board items (1)', { exact: true }).click();
  await page.locator('.v1-items li button').first().click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await expect(page.getByLabel('Replace color currentcolor', { exact: true })).toHaveValue(
    '#ff0000',
  );
  await page.getByText('File', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const backup = await pending;
  const document = JSON.parse(readFileSync((await backup.path())!, 'utf8'));
  expect(document.pages).toHaveLength(2);
  expect(document.items[0].colorOverrides.currentcolor).toBe('#ff0000');
  await page.getByLabel('Restore backup', { exact: true }).setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole('alert')).toContainText('Invalid');
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
});
test('generated image insertion persists and monochrome edits appear in exported pixels', async ({
  page,
}) => {
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  await page.goto('/');
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2233dd';
    ctx.fillRect(0, 0, 64, 64);
    return canvas.toDataURL('image/png');
  });
  await page.route('**/api/ai/generate', (route) => route.fulfill({ json: { image } }));
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByAltText('Generated preview')).toBeVisible();
  await page.getByRole('button', { name: 'Add to board', exact: true }).click();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByRole('button', { name: 'Mono', exact: true }).click();
  await page.getByRole('button', { name: /Share/ }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const download = await pending,
    png = readFileSync((await download.path())!);
  const pixel = await page.evaluate(
    async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      return [...ctx.getImageData(300, 360, 1, 1).data];
    },
    `data:image/png;base64,${png.toString('base64')}`,
  );
  expect(Math.abs(pixel[0] - pixel[1])).toBeLessThan(3);
  expect(Math.abs(pixel[1] - pixel[2])).toBeLessThan(3);
  await page.getByRole('button', { name: 'Close export', exact: true }).click();
  await expect(page.locator('.vs-save[role="status"]')).toHaveText('Saved');
  await page.reload();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
});
