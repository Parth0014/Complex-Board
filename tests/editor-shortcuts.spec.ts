import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('selection shortcuts work from the sidebar while text and slider keys stay local', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) =>
    adapter.createTextPreset({
      id: 'shortcuts',
      label: 'Text',
      sample: 'Keep creating',
      fontFamily: 'georgia',
      fontSize: 48,
      color: '#33272b',
    }),
  );
  await page.getByRole('button', { name: 'Formatting', exact: true }).click();
  const dock = page.getByRole('complementary', { name: 'Object formatting', exact: true });
  await dock.getByRole('tab', { name: 'Layout', exact: true }).click();
  await page.keyboard.press('Control+d');
  await expect
    .poll(() => handle.evaluate(({ adapter }) => adapter.history.document.items.length))
    .toBe(2);
  await page.keyboard.press('Control+z');
  await expect
    .poll(() => handle.evaluate(({ adapter }) => adapter.history.document.items.length))
    .toBe(1);
  await page.keyboard.press('Control+y');
  await expect
    .poll(() => handle.evaluate(({ adapter }) => adapter.history.document.items.length))
    .toBe(2);
  await handle.evaluate(({ adapter }) => adapter.select([adapter.history.document.items[1].id]));
  await expect(dock).toBeVisible();
  await dock.getByRole('tab', { name: 'Layout', exact: true }).click();
  const width = dock.getByLabel('Bounds width', { exact: true });
  const before = await width.inputValue();
  await width.fill('617');
  await page.keyboard.press('Control+z');
  await expect(width).toHaveValue(before);
  await page.keyboard.press('Control+y');
  await expect(width).toHaveValue('617');
  await dock.getByRole('tab', { name: 'Edit', exact: true }).click();
  const text = dock.getByLabel('Styled text', { exact: true });
  await text.focus();
  const selected = await handle.evaluate(({ adapter }) => adapter.selectedIds);
  await page.keyboard.press('Control+a');
  expect(await text.evaluate((el) => el.selectionEnd! - el.selectionStart!)).toBe(
    'Keep creating'.length,
  );
  expect(await handle.evaluate(({ adapter }) => adapter.selectedIds)).toEqual(selected);
  const zoom = page.getByRole('slider', { name: 'Zoom', exact: true });
  await zoom.focus();
  const x = await handle.evaluate(
    ({ adapter }) =>
      adapter.history.document.items.find((item) => item.id === adapter.selectedIds[0])!.x,
  );
  await page.keyboard.press('ArrowRight');
  expect(
    await handle.evaluate(
      ({ adapter }) =>
        adapter.history.document.items.find((item) => item.id === adapter.selectedIds[0])!.x,
    ),
  ).toBe(x);
  await dock.getByRole('tab', { name: 'Edit', exact: true }).focus();
  await page.keyboard.press('Delete');
  await expect
    .poll(() => handle.evaluate(({ adapter }) => adapter.history.document.items.length))
    .toBe(1);
});

test('font picker allows document commands and keeps arrow navigation local', async ({ page }) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) =>
    adapter.createTextPreset({
      id: 'keys',
      label: 'Text',
      sample: 'Dream',
      fontFamily: 'georgia',
      fontSize: 48,
      color: '#33272b',
    }),
  );
  await page.getByRole('button', { name: 'Font family', exact: true }).click();
  await expect(page.getByRole('listbox', { name: 'Fonts', exact: true })).toBeVisible();
  await page.keyboard.press('Control+d');
  await expect
    .poll(() => handle.evaluate(({ adapter }) => adapter.history.document.items.length))
    .toBe(2);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+a');
  await expect.poll(() => handle.evaluate(({ adapter }) => adapter.selectedIds.length)).toBe(2);
  await page.keyboard.press('Control+g');
  await expect
    .poll(() =>
      handle.evaluate(({ adapter }) =>
        adapter.history.document.items.every((item) => !!item.groupId),
      ),
    )
    .toBe(true);
  await page.keyboard.press('Control+Shift+g');
  await expect
    .poll(() =>
      handle.evaluate(({ adapter }) =>
        adapter.history.document.items.every((item) => !item.groupId),
      ),
    )
    .toBe(true);
});
