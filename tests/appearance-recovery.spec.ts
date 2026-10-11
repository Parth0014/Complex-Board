import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { migrateDocument } from '../src/vision/appearance/migration';

test.use({ baseURL: process.env.APPEARANCE_RECOVERY_URL || 'http://127.0.0.1:4176' });
test.skip(
  !process.env.APPEARANCE_RECOVERY_URL || !process.env.APPEARANCE_LEGACY_URL,
  'Run against the validation dev server and isolated legacy renderer.',
);

test('explicit storage rollback preserves media, snapshots v3 data and produces editable boards readable by the old renderer', async ({
  page,
}) => {
  await page.goto('/');
  const canonical = migrateDocument(
    JSON.parse(readFileSync('tests/fixtures/appearance-phase-c-v2.json', 'utf8')),
  );
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('gratitude-studio-v1', 2);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['boards', 'media'], 'readwrite');
      tx.objectStore('boards').put(value, 'rollback-board');
      tx.objectStore('media').put({
        id: 'sentinel',
        working: new Blob(['preserved photo']),
        name: 'unchanged',
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, canonical);
  const pending = page.waitForEvent('download');
  const result = await page.evaluate(async () => {
    const recovery = await import('/scripts/appearance-recovery-browser.mjs');
    return recovery.rollbackBoardStore();
  });
  expect(result.converted).toBe(1);
  const snapshot = JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
  expect(snapshot.records).toEqual([{ key: 'rollback-board', document: canonical }]);
  const recovered = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('gratitude-studio-v1', 2);
      r.onsuccess = () => resolve(r.result);
    });
    const read = (r: IDBRequest) =>
      new Promise((resolve) => {
        r.onsuccess = () => resolve(r.result);
      });
    const tx = db.transaction(['boards', 'media'], 'readonly');
    const board = await read(tx.objectStore('boards').get('rollback-board'));
    const media = (await read(
      db.transaction('media', 'readonly').objectStore('media').get('sentinel'),
    )) as { working: Blob; name: string };
    db.close();
    return { board, media: { name: media.name, contents: await media.working.text() } };
  });
  expect(recovered.media).toEqual({ name: 'unchanged', contents: 'preserved photo' });
  expect(migrateDocument(recovered.board)).toEqual(canonical);
  await page.goto(process.env.APPEARANCE_LEGACY_URL!);
  await page.getByRole('button', { name: '+ Create a vision board', exact: true }).click();
  await page.getByRole('button', { name: 'Create board', exact: true }).click();
  await page.getByLabel('File menu', { exact: true }).click();
  await page.getByLabel('Restore backup', { exact: true }).setInputFiles({
    name: 'recovered-v2.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(recovered.board)),
  });
  await expect(page.getByLabel('Board name', { exact: true })).toHaveValue(canonical.title);
  const saved = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  expect(JSON.parse(readFileSync((await (await saved).path())!, 'utf8')).version).toBe(2);
  await page.getByLabel('File menu', { exact: true }).click();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const png = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  expect(
    readFileSync((await (await png).path())!).equals(
      readFileSync('exports/appearance-legacy/phase-c.png'),
    ),
  ).toBe(true);
});

test('rollback refuses unrepresentable styles before changing any saved project', async ({
  page,
}) => {
  await page.goto('/');
  const good = migrateDocument(
    JSON.parse(readFileSync('tests/fixtures/appearance-phase-c-v2.json', 'utf8')),
  );
  const unsupported = structuredClone(good);
  const line = unsupported.items.find((item) => item.id === 'line')!;
  if (line.kind !== 'asset') line.appearance.stroke.width = 0;
  await page.evaluate(
    async ({ good, unsupported }) => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const r = indexedDB.open('gratitude-studio-v1', 2);
        r.onsuccess = () => resolve(r.result);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('boards', 'readwrite');
        tx.objectStore('boards').put(good, 'a');
        tx.objectStore('boards').put(unsupported, 'b');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { good, unsupported },
  );
  const error = await page.evaluate(async () => {
    try {
      const module = await import('/scripts/appearance-recovery-browser.mjs');
      await module.rollbackBoardStore();
      return '';
    } catch (error) {
      return String(error);
    }
  });
  expect(error).toContain('zero stroke width');
  const values = await page.evaluate(async () => {
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
  expect(values).toEqual([good, unsupported]);
});
