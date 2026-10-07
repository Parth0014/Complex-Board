import { type Page } from '@playwright/test';

export async function openProperties(page: Page) {
  const inspector = page.getByLabel('Object inspector', { exact: true });
  if (await inspector.isHidden()) {
    await page.getByLabel('Editable vision board', { exact: true }).focus();
    await page.keyboard.press('Shift+F10');
  } else {
    await inspector.getByRole('button', { name: 'Style', exact: true }).click();
  }
}

export async function openSection(page: Page, title: string) {
  const summary = page
    .getByLabel('Object inspector', { exact: true })
    .locator('summary')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first();
  const section = summary.locator('..');
  if ((await section.getAttribute('open')) === null) {
    await summary.click();
  }
}

export async function closeProperties(page: Page) {
  if (await page.getByLabel('Object inspector', { exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  }
}
