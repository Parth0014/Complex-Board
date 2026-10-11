import { chromium } from '@playwright/test';
import { mkdir, readFile, copyFile } from 'node:fs/promises';

const output = process.env.APPEARANCE_CAPTURE_DIR || 'exports/appearance-legacy';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const url = process.env.APPEARANCE_CAPTURE_URL || 'http://127.0.0.1:4173';
  await page.goto(url);
  const board = JSON.parse(await readFile('tests/fixtures/appearance-multipage-v2.json', 'utf8'));
  await page.evaluate(async (value) => {
    const request = indexedDB.open('gratitude-studio-v1', 2);
    const db = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('boards', 'readwrite'); tx.objectStore('boards').put(value, 'appearance-multipage');
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, board);
  await page.goto(url + '/?board=appearance-multipage');
  const viewport = page.getByLabel('Editable vision board', { exact: true });
  await viewport.waitFor();
  // Test-only access to the existing adapter. No application hooks or extra UI.
  const adapter = await viewport.evaluateHandle((element) => {
    let fiber = element[Object.keys(element).find((key) => key.startsWith('__reactFiber$'))];
    while (fiber) {
      if (fiber.memoizedProps?.adapter?.history) return fiber.memoizedProps.adapter;
      fiber = fiber.return;
    }
    throw new Error('Editor adapter not found.');
  });
  let pending = page.waitForEvent('download');
  await adapter.evaluate((a) => a.exportFormat('pdf-all'));
  await copyFile(await (await pending).path(), `${output}/multipage.pdf`);
  for (const id of board.pages.map((page) => page.id)) {
    await adapter.evaluate((a, id) => a.switchPage(id), id);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    pending = page.waitForEvent('download'); await adapter.evaluate((a) => a.exportImage());
    await copyFile(await (await pending).path(), `${output}/multipage-${id}.png`);
    await page.screenshot({ path: `${output}/multipage-${id}-canvas.png` });
  }
  await adapter.dispose();
  console.log(`Captured actual multipage PDF, page PNGs and canvas references in ${output}`);
} finally { await browser.close(); }
