import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { BoardDocument } from '../src/vision/document';
import { VISION_TEMPLATES } from '../src/vision/templates';
import { fitTemplateLayout } from '../src/vision/layouts';

async function backup(page: Page): Promise<BoardDocument> {
  await page.getByText('File', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const result = JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
  await page.getByText('File', { exact: true }).click();
  return result;
}

test('compact editing and full properties switch without losing text changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  const compact = page.getByRole('toolbar', { name: 'Selection controls', exact: true });
  const inspector = page.getByLabel('Object inspector', { exact: true });
  await expect(compact).toBeVisible();
  await expect(inspector).toBeHidden();
  const initial = await backup(page);
  const inserted = initial.items.find(item => item.kind === 'text')!;
  expect(inserted.width).toBeLessThan(700);
  expect(inserted.x + inserted.width / 2).toBeCloseTo(initial.width / 2);
  expect(inserted.y + inserted.height / 2).toBeCloseTo(initial.height / 2);
  await compact.getByLabel('Text', { exact: true }).fill('Edited in compact controls');
  await page.getByRole('button', { name: 'Open properties', exact: true }).click();
  await expect(compact).toBeHidden();
  await expect(inspector).toBeVisible();
  await expect(page.getByLabel('Styled text', { exact: true })).toHaveValue('Edited in compact controls');
  await page.getByLabel('Styled text', { exact: true }).fill('Edited in full properties');
  await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await expect(inspector).toBeHidden();
  await expect(compact).toBeVisible();
  await expect(compact.getByLabel('Text', { exact: true })).toHaveValue('Edited in full properties');
  const document = await backup(page);
  const text = document.items.find(item => item.kind === 'text')!;
  expect(text.align).toBe('center');
  expect(text.textPadding).toBe(8);
});

test('switching templates then resizing does not leave overlapping stale holders', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  for (let i = 0; i < VISION_TEMPLATES.length; i++) {
    await page.getByRole('button', { name: 'Use this template', exact: true }).nth(i).click();
    await page.getByLabel('Board size', { exact: true }).selectOption(i % 2 ? '1080x1080' : '1080x1920');
    const document = await backup(page);
    const holders = document.items.filter(item => item.slotId && item.slotId !== 'template-heading');
    expect(holders).toHaveLength(VISION_TEMPLATES[i].layout.slots.length);
    expect(new Set(holders.map(item => item.slotId)).size).toBe(holders.length);
    expect(document.items).toHaveLength(holders.length + 1);
  }
});

test('template selected on landscape preserves holder proportions when changing canvas sizes', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Board size', { exact: true }).selectOption('1920x1080');
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('button', { name: 'Use this template', exact: true }).first().click();
  for (const size of ['1080x1080', '1080x1920', '1080x1080', '1920x1080']) {
    await page.getByLabel('Board size', { exact: true }).selectOption(size);
    const document = await backup(page);
    for (const slot of VISION_TEMPLATES[0].layout.slots) {
      const item = document.items.find(item => item.slotId === slot.id)!;
      const bounds = fitTemplateLayout(VISION_TEMPLATES[0].layout, document).get(slot.id)!;
      expect(item.x).toBeCloseTo(bounds.x);
      expect(item.y).toBeCloseTo(bounds.y);
      expect(item.width / item.height).toBeCloseTo(slot.width * 100 / (slot.height * 80));
      expect(item.width).toBeCloseTo(bounds.width);
      expect(item.height).toBeCloseTo(bounds.height);
    }
    expect(document.items.find(item => item.slotId === 'template-heading')?.templateId).toBe(VISION_TEMPLATES[0].id);
    await page.reload();
    await expect(page.getByText('Board items (5)', { exact: true })).toBeVisible();
  }
});

test('text box grows to fit multiline text after font and width changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  await page.getByRole('spinbutton', { name: 'Width', exact: true }).fill('240');
  await page.getByLabel('Styled text', { exact: true }).fill('First line\nSecond line\nThird line\nFourth line');
  await page.getByRole('spinbutton', { name: 'Text size', exact: true }).fill('48');
  await page.getByRole('spinbutton', { name: 'Text size', exact: true }).blur();
  const document = await backup(page);
  const text = document.items.find(item => item.kind === 'text')!;
  expect(text.height).toBeGreaterThanOrEqual(192);
  expect(text.width).toBe(240);
  expect(text.y + text.height).toBeLessThanOrEqual(document.height);
  await page.reload();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
});

test('templates create visible holders even when the board already contains text', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await page.locator('.text-panel button').first().click();
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.getByRole('button', { name: 'Use this template', exact: true }).first().click();
  const document = await backup(page);
  const slots = document.items.filter(item => item.slotId && item.slotId !== 'template-heading');
  expect(slots).toHaveLength(4);
  expect(slots.every(item => item.kind === 'shape' && item.width > 0 && item.height > 0 && item.opacity === 1)).toBe(true);
  expect(document.items.filter(item => item.kind === 'text')).toHaveLength(2);
  await page.reload();
  await expect(page.getByText('Board items (6)', { exact: true })).toBeVisible();
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
    const item = document.items.find(item => item.shape === shape)!;
    expect(item.x).toBeGreaterThan(450);
    expect(item.y).toBeGreaterThan(550);
    expect(item.width).toBe(240);
    expect(item.height).toBe(30);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
  }
});

test('quick shapes start centered with sensible dimensions and persist after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  for (const shape of ['rectangle', 'circle', 'triangle', 'star', 'heart', 'cloud', 'blob', 'burst', 'line', 'arrow']) {
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
  const circle = document.items.find(item => item.shape === 'circle')!;
  expect(circle.width).toBe(circle.height);
  await page.reload();
  await expect(page.getByText('Board items (10)', { exact: true })).toBeVisible();
});
