import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { BoardDocument } from '../src/vision/document';
import { openProperties } from './helpers/editor';

async function backup(page: Page): Promise<BoardDocument> {
  await page.getByText('File', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const result = JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
  await page.getByText('File', { exact: true }).click();
  return result;
}

test('Elements contains no media library', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await expect(page.getByText('No elements', { exact: true })).toBeVisible();
  await expect(page.locator('.v1-asset-grid button')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Category', exact: true })).toHaveCount(0);
});

test('text sticker outline renders and persists in backup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  const initial = await backup(page);
  const item = initial.items.find((entry) => entry.kind === 'text')!;
  const canvas = page.locator('.v1-artboard canvas').last();
  const before = await canvas.screenshot();
  const point = await page.locator('.v1-artboard').evaluate((node, item) => {
    const rect = node.querySelector('canvas')!.getBoundingClientRect();
    const host = node as HTMLElement;
    const scale = Number(host.dataset.scale);
    return {
      x: rect.left + Number(host.dataset.pageLeft) + (item.x + item.width / 2) * scale,
      y: rect.top + Number(host.dataset.pageTop) + (item.y + item.height / 2) * scale,
    };
  }, item);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.locator('.vs-sec summary').filter({ hasText: 'Appearance' }).hover();
  await page.getByRole('checkbox', { name: 'Sticker outline', exact: true }).check();
  await page.getByRole('spinbutton', { name: 'Outline thickness', exact: true }).fill('12');
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Outline color', exact: true }).click();
  await page.getByRole('textbox', { name: 'Outline color hex', exact: true }).fill('#ff0000');
  await page.getByRole('button', { name: 'Close color picker', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Border width', exact: true }).fill('3');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  const saved = await backup(page);
  expect(saved.items.find((entry) => entry.id === item.id)?.stickerWidth).toBe(12);
  expect(saved.items.find((entry) => entry.id === item.id)?.stickerColor).toBe('#ff0000');
  expect(saved.items.find((entry) => entry.id === item.id)?.borderWidth).toBe(3);
  await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
  await page.reload();
  expect((await backup(page)).items.find((entry) => entry.id === item.id)?.stickerWidth).toBe(12);
});

test('compact editing and full properties switch without losing text changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  const compact = page.getByRole('toolbar', { name: 'Selection controls', exact: true });
  const inspector = page.getByLabel('Object inspector', { exact: true });
  await expect(compact).toBeVisible();
  await expect(inspector).toBeHidden();
  const initial = await backup(page);
  const inserted = initial.items.find((item) => item.kind === 'text')!;
  expect(inserted.width).toBeLessThan(700);
  expect(inserted.x + inserted.width / 2).toBeCloseTo(initial.width / 2);
  expect(inserted.y + inserted.height / 2).toBeCloseTo(initial.height / 2);
  await expect(compact.getByLabel('Text', { exact: true })).toHaveCount(0);
  const point = await page.locator('.v1-artboard').evaluate((node, item) => {
    const canvas = node.querySelector('canvas')!.getBoundingClientRect();
    const host = node as HTMLElement;
    const scale = Number(host.dataset.scale);
    return {
      x: canvas.left + Number(host.dataset.pageLeft) + (item.x + item.width / 2) * scale,
      y: canvas.top + Number(host.dataset.pageTop) + (item.y + item.height / 2) * scale,
    };
  }, inserted);
  await page.mouse.dblclick(point.x, point.y);
  const editor = page.getByRole('textbox', { name: 'Edit text on canvas' });
  await expect(editor).toBeFocused();
  await editor.fill('Edited on canvas');
  await editor.press('Control+Enter');
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open properties', exact: true })).toHaveCount(0);
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await expect(page.getByRole('menu', { name: 'Canvas context menu' })).toBeVisible();
  await expect(compact).toBeHidden();
  await expect(inspector).toBeVisible();
  const menu = page.getByRole('menu', { name: 'Canvas context menu' });
  await expect(menu.getByRole('toolbar', { name: 'Quick styles' })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Apply Soft violet style' })).toBeVisible();
  await expect(menu.getByText('Position & size', { exact: true })).toHaveCount(0);
  await expect(menu.getByText('Transform & style', { exact: true })).toHaveCount(0);
  const textRow = inspector
    .locator('summary')
    .filter({ has: page.getByText('Text', { exact: true }) })
    .first();
  const rowBounds = await textRow.boundingBox();
  const copyBounds = await menu.getByRole('menuitem', { name: /Copy/ }).boundingBox();
  expect(rowBounds!.y).toBeLessThan(copyBounds!.y);
  await textRow.hover();
  const flyout = menu.getByRole('group', { name: 'Text settings', exact: true });
  await expect(flyout).toBeVisible();
  const panelBounds = await flyout.boundingBox();
  const menuBounds = await menu.boundingBox();
  expect(
    panelBounds!.x + panelBounds!.width <= menuBounds!.x ||
      panelBounds!.x >= menuBounds!.x + menuBounds!.width,
  ).toBeTruthy();
  const advanced = flyout.locator('summary').filter({ hasText: 'Advanced text' });
  await advanced.hover();
  await expect(flyout).toBeVisible();
  await advanced.click();
  await expect(flyout).toBeVisible();
  await flyout.getByRole('button', { name: 'Text color', exact: true }).click();
  const picker = page.getByRole('group', { name: 'Text color picker', exact: true });
  await expect(picker).toBeVisible();
  await picker.getByLabel('Text color hex', { exact: true }).fill('#5988b5');
  await picker.getByRole('button', { name: 'Close color picker' }).click();
  await expect(picker).toHaveCount(0);
  await expect(flyout).toBeVisible();
  await expect(page.getByLabel('Styled text', { exact: true })).toHaveValue('Edited on canvas');
  await page.getByLabel('Styled text', { exact: true }).fill('Edited in full properties');
  await inspector.locator('summary').filter({ hasText: 'Appearance' }).first().hover();
  const appearance = menu.getByRole('group', { name: 'Appearance settings', exact: true });
  await appearance.getByLabel('Opacity (%)', { exact: true }).fill('45');
  await menu.getByRole('menuitem', { name: 'Layer', exact: true }).hover();
  const layerMenu = menu.getByRole('menu', { name: 'Layer actions' });
  await expect(layerMenu).toBeVisible();
  await expect(flyout).toHaveCount(0);
  await layerMenu.getByRole('menuitem', { name: /Bring to front/ }).click();
  await page.mouse.move(5, 5);
  await expect(layerMenu).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(inspector).toBeHidden();
  await expect(compact).toBeVisible();
  await expect(compact.locator('input[aria-label="Opacity"]')).toHaveValue('45');
  await page.mouse.dblclick(point.x, point.y);
  await expect(editor).toHaveValue('Edited in full properties');
  await editor.fill('Canceled edit');
  await editor.press('Escape');
  const document = await backup(page);
  const text = document.items.find((item) => item.kind === 'text')!;
  expect(text.text).toBe('Edited in full properties');
  expect(text.align).toBe('center');
  expect(text.textPadding).toBe(8);
});

test('switching templates then resizing does not leave overlapping stale holders', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  const cards = page.locator('.templates-panel__card');
  const count = await cards.count();
  let previousIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const title = await cards.nth(i).getByRole('heading').textContent();
    await page.getByRole('button', { name: 'Use template', exact: true }).nth(i).click();
    await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(title!);
    await page
      .getByLabel('Board size', { exact: true })
      .selectOption(i % 2 ? '1080x1080' : '1080x1920');
    const document = await backup(page);
    expect(document.items.length).toBeGreaterThan(15);
    expect(new Set(document.items.map((item) => item.templateId)).size).toBe(1);
    expect(document.items.filter((item) => item.slotId === 'template-heading')).toHaveLength(1);
    expect(new Set(document.items.map((item) => item.slotId)).size).toBe(document.items.length);
    expect(document.items.some((item) => previousIds.includes(item.id))).toBe(false);
    previousIds = document.items.map((item) => item.id);
  }
});

test('template selected on landscape preserves photo proportions and layer identities when changing canvas sizes', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Board size', { exact: true }).selectOption('1920x1080');
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('button', { name: 'Use template', exact: true }).first().click();
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue('The adventure atlas');
  const original = await backup(page);
  for (const size of ['1080x1080', '1080x1920', '1080x1080', '1920x1080']) {
    await page.getByLabel('Board size', { exact: true }).selectOption(size);
    const document = await backup(page);
    expect(document.items.map((item) => item.id)).toEqual(original.items.map((item) => item.id));
    for (const photo of original.items.filter((item) => item.kind === 'asset')) {
      const item = document.items.find((item) => item.id === photo.id)!;
      expect(item.width / item.height).toBeCloseTo(photo.width / photo.height);
    }
    expect(document.items.find((item) => item.slotId === 'template-heading')?.templateId).toBe(
      original.items.find((item) => item.slotId === 'template-heading')?.templateId,
    );
    await page.reload();
    await expect(
      page.getByText(`Board items (${original.items.length})`, { exact: true }),
    ).toBeVisible();
  }
});

test('text box grows to fit multiline text after font and width changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  await openProperties(page);
  await page.getByRole('spinbutton', { name: 'Width', exact: true }).fill('240');
  await page
    .getByLabel('Styled text', { exact: true })
    .fill('First line\nSecond line\nThird line\nFourth line');
  await page.getByRole('spinbutton', { name: 'Font size', exact: true }).fill('48');
  await page.getByRole('spinbutton', { name: 'Font size', exact: true }).blur();
  const document = await backup(page);
  const text = document.items.find((item) => item.kind === 'text')!;
  expect(text.height).toBeGreaterThanOrEqual(192);
  expect(text.width).toBe(240);
  expect(text.y + text.height).toBeLessThanOrEqual(document.height);
  await page.reload();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
});

test('collage templates preserve existing user text while replacing template layers', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  const original = await backup(page);
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('button', { name: 'Use template', exact: true }).first().click();
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue('The adventure atlas');
  const document = await backup(page);
  const slots = document.items.filter((item) => item.slotId && item.slotId !== 'template-heading');
  expect(slots.length).toBeGreaterThan(15);
  expect(slots.every((item) => item.width > 0 && item.height > 0 && item.opacity > 0)).toBe(true);
  expect(document.items.find((item) => item.id === original.items[0].id)).toEqual(
    original.items[0],
  );
  await page.reload();
  await expect(
    page.getByText(`Board items (${document.items.length})`, { exact: true }),
  ).toBeVisible();
});

test('quick lines and arrows can be reselected and dragged from their bounds', async ({ page }) => {
  await page.goto('/');
  const point = async (x: number, y: number) => {
    const viewport = page.getByLabel('Editable vision board', { exact: true });
    const box = (await viewport.locator('canvas').first().boundingBox())!;
    const scale = Number(await viewport.getAttribute('data-scale'));
    return {
      x: box.x + Number(await viewport.getAttribute('data-page-left')) + x * scale,
      y: box.y + Number(await viewport.getAttribute('data-page-top')) + y * scale,
    };
  };
  for (const shape of ['line', 'arrow']) {
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByRole('button', { name: shape, exact: true }).click();
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const start = await point(500, 536); // Inside the box, above the thin stroke.
    await page.mouse.click(start.x, start.y);
    await expect(page.getByRole('toolbar', { name: 'Selection controls' })).toBeVisible();
    await page.waitForTimeout(300);
    const dragStart = await point(500, 536);
    const end = await point(580, 610);
    await page.mouse.move(dragStart.x, dragStart.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 10 });
    await page.mouse.up();
    const document = await backup(page);
    const item = document.items.find((item) => item.shape === shape)!;
    expect(item.x).toBeGreaterThan(450);
    expect(item.y).toBeGreaterThan(550);
    expect(item.width).toBe(240);
    expect(item.height).toBe(30);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
  }
});

test('quick shapes start centered with sensible dimensions and persist after reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  for (const shape of [
    'rectangle',
    'circle',
    'triangle',
    'star',
    'heart',
    'cloud',
    'blob',
    'burst',
    'line',
    'arrow',
  ]) {
    await page.getByRole('button', { name: shape, exact: true }).click();
  }
  const document = await backup(page);
  expect(document.items).toHaveLength(10);
  for (const item of document.items) {
    expect(item.x + item.width / 2).toBeCloseTo(document.width / 2);
    expect(item.y + item.height / 2).toBeCloseTo(document.height / 2);
    expect(item.width).toBeGreaterThan(0);
    expect(item.height).toBeGreaterThan(0);
  }
  const circle = document.items.find((item) => item.shape === 'circle')!;
  expect(circle.width).toBe(circle.height);
  await page.reload();
  await expect(page.getByText('Board items (10)', { exact: true })).toBeVisible();
});

test('blank canvas opens the app context menu with disabled object actions', async ({ page }) => {
  await page.goto('/');
  await page
    .getByLabel('Editable vision board', { exact: true })
    .click({ button: 'right', position: { x: 100, y: 100 } });
  const menu = page.getByRole('menu', { name: 'Canvas context menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Duplicate', exact: true })).toHaveCount(0);
  await expect(menu.getByRole('menuitem', { name: /Add page/ })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: /Paste/ })).toBeEnabled();
  const menuBounds = await menu.boundingBox();
  const dockBounds = await page.locator('.vs-bottom-dock').boundingBox();
  expect(menuBounds!.height).toBeLessThan(240);
  expect(menuBounds!.y + menuBounds!.height).toBeLessThanOrEqual(dockBounds!.y - 10);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
});
