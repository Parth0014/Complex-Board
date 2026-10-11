import { test, expect } from '@playwright/test';
import { createAppearanceBoard, frames, runtime, boardScreenBounds } from './appearance-helpers';

test.use({ baseURL: process.env.VISBO_TEST_URL || 'http://127.0.0.1:4173' });

test('Fit is repeatable and restores the same center after zooming or scrolling', async ({
  page,
}) => {
  await createAppearanceBoard(page);
  const fit = page.getByRole('button', { name: 'Fit board to view', exact: true });
  await fit.click();
  await frames(page);
  const centered = await boardScreenBounds(page, 1600, 1400);
  for (let click = 0; click < 3; click++) {
    await fit.click();
    await frames(page);
    expect(await boardScreenBounds(page, 1600, 1400)).toEqual(centered);
  }
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await fit.click();
  await frames(page);
  expect(await boardScreenBounds(page, 1600, 1400)).toEqual(centered);
  const canvas = page.getByLabel('Editable vision board', { exact: true });
  await canvas.evaluate((node) => node.scrollTo({ top: 0, left: 0 }));
  await frames(page);
  expect(await boardScreenBounds(page, 1600, 1400)).not.toEqual(centered);
  await fit.click();
  await frames(page);
  expect(await boardScreenBounds(page, 1600, 1400)).toEqual(centered);
  const h = await runtime(page);
  expect(await h.evaluate(({ adapter }) => adapter.history.document.version)).toBe(3);
});
