import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('numeric drafts, keyboard steps, escape and scrub use one history gesture', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) =>
    adapter.createTextPreset({
      id: 'numbers',
      label: 'Text',
      sample: 'Make it happen',
      fontFamily: 'georgia',
      fontSize: 48,
      color: '#33272b',
    }),
  );
  const field = page.getByLabel('Text size in points', { exact: true });
  await field.fill('150');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items[0].fontSize)).toBe(
    48,
  );
  await field.press('Enter');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items[0].fontSize)).toBe(
    150,
  );
  await page.keyboard.press('Control+z');
  await expect(field).toHaveValue('48');
  await page.keyboard.press('Control+y');
  await expect(field).toHaveValue('150');
  await field.focus();
  await field.press('Shift+ArrowUp');
  await expect(field).toHaveValue('160');
  await field.press('Escape');
  await expect(field).toHaveValue('150');
  const scrub = page.getByRole('button', {
    name: 'Drag to adjust Text size in points',
    exact: true,
  });
  const rect = (await scrub.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2 + 20, rect.y + rect.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(field).toHaveValue('160');
  await page.keyboard.press('Control+z');
  await expect(field).toHaveValue('150');
  await page.getByRole('button', { name: 'Formatting', exact: true }).click();
  const dock = page.getByRole('complementary', { name: 'Object formatting' });
  await expect(
    page
      .getByRole('toolbar', { name: 'Selected object actions' })
      .getByLabel('Text size in points', { exact: true }),
  ).toHaveCount(0);
  await dock
    .locator('summary')
    .filter({ hasText: /^Opacity$/ })
    .click();
  await expect(dock.getByLabel('Opacity (%)', { exact: true })).toBeVisible();
  await dock.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await page.getByRole('button', { name: 'Formatting', exact: true }).click();
  await expect(dock.getByLabel('Opacity (%)', { exact: true })).toBeVisible();
});

test('board card deletion has Undo, persists across reload, and uses its options menu', async ({
  page,
}) => {
  await createBoard(page, { name: 'Keep this board', closeLibrary: true });
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  const card = page.locator('.home-board-card');
  await expect(card).toContainText('Edited today');
  await expect(card.getByRole('button', { name: 'Delete board', exact: true })).toHaveCount(0);
  await card
    .getByRole('button', { name: 'Board options for Keep this board', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Delete board', exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(card).toHaveCount(1);
  await page.reload();
  await expect(card).toHaveCount(1);
  await card
    .getByRole('button', { name: 'Board options for Keep this board', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Delete board', exact: true }).click();
  await page.reload();
  await expect(card).toHaveCount(0);
});

test('400 percent zoom keeps backing canvases bounded and keyboard fit restores the viewport', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => adapter.createShape('circle'));
  const zoom = page.getByRole('slider', { name: 'Zoom', exact: true });
  await zoom.focus();
  await zoom.press('End');
  await expect(zoom).toHaveValue('400');
  const viewport = page.getByLabel('Editable vision board', { exact: true });
  await expect(viewport).toHaveAttribute('data-scale', '4');
  const bounded = await viewport.evaluate((el) =>
    Array.from(el.querySelectorAll('canvas')).every(
      (c) =>
        c.width <= el.clientWidth * devicePixelRatio + 2 &&
        c.height <= el.clientHeight * devicePixelRatio + 2,
    ),
  );
  expect(bounded).toBe(true);
  await viewport.focus();
  await page.keyboard.press('0');
  await expect.poll(async () => Number(await viewport.getAttribute('data-scale'))).toBeLessThan(1);
  const before = Number(await viewport.getAttribute('data-scale'));
  await page.keyboard.press('+');
  await expect
    .poll(async () => Number(await viewport.getAttribute('data-scale')))
    .toBeGreaterThan(before);
});

test('single-step start modes, export and shared file menu are clear and keyboard accessible', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '+ New board', exact: true }).click();
  await expect(page.getByText('Focus', { exact: true })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Template', exact: true }).check();
  await expect(page.getByRole('radio', { name: 'Portrait', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Create board', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Templates panel' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'File menu', exact: true }).click();
  await expect(page.getByRole('menu', { name: 'File actions', exact: true })).toBeVisible();
  await expect(
    page.getByRole('menuitem', { name: 'Download board file', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'File actions', exact: true })).toHaveCount(0);
});
for (const width of [390, 820, 1440])
  test('inspector, rail and canvas stay usable at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await createBoard(page, { closeLibrary: true });
    const handle = await runtime(page);
    await handle.evaluate(({ adapter }) => {
      adapter.createShape('rectangle');
      adapter.createShape('circle');
    });
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    const dock = page.getByRole('complementary', { name: 'Object formatting', exact: true });
    await expect(dock).toBeVisible();
    const canvasBounds = await page
      .getByRole('main', { name: 'Vision board canvas' })
      .boundingBox();
    expect(canvasBounds?.width).toBeGreaterThan(200);
    expect(canvasBounds?.height).toBeGreaterThan(200);
    expect(canvasBounds?.y).toBeLessThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await dock
        .locator('.object-inspector-body')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await dock.getByRole('tab', { name: 'Layers', exact: true }).click();
    const before = await handle.evaluate(({ adapter }) =>
      adapter.history.document.items.map((item) => item.id),
    );
    await dock.getByRole('button', { name: 'Move circle down', exact: true }).click();
    expect(
      await handle.evaluate(({ adapter }) => adapter.history.document.items.map((item) => item.id)),
    ).toEqual([...before].reverse());
    await page.keyboard.press('Control+z');
    expect(
      await handle.evaluate(({ adapter }) => adapter.history.document.items.map((item) => item.id)),
    ).toEqual(before);
    await page.screenshot({ path: '.godmode/screenshots/ui-review-' + width + '.png' });
  });

test('board names commit once and multi-selection keeps a properties entry point', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  const name = page.getByRole('textbox', { name: 'Board name', exact: true });
  await name.fill('A new chapter');
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.title)).toBe(
    'Desktop craft',
  );
  await name.press('Enter');
  await page.keyboard.press('Control+z');
  await expect(name).toHaveValue('Desktop craft');
  await page.keyboard.press('Control+y');
  await expect(name).toHaveValue('A new chapter');
  await handle.evaluate(({ adapter }) => {
    adapter.createShape('rectangle');
    adapter.createShape('circle');
    adapter.select(adapter.history.document.items.map((item) => item.id));
  });
  await page.getByRole('button', { name: 'Properties', exact: true }).click();
  await expect(
    page.getByRole('complementary', { name: 'Object formatting', exact: true }),
  ).toBeVisible();
});
test('group layers can be reordered with buttons and undone', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  const before = await handle.evaluate(({ adapter }) => {
    adapter.createShape('rectangle');
    adapter.createShape('circle');
    const ids = adapter.history.document.items.map((item) => item.id);
    adapter.groupSelection();
    adapter.select(ids);
    adapter.groupSelection();
    adapter.createShape('star');
    adapter.select(ids);
    return adapter.history.document.items.map((item) => item.id);
  });
  await page.getByRole('button', { name: 'Properties', exact: true }).click();
  const dock = page.getByRole('complementary', { name: 'Object formatting', exact: true });
  await dock.getByRole('tab', { name: 'Layers', exact: true }).click();
  await dock.getByRole('button', { name: 'Move group up', exact: true }).click();
  expect(
    await handle.evaluate(({ adapter }) => adapter.history.document.items.map((item) => item.id)),
  ).toEqual([before[2], before[0], before[1]]);
  await page.keyboard.press('Control+z');
  expect(
    await handle.evaluate(({ adapter }) => adapter.history.document.items.map((item) => item.id)),
  ).toEqual(before);
});

test('from photos opens uploads and blank boards offer direct first actions', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  await expect(page.getByRole('button', { name: 'Browse templates', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload photos', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss canvas introduction', exact: true }).click();
  await expect(page.locator('.vs-canvas-onboarding')).toHaveCount(0);
  await expect(page.getByRole('main', { name: 'Vision board canvas' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await page.getByRole('button', { name: '+ New board', exact: true }).click();
  await page.getByRole('radio', { name: 'From photos', exact: true }).check();
  await page.getByRole('button', { name: 'Create board', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Uploads panel', exact: true })).toBeVisible();
});

test('canvas introduction follows the board center and stays dismissed after reload', async ({
  page,
}) => {
  await createBoard(page, { layout: 'Portrait', closeLibrary: true });
  const prompt = page.locator('.vs-canvas-onboarding');
  const centerError = () =>
    prompt.evaluate((node) => {
      const viewport = document.querySelector<HTMLElement>('.gs-artboard')!;
      const bounds = document.querySelector('.konvajs-content')!.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      const scale = Number(viewport.dataset.scale);
      return Math.max(
        Math.abs(
          box.x +
            box.width / 2 -
            (bounds.x + Number(viewport.dataset.pageLeft) + (1080 * scale) / 2),
        ),
        Math.abs(
          box.y +
            box.height / 2 -
            (bounds.y + Number(viewport.dataset.pageTop) + (1920 * scale) / 2),
        ),
      );
    });
  await expect.poll(centerError).toBeLessThan(2);
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await expect.poll(centerError).toBeLessThan(2);
  await page.getByRole('button', { name: 'Dismiss canvas introduction', exact: true }).click();
  await expect(prompt).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Editable vision board', { exact: true })).toBeVisible();
  await expect(prompt).toHaveCount(0);
});
