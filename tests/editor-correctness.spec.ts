import type Konva from 'konva';
import { expect, test } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('unavailable Export explains itself and cannot activate', async ({ page }) => {
  await createBoard(page);
  const share = page.getByRole('button', { name: 'Export', exact: true });
  await expect(share).toHaveAttribute('aria-disabled', 'true');
  expect(await share.evaluate((node: HTMLButtonElement) => node.disabled)).toBe(false);
  await share.focus();
  await expect(page.getByRole('tooltip')).toContainText('Add something to your board to export');
  await share.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('keyboard select all excludes hidden objects and retains visible locked objects', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  const ids = await handle.evaluate(({ adapter }) => {
    adapter.createShape('rectangle');
    adapter.createShape('rectangle');
    adapter.createShape('rectangle');
    const items = adapter.history.document.items;
    adapter.history.commit({
      ...adapter.history.document,
      items: items.map((item, index) => ({ ...item, hidden: index === 0, locked: index === 1 })),
    });
    adapter.select([]);
    return items.slice(1).map((item) => item.id);
  });
  await page.getByLabel('Editable vision board', { exact: true }).focus();
  await page.keyboard.press('Control+a');
  await expect.poll(() => handle.evaluate(({ adapter }) => adapter.selectedIds)).toEqual(ids);
});

test('color errors have resolvable IDs and the inspector has one landmark', async ({ page }) => {
  await createBoard(page);
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) => {
    adapter.createTextPreset({
      id: 'review',
      label: 'Review',
      sample: 'A clear future',
      fontFamily: 'georgia',
      fontSize: 64,
      color: '#33272b',
    });
  });
  const formatting = page
    .getByRole('toolbar', { name: 'Selected object actions' })
    .getByRole('button', { name: 'Formatting', exact: true });
  expect(await formatting.getAttribute('aria-haspopup')).toBeNull();
  await formatting.click();
  const dock = page.getByRole('complementary', { name: 'Object formatting', exact: true });
  await expect(dock.locator('aside')).toHaveCount(0);
  await dock.getByRole('button', { name: 'Text color', exact: true }).first().click();
  const hex = page
    .getByRole('group', { name: 'Text color picker', exact: true })
    .getByLabel('Text color hex', { exact: true });
  await hex.fill('#xyz');
  await expect(hex).toHaveAttribute('aria-invalid', 'true');
  const id = await hex.getAttribute('aria-describedby');
  expect(id).toBeTruthy();
  expect(id).not.toMatch(/\s/);
  expect(await page.evaluate((id) => document.getElementById(id!)?.textContent, id)).toContain(
    'Use 3, 6 or 8 hex digits',
  );
});

test('error notifications remain visible until dismissed', async ({ page }) => {
  await createBoard(page);
  await page.getByLabel('File menu', { exact: true }).click();
  await page.getByLabel('Open board file', { exact: true }).setInputFiles({
    name: 'broken.visbo',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  const toast = page.locator('.gs-toast--error');
  await expect(toast).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(11000);
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'Dismiss' }).click();
  await page.clock.fastForward(200);
  await expect(toast).toHaveCount(0);
});

test('Formatting numeric controls commit drafts and preserve cancel and undo', async ({ page }) => {
  await createBoard(page);
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) =>
    adapter.createTextPreset({
      id: 'live-formatting',
      label: 'Live formatting',
      sample: 'Live formatting',
      fontFamily: 'georgia',
      fontSize: 64,
      color: '#33272b',
    }),
  );
  await page
    .getByRole('toolbar', { name: 'Selected object actions' })
    .getByRole('button', { name: 'Formatting', exact: true })
    .click();
  const dock = page.getByRole('complementary', { name: 'Object formatting', exact: true });
  const fields = [
    ['Bounds width', '617', 'width', 617],
    ['Bounds height', '383', 'height', 383],
    ['Text size', '101', 'fontSize', 101],
    ['Opacity (%)', '55', 'appearance.opacity', 0.55],
  ] as const;
  for (const [label, value, path, expected] of fields) {
    await dock
      .getByRole('tab', { name: label.startsWith('Bounds') ? 'Layout' : 'Edit', exact: true })
      .click();
    const sections = label.startsWith('Opacity')
      ? ['Opacity']
      : label.startsWith('Text outline')
        ? ['Text outline']
        : label.startsWith('Shadow')
          ? ['Shadow', 'Shadow details']
          : [];
    for (const title of sections) {
      const summary = dock.locator('summary').filter({ hasText: new RegExp(`^${title}$`) });
      if ((await summary.locator('..').getAttribute('open')) === null) await summary.click();
    }
    const field = dock.getByLabel(label, { exact: true });
    await field.fill(value);
    await field.press('Enter');
    await expect
      .poll(() =>
        handle.evaluate(
          ({ adapter }, path) =>
            path
              .split('.')
              .reduce<unknown>(
                (value, key) => (value as Record<string, unknown>)[key],
                adapter.history.document.items[0],
              ),
          path,
        ),
      )
      .toBe(expected);
    await field.press('Tab');
  }
  await dock.getByRole('tab', { name: 'Edit', exact: true }).click();
  const size = dock.getByLabel('Text size', { exact: true });
  await size.fill('120');
  await size.press('ArrowUp');
  await expect
    .poll(() =>
      handle.evaluate(({ stage }) =>
        stage
          .find('Text')
          .filter((node) => 'text' in node && (node as Konva.Text).text() === 'Live formatting')
          .map((node) => (node as Konva.Text).fontSize()),
      ),
    )
    .toContain(121);
  await size.press('Escape');
  await expect
    .poll(() => handle.evaluate(({ adapter }) => adapter.history.document.items[0].fontSize))
    .toBe(101);
  await dock.getByRole('tab', { name: 'Layout', exact: true }).click();
  const width = dock.getByLabel('Bounds width', { exact: true });
  await width.fill('700');
  await width.press('ArrowUp');
  await width.press('Tab');
  await handle.evaluate(({ adapter }) => adapter.undo());
  await expect
    .poll(() => handle.evaluate(({ adapter }) => adapter.history.document.items[0].width))
    .toBe(617);
});
