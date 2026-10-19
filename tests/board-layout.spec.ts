import { test, expect, type Page } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

async function resizeBoard(page: Page, size: string) {
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }, size) => {
    const [width, height] = size.split('x').map(Number);
    adapter.commit({ ...adapter.history.document, width, height });
    adapter.fitBoard();
  }, size);
}

test('zoomed board bottom is reachable above the footer', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'Dismiss canvas introduction' }).click();
  await resizeBoard(page, '1920x1080');
  await page.getByRole('slider', { name: 'Zoom', exact: true }).fill('150');
  const board = page.getByLabel('Editable vision board', { exact: true });
  const bottomGap = () =>
    board.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      const footer = document.querySelector('[aria-label="Board controls"]')!;
      const bottom =
        node.getBoundingClientRect().top +
        Number(node.getAttribute('data-page-top')) +
        1080 * Number(node.getAttribute('data-scale'));
      return footer.getBoundingClientRect().top - bottom;
    });
  await expect.poll(bottomGap).toBeGreaterThanOrEqual(39);
  await page.setViewportSize({ width: 800, height: 700 });
  await expect.poll(bottomGap).toBeGreaterThanOrEqual(39);
  const viewport = (await board.boundingBox())!;
  const footer = (await page.getByLabel('Board controls', { exact: true }).boundingBox())!;
  expect(footer.y + footer.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(footer.y).toBeGreaterThan(viewport.y);
});

test('vertical scrollbar toggles preserve the canvas viewport width and board origin', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'Dismiss canvas introduction' }).click();
  const board = page.getByLabel('Editable vision board', { exact: true });
  await expect(board.locator('canvas').first()).toBeVisible();
  await page.waitForTimeout(150);
  const geometry = () =>
    board.evaluate((node) => ({
      width: node.clientWidth,
      scale: node.getAttribute('data-scale'),
      left: node.getAttribute('data-page-left'),
      top: node.getAttribute('data-page-top'),
    }));
  const before = await geometry();
  expect(await board.evaluate((node) => getComputedStyle(node).padding)).toBe('0px');
  for (let i = 0; i < 3; i++) {
    await board.evaluate((node) => {
      node.style.overflowY = 'scroll';
    });
    await page.waitForTimeout(50);
    expect(await geometry()).toEqual(before);
    await board.evaluate((node) => {
      node.style.overflowY = 'auto';
    });
    await page.waitForTimeout(50);
    expect(await geometry()).toEqual(before);
  }
});

test('resizing and zooming paint the current artboard geometry in every frame', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'Dismiss canvas introduction' }).click();
  const board = page.getByLabel('Editable vision board', { exact: true });
  await expect(board.locator('canvas').first()).toBeVisible();
  await page.waitForTimeout(200);
  await board.evaluate((node) => {
    const state = window as Window & { blankBoardFrames: number; sampleBoard: boolean };
    state.blankBoardFrames = 0;
    state.sampleBoard = true;
    const sample = () => {
      if (!state.sampleBoard) return;
      const canvas = node.querySelector('canvas')!;
      const ratio = canvas.width / parseFloat(canvas.style.width);
      const x = Math.floor((Math.max(0, Number(node.getAttribute('data-page-left'))) + 2) * ratio);
      const y = Math.floor((Math.max(0, Number(node.getAttribute('data-page-top'))) + 2) * ratio);
      if (canvas.getContext('2d')!.getImageData(x, y, 1, 1).data[3] !== 255)
        state.blankBoardFrames++;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByRole('slider', { name: 'Zoom', exact: true }).fill('100');
  await page.setViewportSize({ width: 1600, height: 900 });
  await resizeBoard(page, '1920x1080');
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.locator('.elements-card').first().click();
  await page
    .getByRole('toolbar', { name: 'Selected object actions' })
    .getByRole('button', { name: /Formatting|Image effects|Appearance/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.waitForTimeout(500);
  const blankFrames = await page.evaluate(() => {
    const state = window as Window & { blankBoardFrames: number; sampleBoard: boolean };
    state.sampleBoard = false;
    return state.blankBoardFrames;
  });
  expect(blankFrames).toBe(0);
});

test('pinch/Ctrl-wheel zoom uses increased sensitivity and keeps the pointer anchored', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'Dismiss canvas introduction' }).click();
  const board = page.getByLabel('Editable vision board', { exact: true });
  await expect.poll(async () => Number(await board.getAttribute('data-scale'))).toBeGreaterThan(0);
  const box = (await board.boundingBox())!;
  const x = box.width / 2,
    y = box.height / 2;
  await page.mouse.move(box.x + x, box.y + y);
  const before = Number(await board.getAttribute('data-scale'));
  const point = () =>
    board.evaluate(
      (node, point) => {
        const scale = Number(node.getAttribute('data-scale'));
        return {
          x: (point.x - Number(node.getAttribute('data-page-left'))) / scale,
          y: (point.y - Number(node.getAttribute('data-page-top'))) / scale,
        };
      },
      { x, y },
    );
  const anchor = await point();
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -10);
  await expect
    .poll(async () => Number(await board.getAttribute('data-scale')))
    .toBeGreaterThan(before);
  const after = Number(await board.getAttribute('data-scale'));
  expect(after / before).toBeGreaterThan(1);
  expect(after / before).toBeLessThan(1.3);
  const moved = await point();
  // Scroll offsets are rounded to CSS pixels; measure visible drift rather than world units.
  expect(Math.abs(moved.x - anchor.x) * after).toBeLessThan(2);
  expect(Math.abs(moved.y - anchor.y) * after).toBeLessThan(2);
  await page.mouse.wheel(0, 10);
  await expect
    .poll(async () => Math.abs(Number(await board.getAttribute('data-scale')) - before))
    .toBeLessThan(0.001);
  await page.mouse.wheel(0, -1);
  await expect
    .poll(async () => Number(await board.getAttribute('data-scale')))
    .toBeGreaterThan(before);
  expect(Number(await board.getAttribute('data-scale')) / before).toBeLessThan(1.015);
  await page.keyboard.up('Control');
});

test('plain two-finger wheel motion scrolls vertically without horizontal panning or zoom', async ({
  page,
}) => {
  // Ensure both axes overflow even on a wide desktop viewport.
  await page.setViewportSize({ width: 800, height: 650 });
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'Dismiss canvas introduction' }).click();
  const board = page.getByLabel('Editable vision board', { exact: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => adapter.zoomView!(1));
  await expect.poll(async () => Number(await board.getAttribute('data-scale'))).toBe(1);
  const box = (await board.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = await board.evaluate((node) => ({ x: node.scrollLeft, y: node.scrollTop }));
  await page.mouse.wheel(0, 100);
  await expect.poll(async () => board.evaluate((node) => node.scrollTop)).toBeGreaterThan(before.y);
  await page.mouse.wheel(100, 0);
  await expect.poll(async () => board.evaluate((node) => node.scrollLeft)).toBe(before.x);
  expect(Number(await board.getAttribute('data-scale'))).toBe(1);
});

test('restored board dimensions refit and toolbar zoom keeps the board centered', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  await page.getByRole('button', { name: 'Dismiss canvas introduction' }).click();
  const board = page.getByLabel('Editable vision board', { exact: true });
  const centerError = async () => {
    const handle = await runtime(page);
    const size = await handle.evaluate(({ adapter }) => [
      adapter.history.document.width,
      adapter.history.document.height,
    ]);
    return board.evaluate((node, size) => {
      const scale = Number(node.getAttribute('data-scale'));
      return Math.max(
        Math.abs(
          Number(node.getAttribute('data-page-left')) +
            (size[0] * scale) / 2 -
            node.clientWidth / 2,
        ),
        Math.abs(
          Number(node.getAttribute('data-page-top')) +
            (size[1] * scale) / 2 -
            node.clientHeight / 2,
        ),
      );
    }, size);
  };
  await resizeBoard(page, '1920x1080');
  await expect.poll(centerError).toBeLessThan(2);
  await page.getByRole('slider', { name: 'Zoom', exact: true }).fill('100');
  await expect.poll(centerError).toBeLessThan(2);
  await resizeBoard(page, '1080x1080');
  await expect.poll(centerError).toBeLessThan(2);
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await expect.poll(centerError).toBeLessThan(2);
});
