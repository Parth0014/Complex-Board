import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const templates = JSON.parse(readFileSync('src/vision/complexTemplates.json', 'utf8')) as Array<{
  title: string;
  id: string;
  canvas: { height: number };
  elements: Array<{ kind: string }>;
}>;

test('complex templates apply all layers and survive resizing and reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  for (const template of templates) {
    const card = page
      .locator('.templates-panel__card')
      .filter({ has: page.getByRole('heading', { name: template.title, exact: true }) });
    await expect(card.locator('svg image')).toHaveCount(
      template.elements.filter((e) => e.kind === 'asset').length,
    );
    if (template.canvas.height === 1700)
      await expect(card.locator('svg').first()).toHaveAttribute('viewBox', '0 0 1000 1700');
    await card.getByRole('button', { name: 'Use template' }).click();
    await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(template.title);
    await expect(
      page.getByText(`Board items (${template.elements.length})`, { exact: true }),
    ).toBeVisible();
    await page.getByLabel('Board size', { exact: true }).selectOption('1920x1080');
    await page.getByLabel('Board size', { exact: true }).selectOption('1080x1080');
    await expect(page.locator('.vs-save[role="status"]')).toHaveText('Saved');
    await page
      .getByLabel('Editable vision board', { exact: true })
      .screenshot({ path: `test-results/${template.id}.png` });
  }
  await page.reload();
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(templates[2].title);
  await expect(
    page.getByText(`Board items (${templates[2].elements.length})`, { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
