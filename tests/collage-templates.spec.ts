import { test, expect } from '@playwright/test';

const titles = [
  'The adventure atlas',
  'A letter to my future',
  'Little things, full heart',
  'Love, in all its forms',
  'Freedom by design',
];
test('five photo collage templates apply, resize and survive reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  for (const title of titles) {
    const card = page
      .locator('.templates-panel__card')
      .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    expect(await card.locator('svg image').count()).toBeGreaterThanOrEqual(3);
    await card.getByRole('button', { name: 'Use this template' }).click();
    await page.waitForTimeout(300);
    const templateError = await page.locator('.templates-panel [role="alert"]').allTextContents();
    expect(templateError).toEqual([]);
    await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(title);
    const count = Number(
      (await page.getByText(/Board items \(\d+\)/).textContent())!.match(/\d+/)![0],
    );
    expect(count).toBeGreaterThan(15);
    expect(count).toBeLessThan(50);
    await expect(page.locator('.vs-save[role="status"]')).toHaveText('Saved');
    await page
      .getByLabel('Editable vision board', { exact: true })
      .screenshot({ path: `test-results/collage-${titles.indexOf(title)}.png` });
    await page.getByLabel('Board size', { exact: true }).selectOption('1920x1080');
    await page.getByLabel('Board size', { exact: true }).selectOption('1080x1080');
  }
  await expect(page.locator('.vs-save[role="status"]')).toHaveText('Saved');
  await page.reload();
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue('Freedom by design');
  await expect(page.locator('.vs-save[role="status"]')).toHaveText('Saved');
  expect(errors).toEqual([]);
});

test('uploaded photos replace starter images without changing layout or disappearing on template switch', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  const template = (title: string) =>
    page
      .locator('.templates-panel__card')
      .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await template(titles[0]).getByRole('button', { name: 'Use this template' }).click();
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(titles[0]);
  const board = page.getByLabel('Editable vision board', { exact: true });
  const point = await board.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const scale = Number(node.getAttribute('data-scale'));
    return {
      x: rect.left + Number(node.getAttribute('data-page-left')) + 220 * scale,
      y: rect.top + Number(node.getAttribute('data-page-top')) + 330 * scale,
    };
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.getByRole('toolbar', { name: 'Selection controls' })).toBeVisible();
  const before = await page.getByText(/Board items \(\d+\)/).textContent();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Replace image', exact: true }).click();
  await (await chooser).setFiles('public/template-photos/flowers.jpg');
  await expect(page.getByRole('button', { name: 'Replace image', exact: true })).toBeEnabled();
  await expect(page.getByText(before!, { exact: true })).toBeVisible();
  await template(titles[4]).getByRole('button', { name: 'Use this template' }).click();
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(titles[4]);
  await page.getByText('File', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const backup = await pending;
  const { readFileSync } = await import('node:fs');
  const saved = JSON.parse(readFileSync((await backup.path())!, 'utf8'));
  expect(
    saved.items.some((item: { asset?: { provider: string } }) => item.asset?.provider === 'upload'),
  ).toBe(true);
});
