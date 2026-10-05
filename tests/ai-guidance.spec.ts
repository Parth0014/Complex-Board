import { test, expect } from '@playwright/test';
test('AI gives mode guidance, checks selection and offers connection recovery', async ({
  page,
}) => {
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
  await expect(page.getByText('AI is ready.', { exact: false })).toBeVisible();
  await page.getByLabel('AI generation type').selectOption('edit');
  await expect(page.getByText('Select one unlocked image', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeDisabled();
  for (const mode of ['image', 'quote', 'board', 'search']) {
    await page.getByLabel('AI generation type').selectOption(mode);
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeEnabled();
    await expect(page.getByLabel('AI prompt')).not.toHaveValue('');
  }
  await page.route('**/api/ai/status', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(
    page.getByText('The AI server returned an unreadable response.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeDisabled();
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  await page.getByRole('button', { name: 'Check connection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeEnabled();
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
  await expect(page.getByRole('button', { name: 'Remove bg', exact: true })).toBeDisabled();
  await expect(page.getByText('Background removal needs rembg.', { exact: false })).toBeAttached();
  expect(requests).toBe(0);
});
