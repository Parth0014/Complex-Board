import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('reference preview preserves text, creates placeholders, persists and undoes', async ({
  page,
}) => {
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  await page.route('**/api/ai/reference', (route) => {
    const input = route.request().postDataJSON();
    expect(input.image).toMatch(/^data:image\/jpeg;base64,/);
    return route.fulfill({
      json: {
        width: 1000,
        height: 1000,
        background: '#faf0e6',
        elements: [
          {
            type: 'photo',
            x: 0.1,
            y: 0.25,
            width: 0.6,
            height: 0.5,
            rotation: 0,
            color: '#ffffff',
          },
          {
            type: 'text',
            x: 0.1,
            y: 0.05,
            width: 0.8,
            height: 0.1,
            rotation: 0,
            color: '#111111',
            text: 'MY DREAM LIFE',
            fontSize: 0.04,
            fontFamily: 'georgia',
          },
        ],
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page
    .getByLabel('Upload design reference')
    .setInputFiles('public/template-photos/flowers.jpg');
  await page.getByRole('button', { name: 'Analyze reference', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Editable template preview' })).toBeVisible();
  await page.getByLabel('Detected text 2').fill('MY DREAM LIFE\n2026');
  await page.getByRole('button', { name: 'Use this template', exact: true }).click();
  await expect(page.getByText('Board items (2)', { exact: true })).toBeVisible();
  await page.getByText('File', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const saved = JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
  expect(saved.items[0].asset.provider).toBe('template-photo');
  expect(saved.items[0].asset.assetUrl).toMatch(/^data:image\/svg\+xml,/);
  expect(saved.items[1].text).toBe('MY DREAM LIFE\n2026');
  expect(JSON.stringify(saved)).not.toContain('data:image/jpeg;base64');
  await page.getByText('File', { exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Board items (0)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(page.locator('.vs-save[role="status"]')).toHaveText('Saved');
  await page.reload();
  await expect(page.getByText('Board items (2)', { exact: true })).toBeVisible();
});
