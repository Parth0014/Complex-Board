import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openSection } from './helpers/editor';

test('AI board generates original images and applies the preview as one editable composition', async ({
  page,
}) => {
  const image =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const requests: string[] = [];
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  await page.route('**/api/ai/generate', (route) => {
    const input = route.request().postDataJSON();
    requests.push(input.mode);
    return route.fulfill({
      json:
        input.mode === 'board'
          ? {
              title: 'My next chapter',
              goals: ['Explore Kyoto', 'Grow my career'],
              imagePrompts: ['Kyoto morning photography', 'Creative studio photography'],
              palette: { background: '#f0efe0', text: '#333333', card: '#ffffff' },
            }
          : { image },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByLabel('AI generation type').selectOption('board');
  await page.getByLabel('Board layout style').selectOption('gallery');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.locator('.ai-board-preview img')).toHaveCount(2);
  expect(requests).toEqual(['board', 'image', 'image']);
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use this board', exact: true }).click();
  await page.getByRole('button', { name: 'Replace composition', exact: true }).click();
  await expect(page.getByText('Board items (12)', { exact: true })).toBeVisible();
  await page.getByText('File', { exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const document = JSON.parse(readFileSync((await (await download).path())!, 'utf8'));
  expect(document.color).toBe('#f0efe0');
  expect(
    document.items.filter(
      (item: { asset?: { provider: string } }) => item.asset?.provider === 'generated',
    ),
  ).toHaveLength(2);
  for (const item of document.items.filter((item: { kind: string }) => item.kind === 'asset')) {
    expect(item.asset.assetUrl).toBe(image);
    expect(item.asset.previewUrl).toBe(image);
  }
  await page.getByText('File', { exact: true }).click();
  await page.reload();
  await expect(page.getByText('Board items (12)', { exact: true })).toBeVisible();
});

test('failed AI board images never replace the existing canvas', async ({ page }) => {
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  await page.route('**/api/ai/generate', (route) =>
    route.fulfill({
      status: route.request().postDataJSON().mode === 'board' ? 200 : 429,
      json:
        route.request().postDataJSON().mode === 'board'
          ? { title: 'Dream', goals: ['Explore'], imagePrompts: ['Mountain photography'] }
          : { error: 'Generation quota reached. Try again later.' },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByLabel('AI generation type').selectOption('board');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Generation quota reached');
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use this board', exact: true })).toHaveCount(0);
});
test('AI gives current mode guidance and recovers after a generation failure', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/api/ai/status', (route) =>
    route.fulfill({
      json: { configured: true, backgroundConfigured: false, upscaleConfigured: false },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  for (const mode of ['image', 'quote', 'board']) {
    await page.getByLabel('AI generation type').selectOption(mode);
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeEnabled();
    await expect(page.getByLabel('AI prompt')).not.toHaveValue('');
  }
  await page.getByLabel('AI generation type').selectOption('quote');
  await page.route('**/api/ai/generate', (route) =>
    route.fulfill({ status: 503, json: { error: 'Temporarily unavailable' } }),
  );
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Temporarily unavailable');
  await page.route('**/api/ai/generate', (route) =>
    route.fulfill({ json: { text: 'Keep growing' } }),
  );
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await expect(page.getByText('Keep growing', { exact: true })).toBeVisible();
  expect(errors.filter((error) => /Maximum update depth/.test(error))).toEqual([]);
});
test('unconfigured cutout tool explains setup without sending doomed requests', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/api/ai/status', (route) =>
    route.fulfill({ json: { configured: true, backgroundConfigured: false } }),
  );
  await page.route('**/api/ai/remove-background', (route) => {
    requests++;
    return route.fulfill({ status: 503, json: { error: 'Offline' } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.locator('.v1-asset-grid button').first().click();
  await page.getByRole('button', { name: 'Open properties', exact: true }).click();
  await openSection(page, 'AI tools');
  await expect(page.getByRole('button', { name: 'Remove bg', exact: true })).toBeDisabled();
  await expect(page.getByText('Background removal needs rembg.', { exact: false })).toBeAttached();
  expect(requests).toBe(0);
});
