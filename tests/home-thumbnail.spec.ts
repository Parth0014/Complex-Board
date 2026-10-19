import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';
for (const shape of ['heart', 'polygon'] as const)
  test('saved home thumbnail preserves ' + shape + ' clipping after reload', async ({ page }) => {
    await createBoard(page, { closeLibrary: true });
    const handle = await runtime(page);
    await handle.evaluate(async ({ adapter }, shape) => {
      const c = document.createElement('canvas');
      c.width = c.height = 200;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 200, 200);
      const blob = await new Promise<Blob>((resolve) => c.toBlob((v) => resolve(v!)));
      await adapter.uploadPhotos([new File([blob], 'heart.png', { type: 'image/png' })]);
      const item = adapter.history.document.items[0];
      adapter.commit({
        ...adapter.history.document,
        width: 200,
        height: 200,
        color: '#ffffff',
        title: 'Exact heart',
        items: [
          {
            ...item,
            x: 0,
            y: 0,
            width: 200,
            height: 200,
            ...(shape === 'heart'
              ? { frameShape: 'heart' as const }
              : {
                  scrapbookPhoto: {
                    width: 200,
                    height: 200,
                    style: 'raw',
                    colors: ['#fff', '#fff'],
                    clip: [50, 0, 100, 100, 0, 100],
                  },
                }),
            imageFit: 'fill',
            rotation: 0,
          },
        ],
      });
      await adapter.flushSave();
    }, shape);
    await page.getByRole('button', { name: 'Back to home', exact: true }).click();
    const thumbnail = page.locator('.home-board-preview svg image').first();
    await expect(thumbnail).toHaveAttribute('href', new RegExp('^data:image/jpeg'));
    const pixels = await thumbnail.evaluate(async (el) => {
      const image = new Image();
      image.src = el.getAttribute('href')!;
      await image.decode();
      const c = document.createElement('canvas');
      c.width = c.height = 100;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(image, 0, 0, 100, 100);
      return {
        corner: Array.from(ctx.getImageData(1, 1, 1, 1).data),
        center: Array.from(ctx.getImageData(50, 50, 1, 1).data),
      };
    });
    expect(pixels.corner.slice(0, 3).every((v) => v > 235)).toBe(true);
    expect(pixels.center[0]).toBeGreaterThan(230);
    expect(pixels.center[1]).toBeLessThan(25);
    await page.reload();
    await expect(page.locator('.home-board-preview svg image').first()).toHaveAttribute(
      'href',
      new RegExp('^data:image/jpeg'),
    );
  });

for (const preset of ['torn-scrapbook', 'soft-life-collage', 'sticker-chaos'])
  test('template preview matches its applied board: ' + preset, async ({ page }) => {
    test.setTimeout(60000);
    await createBoard(page, { layout: 'Portrait', closeLibrary: true });
    const handle = await runtime(page);
    const equal = await handle.evaluate(async ({ adapter }, preset) => {
      const preview = await adapter.previewScrapbookTemplate(preset);
      await adapter.applyScrapbookTemplate(preset);
      const applied = await adapter.previewSavedDocument(adapter.history.document, 640);
      return { preview, applied };
    }, preset);
    mkdirSync('.godmode/screenshots', { recursive: true });
    writeFileSync(
      '.godmode/screenshots/' + preset + '-preview.jpg',
      Buffer.from(equal.preview.split(',')[1], 'base64'),
    );
    writeFileSync(
      '.godmode/screenshots/' + preset + '-applied.jpg',
      Buffer.from(equal.applied.split(',')[1], 'base64'),
    );
    expect(equal.preview === equal.applied).toBe(true);
  });
