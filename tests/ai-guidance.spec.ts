import { test, expect } from '@playwright/test';
import { openSection } from './helpers/editor';

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
  for (const mode of ['image', 'quote']) {
    await page.getByLabel('AI generation type').selectOption(mode);
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeDisabled();
    await expect(page.getByLabel('AI prompt')).toHaveValue('');
    await expect(page.getByLabel('AI prompt')).toHaveAttribute('placeholder', /.+/);
  }
  await page.getByLabel('AI generation type').selectOption('quote');
  await page.getByLabel('AI prompt').fill('An affirmation about growing confidence');
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
