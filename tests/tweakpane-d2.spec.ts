import { test, expect, type Page } from '@playwright/test';
import { createAppearanceBoard, runtime, frames } from './appearance-helpers';

test.use({
  baseURL: process.env.TWEAKPANE_D2_URL || 'http://127.0.0.1:4182',
  viewport: { width: 1440, height: 1000 },
});
test.skip(!process.env.TWEAKPANE_D2_URL, 'Run against VITE_TWEAKPANE_D2=1.');

async function open(page: Page, id = 'solid') {
  await createAppearanceBoard(page);
  const close = page.getByRole('button', { name: 'Close panel', exact: true });
  if (await close.isVisible()) await close.click();
  const h = await runtime(page);
  await h.evaluate(({ adapter }) => adapter.select(['solid']));
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  if (id !== 'solid') await h.evaluate(({ adapter }, id) => adapter.select([id]), id);
  await expect(page.getByRole('complementary', { name: 'Appearance inspector' })).toBeVisible();
  return h;
}
async function number(page: Page, label: string, value: number) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(String(value));
  await input.press('Enter');
  await input.blur();
}
async function color(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press('Enter');
  await input.blur();
}

test('closed and open shapes share a bounded inspector and canonical bindings', async ({
  page,
}) => {
  const h = await open(page);
  await expect(page.getByRole('dialog', { name: 'Object formatting' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Radial', exact: true }).click();
  await color(page, 'Second color', '#cc6688');
  await page.getByRole('tab', { name: 'Border', exact: true }).click();
  await number(page, 'Border width', 11.5);
  expect(
    await h.evaluate(
      ({ adapter }) =>
        adapter.history.document.items.find((i) => i.id === 'solid')!.appearance?.stroke.width,
    ),
  ).toBe(11.5);
  await h.evaluate(({ adapter }) => adapter.select(['line']));
  await expect(page.getByRole('group', { name: 'Fill type', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Stroke color', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Stroke', exact: true }).click();
  await number(page, 'Stroke width', 6);
  await page.getByLabel('Stroke cap', { exact: true }).selectOption({ label: 'Round' });
  expect(
    await h.evaluate(
      ({ adapter }) =>
        adapter.history.document.items.find((i) => i.id === 'line')!.appearance?.stroke.cap,
    ),
  ).toBe('round');
  await expect(page.getByRole('tab', { name: 'Effects', exact: true })).toHaveCount(0);
  await frames(page);
});
