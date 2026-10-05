import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
async function backup(page: Page) {
  if (!(await page.getByRole('button', { name: 'Save backup', exact: true }).isVisible()))
    await page.getByText('File', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const result = JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
  await page.getByText('File', { exact: true }).click();
  return result;
}
test('rich text, custom shadows and multi-page PDF survive reload without changing the active page', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  const text = page.getByRole('textbox', { name: 'Styled text', exact: true });
  await text.fill('Dream big today');
  await text.evaluate((node: HTMLTextAreaElement) => {
    node.setSelectionRange(6, 9);
    node.dispatchEvent(new Event('select', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Superscript', exact: true }).click();
  await page.getByLabel('Shadow preset', { exact: true }).selectOption('soft');
  await page.getByLabel('Shadow opacity', { exact: true }).fill('0.6');
  await page.getByLabel('Shadow X', { exact: true }).fill('12');
  await page.getByLabel('Shadow X', { exact: true }).blur();
  const saved = await backup(page);
  expect(saved.items[0].textRuns.some((run: { script: string }) => run.script === 'super')).toBe(
    true,
  );
  expect(saved.items[0].shadowOffsetX).toBe(12);
  await page.screenshot({ path: 'test-results/advanced-editor.png' });
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  await page.getByRole('button', { name: /Share/ }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF-ALL', exact: true }).click();
  const pdf = readFileSync((await (await pending).path())!, 'latin1');
  expect(pdf).toContain('/Count 2');
  await page.getByRole('button', { name: 'Close export', exact: true }).click();
  await expect(page.getByText('Board items (0)', { exact: true })).toBeVisible();
  await page.getByLabel('Active page', { exact: true }).selectOption({ index: 0 });
  await expect(page.getByRole('status')).toHaveText('Saved');
  await page.reload();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('connected objects move with their arrow and duplicate bindings independently', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'rectangle', exact: true }).click();
  await page.getByRole('button', { name: 'circle', exact: true }).click();
  await page.getByLabel('Item X', { exact: true }).fill('600');
  await page.getByLabel('Item X', { exact: true }).blur();
  await page.keyboard.press('Control+a');
  await page.getByRole('button', { name: 'Connect selected objects', exact: true }).click();
  const first = await backup(page);
  expect(first.items).toHaveLength(3);
  const arrow = first.items.find((item: { connector: unknown }) => item.connector);
  expect(arrow.connector.from).not.toBe(arrow.connector.to);
  await page.keyboard.press('Control+a');
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  const copied = await backup(page);
  expect(copied.items).toHaveLength(6);
  const copy = copied.items[5];
  expect(copy.connector.from).toBe(copied.items[3].id);
  expect(copy.connector.to).toBe(copied.items[4].id);
  expect(copy.connector.from).not.toBe(arrow.connector.from);
});
test('native clipboard transfers editable groups across tabs', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'Add goal card', exact: true }).click();
  await page.getByRole('button', { name: 'Copy to clipboard', exact: true }).click();
  await expect(page.getByText('Copied to clipboard', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').first()).toHaveText('Saved');
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.getByText('Board items (2)', { exact: true })).toBeVisible();
  await second.getByRole('button', { name: 'Create', exact: true }).click();
  await second.getByRole('button', { name: 'Paste from clipboard', exact: true }).click();
  await expect(second.getByText('Board items (4)', { exact: true })).toBeVisible();
  const saved = await backup(second);
  expect(saved.items[0].groupPath[0]).not.toBe(saved.items[2].groupPath[0]);
});
test('AI image edits preserve originals and stale previews cannot overwrite later changes', async ({
  page,
}) => {
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  await page.goto('/');
  const images = await page.evaluate(() => {
    const image = (color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 64, 64);
      return canvas.toDataURL('image/png');
    };
    return { original: image('#2233dd'), edited: image('#22dd33') };
  });
  await page.route('**/api/ai/generate', (route) =>
    route.fulfill({ json: { image: images.original } }),
  );
  await page.route('**/api/ai/edit', (route) => route.fulfill({ json: { image: images.edited } }));
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Add to board', exact: true }).click();
  await page.getByLabel('AI generation type', { exact: true }).selectOption('edit');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Apply image edit', exact: true }).click();
  let saved = await backup(page);
  expect(saved.items[0].asset.assetUrl).toBe(images.original);
  expect(saved.items[0].rendition).toBe(images.edited);
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByAltText('Generated preview')).toBeVisible();
  await page.getByLabel('Item X', { exact: true }).fill('180');
  await page.getByLabel('Item X', { exact: true }).blur();
  await page.getByRole('button', { name: 'Apply image edit', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Board changed');
  saved = await backup(page);
  expect(saved.items[0].x).toBe(180);
});
test('shape-frame export clips pixels and layer extraction remains editable and undoable', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  await page.goto('/');
  const images = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#2233dd';
    ctx.fillRect(0, 0, 64, 64);
    const source = canvas.toDataURL('image/png');
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = '#22dd33';
    ctx.fillRect(20, 20, 24, 24);
    return { source, cut: canvas.toDataURL('image/png') };
  });
  await page.route('**/api/ai/generate', (route) =>
    route.fulfill({ json: { image: images.source } }),
  );
  await page.route('**/api/ai/remove-background', (route) =>
    route.fulfill({ json: { image: images.cut } }),
  );
  await page.route('**/api/ai/edit', (route) => route.fulfill({ json: { image: images.source } }));
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByRole('button', { name: 'Add to board', exact: true }).click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByLabel('Shape frame', { exact: true }).selectOption('circle');
  await page.getByRole('button', { name: /Share/ }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const png = readFileSync((await (await pending).path())!);
  const pixels = await page.evaluate(
    async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      return {
        corner: [...ctx.getImageData(105, 165, 1, 1).data],
        center: [...ctx.getImageData(300, 360, 1, 1).data],
      };
    },
    `data:image/png;base64,${png.toString('base64')}`,
  );
  expect(pixels.corner.slice(0, 3)).toEqual([255, 250, 246]);
  expect(pixels.center.slice(0, 3)).toEqual([34, 51, 221]);
  await page.getByRole('button', { name: 'Close export', exact: true }).click();
  await page.getByLabel('Shape frame', { exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Split foreground/background', exact: true }).click();
  await expect(page.getByText('Board items (2)', { exact: true })).toBeVisible();
  const saved = await backup(page);
  expect(saved.items[0].asset.assetUrl).toBe(images.source);
  expect(saved.items[1].rendition).toBe(images.cut);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
