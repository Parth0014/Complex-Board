import { expect, test } from '@playwright/test';

test('AI stays hidden when the backend is unavailable or unconfigured', async ({ page }) => {
  for (const configured of [false, null]) {
    await page.route('**/api/ai/status', (route) =>
      configured === null
        ? route.fulfill({ status: 404, body: 'Not found' })
        : route.fulfill({ json: { configured } }),
    );
    const response = page.waitForResponse('**/api/ai/status');
    await page.goto('/');
    await response;
    await expect(page.getByText('Saved', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'AI', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Uploads', exact: true })).toBeVisible();
    await page.unroute('**/api/ai/status');
  }
});

test('blank editor defers artwork and AI code until their tools need them', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.goto('/');
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  expect(requested.some((url) => /curatedSources-[^/]+\.js/.test(url))).toBe(false);
  expect(requested.some((url) => /AIPanel-[^/]+\.js/.test(url))).toBe(false);
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Focused desk', exact: true })).toBeVisible();
  expect(requested.some((url) => /curatedSources-[^/]+\.js/.test(url))).toBe(true);
  expect(requested.some((url) => /AIPanel-[^/]+\.js/.test(url))).toBe(false);
});
