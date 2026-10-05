import { expect, test } from '@playwright/test';

test('blank editor defers artwork and AI code until their tools need them', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', request => requested.push(request.url()));
  await page.goto('/');
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  expect(requested.some(url => /curatedSources-[^/]+\.js/.test(url))).toBe(false);
  expect(requested.some(url => /AIPanel-[^/]+\.js/.test(url))).toBe(false);
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Focused desk', exact: true })).toBeVisible();
  expect(requested.some(url => /curatedSources-[^/]+\.js/.test(url))).toBe(true);
  expect(requested.some(url => /AIPanel-[^/]+\.js/.test(url))).toBe(false);
});
