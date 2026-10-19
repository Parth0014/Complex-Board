import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type Konva from 'konva';
import type { KonvaCanvasAdapter } from '../src/vision/canvas/KonvaCanvasAdapter';
import type { BoardDocument } from '../src/vision/document';
import { createBoard } from './helpers/board';

export async function createAppearanceBoard(
  page: Page,
  fixture = 'tests/fixtures/appearance-phase-c-v2.json',
) {
  await createBoard(page);
  await page.getByLabel('File menu', { exact: true }).click();
  await page.getByLabel('Open board file', { exact: true }).setInputFiles(fixture);
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(
    JSON.parse(readFileSync(fixture, 'utf8')).title,
  );
  await page.getByLabel('File menu', { exact: true }).click();
  await frames(page);
}
export async function frames(page: Page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

/** Access the real mounted adapter/Stage only in tests, including APIs without visible UI. */
export async function runtime(page: Page) {
  return page.getByLabel('Editable vision board', { exact: true }).evaluateHandle((element) => {
    interface Hook {
      memoizedState: unknown;
      next?: Hook;
    }
    interface Fiber {
      memoizedProps?: { adapter?: KonvaCanvasAdapter };
      memoizedState?: Hook;
      return?: Fiber;
    }
    const key = Object.keys(element).find((key) => key.startsWith('__reactFiber$'))!;
    let fiber = (element as unknown as Record<string, Fiber>)[key];
    while (fiber) {
      if (fiber.memoizedProps?.adapter?.history) {
        let hook = fiber.memoizedState;
        while (hook) {
          const current = (hook.memoizedState as { current?: Konva.Stage })?.current;
          if (current?.getClassName?.() === 'Stage')
            return { adapter: fiber.memoizedProps.adapter, stage: current };
          hook = hook.next;
        }
      }
      fiber = fiber.return!;
    }
    throw new Error('Mounted canvas runtime not found.');
  });
}
export async function downloadBackup(page: Page): Promise<BoardDocument> {
  await page.getByLabel('File menu', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Download board file', exact: true }).click();
  const document = JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
  await page.getByLabel('File menu', { exact: true }).click();
  return document;
}
export async function pixelDifference(
  page: Page,
  before: Buffer,
  after: Buffer,
  rect?: { x: number; y: number; width: number; height: number },
) {
  return page.evaluate(
    async ({ before, after, rect }) => {
      const pixels = async (data: string) => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + data;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        return {
          data: ctx.getImageData(0, 0, image.width, image.height).data,
          width: image.width,
          height: image.height,
        };
      };
      const [a, b] = await Promise.all([pixels(before), pixels(after)]);
      if (a.width !== b.width || a.height !== b.height)
        throw new Error('Comparison dimensions differ.');
      const bounds = rect || { x: 0, y: 0, width: a.width, height: a.height };
      let count = 0,
        max = 0;
      const startX = Math.max(0, Math.floor(bounds.x)),
        startY = Math.max(0, Math.floor(bounds.y));
      const endX = Math.min(a.width, Math.floor(bounds.x + bounds.width)),
        endY = Math.min(a.height, Math.floor(bounds.y + bounds.height));
      if (endX <= startX || endY <= startY) throw new Error('Comparison has no visible artwork.');
      for (let y = startY; y < endY; y++)
        for (let x = startX; x < endX; x++) {
          let changed = false;
          for (let c = 0; c < 4; c++) {
            const delta = Math.abs(
              a.data[(y * a.width + x) * 4 + c] - b.data[(y * b.width + x) * 4 + c],
            );
            max = Math.max(max, delta);
            changed ||= !!delta;
          }
          count += Number(changed);
        }
      return { count, max };
    },
    { before: before.toString('base64'), after: after.toString('base64'), rect },
  );
}

export async function boardScreenBounds(page: Page, width: number, height: number) {
  const viewport = page.getByLabel('Editable vision board', { exact: true });
  const canvas = (await viewport.locator('canvas').first().boundingBox())!;
  const scale = Number(await viewport.getAttribute('data-scale'));
  return {
    x: canvas.x + Number(await viewport.getAttribute('data-page-left')),
    y: canvas.y + Number(await viewport.getAttribute('data-page-top')),
    width: width * scale,
    height: height * scale,
  };
}
