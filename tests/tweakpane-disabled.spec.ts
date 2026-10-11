import { test, expect } from '@playwright/test';
import { createAppearanceBoard, runtime } from './appearance-helpers';

test('D1 disabled retains the original Quick Shape controls and canonical v3 data', async ({
  page,
}) => {
  const fetched: string[] = [];
  page.on('request', (request) => fetched.push(request.url()));
  await createAppearanceBoard(page);
  const h = await runtime(page);
  await h.evaluate(({ adapter }) => adapter.select(['solid']));
  await expect(page.getByRole('button', { name: 'Shape solid fill', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Object opacity', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Object formatting', exact: true })).toBeVisible();
  await expect(page.locator('.gs-tweakpane')).toHaveCount(0);
  await expect(page.getByLabel('Border width', { exact: true })).toHaveValue('8');
  expect(await h.evaluate(({ adapter }) => adapter.history.document.version)).toBe(3);
  expect(fetched.filter((url) => /\/tweakpane-[^/]+\.js/.test(url))).toEqual([]);
});
