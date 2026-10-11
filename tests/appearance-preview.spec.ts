import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { runtime, frames, downloadBackup } from './appearance-helpers';

test.use({ baseURL: process.env.APPEARANCE_PREVIEW_URL || 'http://127.0.0.1:4175' });
test.skip(
  !process.env.APPEARANCE_PREVIEW_URL,
  'Run against a VITE_APPEARANCE_PERSISTENCE=preview build.',
);

test('validation activation renders canonical styles while leaving every persisted legacy record unchanged', async ({
  page,
}) => {
  await page.goto('/');
  const legacy = JSON.parse(readFileSync('tests/fixtures/appearance-v2.json', 'utf8'));
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('gratitude-studio-v1', 2);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('boards', 'readwrite');
      tx.objectStore('boards').put(value, 'preview-legacy');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, legacy);
  await page.goto('/?board=preview-legacy');
  await page.getByLabel('Editable vision board', { exact: true }).waitFor();
  await expect(page.getByText('Preview (not saved)', { exact: true })).toBeVisible();
  const r = await runtime(page);
  await r.evaluate(async ({ adapter }) => {
    adapter.select(['solid']);
    adapter.setAppearanceField('stroke.width', 19);
    await adapter.flushSave();
  });
  await frames(page);
  expect(
    await r.evaluate(({ stage }) =>
      stage.findOne('#solid')!.find('Rect').at(-1)!.getAttr('strokeWidth'),
    ),
  ).toBe(19);
  const backup = await downloadBackup(page);
  expect(backup.version).toBe(3);
  expect(backup.items[0].appearance?.stroke.width).toBe(19);
  const records = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('gratitude-studio-v1', 2);
      r.onsuccess = () => resolve(r.result);
    });
    const values = await new Promise((resolve) => {
      const r = db.transaction('boards', 'readonly').objectStore('boards').getAll();
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return values;
  });
  expect(records).toEqual([legacy]);
  await page.reload();
  await page.getByLabel('Editable vision board', { exact: true }).waitFor();
  expect((await downloadBackup(page)).items[0].appearance?.stroke.width).toBe(8);
});
