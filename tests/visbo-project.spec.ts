import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createAppearanceBoard, runtime } from './appearance-helpers';

test.use({ baseURL: process.env.VISBO_TEST_URL || 'http://127.0.0.1:4173' });

test('editable .visbo downloads restore the complete document and remain undoable', async ({
  page,
}) => {
  await createAppearanceBoard(page);
  const handle = await runtime(page);
  const before = await handle.evaluate(({ adapter }) => adapter.history.document);
  await page.getByLabel('File menu', { exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'Download board file', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/\.visbo$/);
  const bytes = readFileSync((await download.path())!);
  expect(JSON.parse(bytes.toString())).toEqual(before);
  await handle.evaluate(({ adapter }) =>
    adapter.createTextPreset({
      id: 'test',
      label: 'Text',
      sample: 'Temporary text',
      category: 'minimal',
      fontFamily: 'inter',
      fontSize: 24,
      color: '#000000',
    }),
  );
  await page.getByLabel('Open board file', { exact: true }).setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/vnd.visbo.project+json',
    buffer: bytes,
  });
  await expect
    .poll(() => handle.evaluate(({ adapter }) => adapter.history.document.items))
    .toEqual(before.items);
  await handle.evaluate(({ adapter }) => adapter.undo());
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items.length)).toBe(
    before.items.length + 1,
  );
  await handle.evaluate(({ adapter }) => adapter.redo());
  expect(await handle.evaluate(({ adapter }) => adapter.history.document.items)).toEqual(
    before.items,
  );
});
