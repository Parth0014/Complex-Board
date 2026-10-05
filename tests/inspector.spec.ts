import { test, expect } from '@playwright/test';

test('inspector closes, releases workspace space, and reopens', async ({ page }) => {
  await page.goto('/');
  const inspector = page.getByRole('complementary', { name: 'Object inspector' });
  const board = page.getByLabel('Editable vision board', { exact: true });
  const before = (await board.boundingBox())!.width;
  await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await expect(inspector).toBeHidden();
  await expect.poll(async () => (await board.boundingBox())!.width).toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Open editor panel', exact: true }).click();
  await expect(inspector).toBeVisible();
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await expect(inspector).toBeHidden();
});

test('top and right inspector tooltips stay inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 720 });
  await page.goto('/');
  for (const name of ['Style', 'Layers', 'Close editor panel']) {
    await page.getByRole('button', { name, exact: true }).hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    const box = (await tooltip.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(8);
    expect(box.y).toBeGreaterThanOrEqual(8);
    expect(box.x + box.width).toBeLessThanOrEqual(992);
    expect(box.y + box.height).toBeLessThanOrEqual(712);
    expect(await tooltip.evaluate((node) => node.parentElement === document.body)).toBe(true);
  }
});
