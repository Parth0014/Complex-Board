import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { BoardDocument } from '../src/vision/document';
import { createBoard as setupBoard } from './helpers/board';

async function createBoard(page: Page) {
  await setupBoard(page, { name: 'UI refactor check', topic: 'Health', layout: 'Square' });
}
async function addText(page: Page) {
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel__item').first().click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await expect(page.locator('.vs-lib')).toHaveClass(/is-collapsed/);
}

test('marquee previews partial overlaps before release and clears when dragged away', async ({
  page,
}) => {
  await createBoard(page);
  await addText(page);
  const document = await backup(page);
  const item = document.items[0];
  const viewport = page.getByLabel('Editable vision board', { exact: true });
  const canvas = (await viewport.locator('canvas').first().boundingBox())!;
  const scale = Number(await viewport.getAttribute('data-scale'));
  const left = canvas.x + Number(await viewport.getAttribute('data-page-left'));
  const top = canvas.y + Number(await viewport.getAttribute('data-page-top'));
  const start = { x: left + (item.x - 40) * scale, y: top + (item.y - 40) * scale };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(left + (item.x + 10) * scale, top + (item.y + 10) * scale);
  await expect(viewport).toHaveAttribute('data-selection-preview-count', '1');
  await expect(page.getByRole('toolbar', { name: 'Selected object actions' })).toHaveCount(0);
  await page.mouse.move(left + (item.x - 10) * scale, top + (item.y - 10) * scale);
  await expect(viewport).toHaveAttribute('data-selection-preview-count', '0');
  await page.mouse.move(left + (item.x + 10) * scale, top + (item.y + 10) * scale);
  await expect(viewport).toHaveAttribute('data-selection-preview-count', '1');
  await page.mouse.up();
  await expect(viewport).toHaveAttribute('data-selection-preview-count', '0');
  await expect(page.getByRole('toolbar', { name: 'Selected object actions' })).toBeVisible();
});
async function backup(page: Page): Promise<BoardDocument> {
  await page.getByLabel('File menu', { exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Download board file', exact: true }).click();
  const file = await (await download).path();
  const document = JSON.parse(readFileSync(file!, 'utf8')) as BoardDocument;
  await page.getByLabel('File menu', { exact: true }).click();
  return document;
}
async function openContext(page: Page) {
  await page.getByLabel('Editable vision board', { exact: true }).focus();
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menu', { name: 'Canvas actions', exact: true })).toBeVisible();
}

test('home setup selects artwork once, search works, and reload keeps the saved board open', async ({
  page,
}) => {
  await createBoard(page);
  await expect(page.getByLabel('Element theme', { exact: true })).toHaveValue('health');
  await page.getByLabel('Search elements', { exact: true }).fill('health');
  await expect(page.getByRole('heading', { name: 'Search results', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Love & Connection', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Clear element search', exact: true }).click();
  await expect(page.getByLabel('Search elements', { exact: true })).toHaveValue('');
  const document = await backup(page);
  expect([document.width, document.height]).toEqual([1080, 1080]);
  const url = page.url();
  await page.reload();
  await expect(page.getByLabel('Editable vision board', { exact: true })).toBeVisible();
  expect(page.url()).toBe(url);
  await expect(page.getByLabel('Element theme', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'UI refactor check', exact: true })).toBeVisible();
  await page.locator('.home-board').click();
  await expect(page.getByLabel('Element theme', { exact: true })).toHaveCount(0);
});

test('formatting and nested color popovers edit the board, dismiss, and persist', async ({
  page,
}) => {
  await createBoard(page);
  await addText(page);
  const toolbar = page.getByRole('toolbar', { name: 'Selected object actions', exact: true });
  const bold = toolbar.getByRole('button', { name: 'Bold', exact: true });
  await bold.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toHaveText('Bold selected text');
  await expect(bold).toHaveAttribute('aria-describedby', (await tooltip.getAttribute('id'))!);
  expect(await bold.getAttribute('title')).toBeNull();
  await bold.click();
  await expect(tooltip).toHaveCount(0);
  await expect(toolbar.getByRole('button', { name: 'Formatting', exact: true })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: /Layer|Arrange|Duplicate|Delete/ })).toHaveCount(
    0,
  );
  await toolbar.getByRole('button', { name: 'Formatting', exact: true }).click();
  const formatting = page.getByRole('complementary', { name: 'Object formatting', exact: true });
  await expect(formatting.getByLabel('Styled text', { exact: true })).toBeVisible();
  await formatting.getByLabel('Styled text', { exact: true }).fill('My healthy future');
  await formatting.getByRole('button', { name: 'Text color', exact: true }).first().click();
  const picker = page.getByRole('group', { name: 'Text color picker', exact: true });
  await picker.getByLabel('Text color hex', { exact: true }).fill('#5988b5');
  await expect(formatting).toBeVisible();
  await expect(picker).toBeVisible();
  const pickerZ = await picker.evaluate((node) => Number(getComputedStyle(node).zIndex));
  const formattingZ = await formatting.evaluate((node) => Number(getComputedStyle(node).zIndex));
  expect(pickerZ).toBeGreaterThan(formattingZ);
  await picker.getByRole('button', { name: 'Close color picker', exact: true }).click();
  await formatting.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await toolbar.getByRole('button', { name: 'Object opacity', exact: true }).click();
  const opacity = page.getByRole('group', { name: 'Opacity', exact: true });
  await opacity.getByRole('slider').fill('60');
  await page.keyboard.press('Escape');
  await expect(opacity).toHaveCount(0);
  const doc = await backup(page);
  expect(doc.items[0].text).toBe('My healthy future');
  expect(
    doc.items[0].appearance?.kind === 'text' && doc.items[0].appearance.fill.paint,
  ).toMatchObject({ kind: 'solid', color: '#5988b5' });
  expect(doc.items[0].appearance?.opacity).toBeCloseTo(0.6);
  await page.reload();
  await expect(page.getByLabel('Editable vision board', { exact: true })).toBeVisible();
  const saved = await backup(page);
  expect(saved.items[0].text).toBe('My healthy future');
  expect(
    saved.items[0].appearance?.kind === 'text' && saved.items[0].appearance.fill.paint,
  ).toMatchObject({ kind: 'solid', color: '#5988b5' });
});

test('right-click submenus open on hover, flip at the edge, and support keyboard navigation', async ({
  page,
}) => {
  await createBoard(page);
  await addText(page);
  await openContext(page);
  const root = page.getByRole('menu', { name: 'Canvas actions', exact: true });
  await root.getByRole('menuitem', { name: 'Layer', exact: true }).hover();
  await expect(page.getByRole('menu', { name: 'Layer', exact: true })).toBeVisible();
  await root.getByRole('menuitem', { name: 'Align to page', exact: true }).hover();
  const align = page.getByRole('menu', { name: 'Align to page', exact: true });
  await expect(align).toBeVisible();
  await expect(page.getByRole('menu', { name: 'Layer', exact: true })).toHaveCount(0);
  await align.getByRole('menuitem', { name: 'Right', exact: true }).click();
  await expect(root).toHaveCount(0);
  const doc = await backup(page);
  expect(doc.items[0].x + doc.items[0].width).toBeCloseTo(doc.width);
  await openContext(page);
  await root.getByRole('menuitem', { name: 'Layer', exact: true }).hover();
  const layer = page.getByRole('menu', { name: 'Layer', exact: true });
  await expect(layer).toBeVisible();
  const box = (await layer.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await root.getByRole('menuitem', { name: 'Layer', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(layer.getByRole('menuitem', { name: /^Bring forward/ })).toBeFocused();
  await page.keyboard.press('End');
  await expect(layer.getByRole('menuitem', { name: /^Send to back/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(layer).toHaveCount(0);
  await expect(root).toBeVisible();
  await expect(root.getByRole('menuitem', { name: 'Layer', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(root).toHaveCount(0);
});

test('export dialog traps focus and returns it to Share', async ({ page }) => {
  await createBoard(page);
  await addText(page);
  const share = page.getByRole('button', { name: 'Export', exact: true });
  await share.click();
  const dialog = page.getByRole('dialog', { name: 'Export board', exact: true });
  const close = dialog.getByRole('button', { name: 'Close export', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: /PDF/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(share).toBeFocused();
});

test('AI affirmation preview has a distinct result and inserts editable text', async ({ page }) => {
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  await page.route('**/api/ai/generate', (route) =>
    route.fulfill({ json: { text: 'I grow stronger with care.' } }),
  );
  await createBoard(page);
  await page.getByRole('button', { name: 'AI', exact: true }).click();
  await page.getByLabel('AI generation type', { exact: true }).selectOption('quote');
  await expect(page.getByLabel('AI prompt', { exact: true })).toHaveValue('');
  await page.getByLabel('AI prompt', { exact: true }).fill('An affirmation about health');
  await page.getByRole('button', { name: 'Generate', exact: true }).click();
  const result = page.getByRole('region', { name: 'AI result', exact: true });
  await expect(
    result.getByRole('heading', { name: 'Your affirmation', exact: true }),
  ).toBeVisible();
  await expect(result.getByText('Preview', { exact: true })).toBeVisible();
  await expect(result.locator('blockquote')).toHaveText('I grow stronger with care.');
  await result.getByRole('button', { name: 'Add to board', exact: true }).click();
  const doc = await backup(page);
  expect(doc.items[0].kind).toBe('text');
  expect(doc.items[0].text).toBe('I grow stronger with care.');
});

test('the contextual toolbar and popovers stay inside a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createBoard(page);
  await addText(page);
  const title = (await page.getByLabel('Board name', { exact: true }).boundingBox())!;
  const history = (await page.getByRole('group', { name: 'History', exact: true }).boundingBox())!;
  expect(title.x + title.width).toBeLessThanOrEqual(history.x);
  expect((await page.locator('.vs-rail').boundingBox())!.width).toBe(390);
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible();
  const toolbar = page.getByRole('toolbar', { name: 'Selected object actions', exact: true });
  const box = (await toolbar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await toolbar.getByRole('button', { name: 'Formatting', exact: true }).click();
  const popup = page.getByRole('dialog', { name: 'Object formatting', exact: true });
  await expect(popup.getByLabel('Styled text', { exact: true })).toBeVisible();
  const panel = (await popup.boundingBox())!;
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(390);
  expect(panel.y + panel.height).toBeLessThanOrEqual(844);
});
