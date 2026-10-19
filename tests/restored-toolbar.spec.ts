import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';
test('original text toolbar keeps all formatting controls when sidebar opens', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => adapter.createTextPreset({ id: 'toolbar', label: 'Title', sample: 'My vision', fontFamily: 'georgia', fontSize: 48, color: '#33272b' }));
  const bar = page.getByRole('toolbar', { name: 'Selected object actions' });
  for (const name of ['Bold', 'Italic', 'Underline', 'Strikethrough']) await expect(bar.getByRole('button', { name, exact: true })).toBeVisible();
  await bar.getByRole('button', { name: 'Underline', exact: true }).click();
  await expect(bar.getByRole('button', { name: 'Underline', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const size = bar.getByLabel('Text size in points');
  await size.fill('72'); await size.press('Enter'); await expect(size).toHaveValue('72');
  await bar.getByRole('button', { name: 'Formatting', exact: true }).click();
  await expect(bar.getByRole('button', { name: 'Font family', exact: true })).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Strikethrough', exact: true })).toBeVisible();
  await page.screenshot({ path: '.godmode/screenshots/restored-toolbar.png' });
});
