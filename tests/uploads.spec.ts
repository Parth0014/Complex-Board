import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

async function photo(page: Page) {
  return Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 3000;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#cc3322';
      ctx.fillRect(0, 0, 3000, 1000);
      return canvas.toDataURL('image/png').split(',')[1];
    }),
    'base64',
  );
}
async function backup(page: Page) {
  if (!(await page.getByRole('button', { name: 'Save backup', exact: true }).isVisible()))
    await page.getByText('File', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const saved = await pending;
  return readFileSync((await saved.path())!, 'utf8');
}
test('photos retain originals, edits, undo and portable backups in a fresh browser context', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let aiRequests = 0;
  await page.route('**/api/ai/**', (route) => {
    aiRequests++;
    return route.fulfill({ status: 503, json: { error: 'No AI' } });
  });
  await page.goto('/');
  const original = await photo(page);
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page
    .getByLabel('Upload photos', { exact: true })
    .setInputFiles({ name: 'my-home.png', mimeType: 'image/png', buffer: original });
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await expect(
    page.getByText('1 photo added. Originals are saved on this device.', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/photo-uploads.png', fullPage: true });
  const originalPending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download original photo', exact: true }).click();
  const originalDownload = await originalPending;
  expect(readFileSync((await originalDownload.path())!)).toEqual(original);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByRole('button', { name: 'Mono', exact: true }).click();
  const saved = JSON.parse(await backup(page));
  expect(saved.media).toHaveLength(1);
  expect(saved.media[0].originalWidth).toBe(3000);
  expect(saved.media[0].width).toBe(2560);
  expect(saved.items[0].filter).toBe('mono');
  expect(saved.items[0].asset.assetUrl).toMatch(/^media:upload:/);
  await page.reload();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await page.getByText('Board items (1)', { exact: true }).click();
  await page.locator('.v1-items li button').first().click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Board items (0)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  expect(aiRequests).toBe(0);
  const context = await browser.newContext();
  const restored = await context.newPage();
  try {
    await restored.goto('/');
    await restored.getByText('File', { exact: true }).click();
    await restored.getByLabel('Restore backup', { exact: true }).setInputFiles({
      name: 'board.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(saved)),
    });
    await expect(restored.getByText('Board items (1)', { exact: true })).toBeVisible();
    await restored.reload();
    await expect(restored.getByText('Board items (1)', { exact: true })).toBeVisible();
    await restored.getByRole('button', { name: /Share/ }).click();
    const pending = restored.waitForEvent('download');
    await restored.getByRole('button', { name: 'Download PNG', exact: true }).click();
    const exported = await pending;
    const png = readFileSync((await exported.path())!);
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1080);
    const pixel = await restored.evaluate(
      async (url) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        return [...ctx.getImageData(540, 675, 1, 1).data];
      },
      `data:image/png;base64,${png.toString('base64')}`,
    );
    expect(pixel[0]).toBe(pixel[1]);
    expect(pixel[1]).toBe(pixel[2]);
    expect(pixel[0]).toBeLessThan(220);
  } finally {
    await context.close();
  }
  expect(errors).toEqual([]);
});

test('rejects invalid uploads and prevents delayed photo insertion over newer edits', async ({
  page,
}) => {
  await page.goto('/');
  const original = await photo(page);
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page
    .getByLabel('Upload photos', { exact: true })
    .setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(page.getByRole('alert')).toContainText('PNG, JPEG or WebP');
  await page.evaluate(() => {
    const original = window.createImageBitmap.bind(window);
    Reflect.set(
      window,
      'createImageBitmap',
      async (...args: Parameters<typeof createImageBitmap>) => {
        await new Promise<void>((resolve) => Reflect.set(window, 'releasePhoto', resolve));
        return original(...args);
      },
    );
  });
  await page
    .getByLabel('Upload photos', { exact: true })
    .setInputFiles({ name: 'home.png', mimeType: 'image/png', buffer: original });
  await expect(page.getByText('Preparing your photos…', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'circle', exact: true }).click();
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  await page.evaluate(() => Reflect.get(window, 'releasePhoto')());
  await expect(page.getByRole('alert')).toContainText('board changed');
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
});

test('photo drops stay contained and duplicate uploads share storage through frame crop and PDF export', async ({
  page,
}) => {
  await page.goto('/');
  const original = await photo(page);
  const transfer = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'drop.png', { type: 'image/png' }));
    return transfer;
  }, original.toString('base64'));
  const canvas = page.getByLabel('Editable vision board', { exact: true });
  await canvas.dispatchEvent('dragover', { dataTransfer: transfer });
  await canvas.dispatchEvent('drop', { dataTransfer: transfer, clientX: 0, clientY: 0 });
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  let saved = JSON.parse(await backup(page));
  expect(saved.items[0].x).toBeGreaterThanOrEqual(0);
  expect(saved.items[0].y).toBeGreaterThanOrEqual(0);
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page.getByLabel('Upload photos', { exact: true }).setInputFiles([
    { name: 'same-one.png', mimeType: 'image/png', buffer: original },
    { name: 'same-two.png', mimeType: 'image/png', buffer: original },
  ]);
  await expect(page.getByText('Board items (3)', { exact: true })).toBeVisible();
  saved = JSON.parse(await backup(page));
  expect(saved.media).toHaveLength(1);
  expect(
    new Set(saved.items.map((item: { asset: { mediaId: string } }) => item.asset.mediaId)).size,
  ).toBe(1);
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByLabel('Category', { exact: true }).selectOption('photo-frames');
  await page.getByRole('button', { name: 'Classic portrait', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Style', exact: true }).click();
  await page.getByLabel('Frame content', { exact: true }).selectOption(saved.media[0].id);
  await page.getByRole('button', { name: 'Edit crop', exact: true }).click();
  await page.getByLabel('Crop width', { exact: true }).fill('70');
  await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
  saved = JSON.parse(await backup(page));
  expect(saved.media).toHaveLength(1);
  expect(saved.items[3].contentAsset.provider).toBe('upload');
  expect(saved.items[3].crop.width).toBe(0.7);
  const corrupt = structuredClone(saved);
  corrupt.media[0].id = `upload:${'b'.repeat(64)}`;
  await page.getByLabel('Restore backup', { exact: true }).setInputFiles({
    name: 'corrupt.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(corrupt)),
  });
  await expect(page.getByRole('alert')).toContainText('Invalid photo identity');
  await expect(page.getByText('Board items (4)', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Board items (4)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Share/ }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const exported = await pending;
  expect(
    readFileSync((await exported.path())!)
      .subarray(0, 8)
      .toString(),
  ).toBe('%PDF-1.4');
});

test('upgrading the storage database preserves a previously saved version-one board', async ({
  page,
}) => {
  await page.goto('/THIRD_PARTY_LICENSES.txt');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('gratitude-studio-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('boards');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result,
          tx = db.transaction('boards', 'readwrite');
        tx.objectStore('boards').put(
          {
            version: 1,
            title: 'My original board',
            width: 1080,
            height: 1350,
            color: '#ffffff',
            items: [
              {
                id: 'old',
                kind: 'text',
                x: 100,
                y: 100,
                width: 300,
                height: 80,
                rotation: 0,
                opacity: 1,
                text: 'Still here',
                fontFamily: 'assistant',
                fontSize: 24,
              },
            ],
          },
          'current',
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.goto('/');
  await expect(page.getByText('Board items (1)', { exact: true })).toBeVisible();
  const saved = JSON.parse(await backup(page));
  expect(saved.title).toBe('My original board');
  expect(saved.items[0].text).toBe('Still here');
  expect(saved.version).toBe(2);
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  await page
    .getByLabel('Upload photos', { exact: true })
    .setInputFiles({ name: 'new.png', mimeType: 'image/png', buffer: await photo(page) });
  await expect(page.getByText('Board items (2)', { exact: true })).toBeVisible();
});
