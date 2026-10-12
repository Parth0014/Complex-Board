import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { createBoard } from './helpers/board';
import { runtime, frames } from './appearance-helpers';

const directory = `exports/craft/${process.env.CRAFT_PHASE || 'desktop-after'}`;
mkdirSync(directory, { recursive: true });

async function insert(page: Page, kind: 'shape' | 'text' | 'image') {
  const handle = await runtime(page);
  await handle.evaluate(async ({ adapter }, kind) => {
    adapter.select([]);
    if (kind === 'shape') adapter.createShape('rectangle');
    if (kind === 'text')
      adapter.createTextPreset({
        id: 'craft',
        label: 'Craft',
        sample: 'Make room for what matters.',
        fontFamily: 'georgia',
        fontSize: 64,
        color: '#33272b',
      });
    if (kind === 'image') {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 200;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#83d3bb';
      context.fillRect(0, 0, 320, 200);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!)));
      await adapter.uploadPhotos([new File([blob], 'craft-photo.png', { type: 'image/png' })]);
    }
    adapter.select([adapter.history.document.items.at(-1)!.id]);
  }, kind);
  await expect(page.getByRole('toolbar', { name: 'Selected object actions' })).toBeVisible();
}

async function openInspector(page: Page) {
  const dock = page.locator('.gs-object-dock');
  if (!(await dock.isVisible())) {
    await page
      .getByRole('toolbar', { name: 'Selected object actions' })
      .getByRole('button', { name: /Formatting|Image effects|Appearance/ })
      .first()
      .click();
  }
  await expect(dock).toBeVisible();
  await frames(page);
  return dock;
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: `${directory}/${name}.png`, animations: 'disabled' });
}

test('desktop walkthrough: home, empty canvas, shape, text, photo, menus and palette', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '+ New board', exact: true })).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  await capture(page, 'home-1366x768');
  await page.getByRole('button', { name: '+ New board', exact: true }).click();
  await capture(page, 'setup-1366x768');
  await createBoard(page);
  await capture(page, 'editor-empty-1366x768');
  for (const kind of ['shape', 'text', 'image'] as const) {
    await insert(page, kind);
    await openInspector(page);
    await capture(page, `editor-${kind}-inspector-1366x768`);
  }
  await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByLabel('File menu', { exact: true }).click();
  await capture(page, 'editor-file-1366x768');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Background', exact: true }).click();
  await page.locator('.background-color-grid .gs-swatch').nth(9).click();
  await capture(page, 'editor-background-1366x768');
});

for (const width of [1366, 1920]) {
  test(`desktop inspectors remain beside the canvas with useful zoom at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 768 });
    await createBoard(page);
    for (const kind of ['shape', 'text', 'image'] as const) {
      await insert(page, kind);
      const dock = await openInspector(page);
      const canvas = page.getByRole('main', { name: 'Vision board canvas' });
      const workspace = await page.locator('.vs-body').boundingBox();
      const canvasBounds = await canvas.boundingBox();
      const dockBounds = await dock.boundingBox();
      expect(dockBounds!.x).toBeGreaterThanOrEqual(canvasBounds!.x + canvasBounds!.width - 1);
      expect(dockBounds!.y).toBeCloseTo(workspace!.y, 0);
      expect(dockBounds!.height).toBeGreaterThan(workspace!.height * 0.9);
      await expect
        .poll(async () =>
          Number(
            await page
              .getByLabel('Editable vision board', { exact: true })
              .getAttribute('data-scale'),
          ),
        )
        .toBeGreaterThan(0.25);
      const toolbar = await page
        .getByRole('toolbar', { name: 'Selected object actions' })
        .boundingBox();
      expect(toolbar!.x).toBeGreaterThanOrEqual(canvasBounds!.x - 1);
      expect(toolbar!.x + toolbar!.width).toBeLessThanOrEqual(
        canvasBounds!.x + canvasBounds!.width + 1,
      );
      expect(toolbar!.height, 'desktop tools should stay in one compact row').toBeLessThanOrEqual(
        64,
      );
    }
  });
}

test('desktop library changes settle without stale panels after rapid switching', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await createBoard(page);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Background', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Background panel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Text panel', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Background panel', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await expect(page.locator('.vs-lib')).toHaveClass(/is-collapsed/);
  const canvas = (await page.getByRole('main', { name: 'Vision board canvas' }).boundingBox())!;
  expect(canvas.width).toBeGreaterThan(1200);
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Elements panel', exact: true })).toBeVisible();
  await expect(page.locator('.vs-lib__panel')).not.toHaveAttribute('inert');
});

test('a resized desktop window keeps the inspector docked across the 768px breakpoint', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await createBoard(page, { closeLibrary: true });
  await insert(page, 'text');
  const dock = await openInspector(page);
  for (const width of [720, 744, 768, 800, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await frames(page);
    const canvas = (await page.getByRole('main', { name: 'Vision board canvas' }).boundingBox())!;
    const bounds = (await dock.boundingBox())!;
    const workspace = (await page.locator('.vs-body').boundingBox())!;
    expect(bounds.width, `inspector width at ${width}`).toBeGreaterThanOrEqual(260);
    expect(bounds.x).toBeGreaterThanOrEqual(canvas.x + canvas.width - 1);
    expect(bounds.y).toBeCloseTo(workspace.y, 0);
    expect(bounds.height).toBeCloseTo(workspace.height, 0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  }
});
