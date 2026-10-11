import { test, expect, type Page } from '@playwright/test';
import { createAppearanceBoard, runtime, frames } from './appearance-helpers';

test.use({
  baseURL: process.env.TWEAKPANE_D2_URL || 'http://127.0.0.1:4182',
  viewport: { width: 1440, height: 1000 },
});
test.skip(!process.env.TWEAKPANE_D2_URL, 'Run against VITE_TWEAKPANE_D2=1.');

async function open(page: Page, id = 'solid') {
  await createAppearanceBoard(page);
  const close = page.getByRole('button', { name: 'Close panel', exact: true });
  if (await close.isVisible()) await close.click();
  const h = await runtime(page);
  await h.evaluate(({ adapter }) => adapter.select(['solid']));
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  if (id !== 'solid') await h.evaluate(({ adapter }, id) => adapter.select([id]), id);
  await expect(page.getByRole('complementary', { name: 'Appearance inspector' })).toBeVisible();
  return h;
}
async function number(page: Page, label: string, value: number) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(String(value));
  await input.press('Enter');
  await input.blur();
}
async function color(page: Page, label: string, value: string) {
  const input = page.getByRole('textbox', { name: label, exact: true });
  await input.fill(value);
  await input.press('Enter');
  await input.blur();
}

test('closed and open shapes share a bounded inspector and canonical bindings', async ({
  page,
}) => {
  const h = await open(page);
  await expect(page.getByRole('dialog', { name: 'Object formatting' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Radial', exact: true }).click();
  await color(page, 'Second color', '#cc6688');
  await page.getByRole('tab', { name: 'Border', exact: true }).click();
  await number(page, 'Border width', 11.5);
  expect(
    await h.evaluate(
      ({ adapter }) =>
        adapter.history.document.items.find((i) => i.id === 'solid')!.appearance?.stroke.width,
    ),
  ).toBe(11.5);
  await h.evaluate(({ adapter }) => adapter.select(['line']));
  await expect(page.getByRole('group', { name: 'Fill type', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Stroke color', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Stroke', exact: true }).click();
  await number(page, 'Stroke width', 6);
  await page.getByLabel('Stroke cap', { exact: true }).selectOption({ label: 'Round' });
  expect(
    await h.evaluate(
      ({ adapter }) =>
        adapter.history.document.items.find((i) => i.id === 'line')!.appearance?.stroke.cap,
    ),
  ).toBe('round');
  await expect(page.getByRole('tab', { name: 'Effects', exact: true })).toHaveCount(0);
  await frames(page);
});

test('text fill outline background and rich character defaults retain canonical semantics', async ({
  page,
}) => {
  const h = await open(page, 'rich');
  await h.evaluate(({ adapter }) =>
    adapter.patchItems([
      {
        id: 'rich',
        patch: {
          bold: true,
          textRuns: [{ start: 5, end: 8, color: '#ff0000', bold: false, italic: false }],
        },
      },
    ]),
  );
  const originalRuns = await h.evaluate(
    ({ adapter }) => adapter.history.document.items.find((i) => i.id === 'rich')!.textRuns,
  );
  await color(page, 'Text fill color', '#aabbcc');
  await page.getByRole('button', { name: 'Linear', exact: true }).click();
  await color(page, 'Second color', '#cc8844');
  await page.getByRole('button', { name: 'Add text background', exact: true }).click();
  await color(page, 'Text background', '#eeeeaa');
  await number(page, 'Opacity (%)', 70);
  await page.getByRole('tab', { name: 'Outline', exact: true }).click();
  await number(page, 'Text outline width', 3.5);
  await color(page, 'Text outline color', '#332244');
  const edited = await h.evaluate(({ adapter }) =>
    adapter.history.document.items.find((i) => i.id === 'rich')!,
  );
  expect(edited.textRuns).toEqual(originalRuns);
  expect(edited.appearance).toMatchObject({
    kind: 'text',
    opacity: 0.7,
    background: '#eeeeaa',
    stroke: { width: 3.5, color: '#332244' },
  });
  const nodes = await h.evaluate(({ stage }) =>
    stage
      .findOne('#rich')!
      .find('Text')
      .map((node) => ({
        text: node.getAttr('text'),
        priority: node.getAttr('fillPriority'),
        fill: node.getAttr('fill'),
      })),
  );
  expect(nodes.some((node) => node.priority === 'linear-gradient')).toBe(true);
  expect(nodes.some((node) => node.fill === '#ff0000' && node.priority === 'color')).toBe(true);
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  await page.getByText('Character formatting', { exact: false }).first().click();
  const content = page.getByLabel('Styled text', { exact: true });
  await content.click();
  await content.press('Control+Home');
  for (let i = 0; i < 4; i++) await content.press('Shift+ArrowRight');
  await page.getByRole('button', { name: 'Bold text range', exact: true }).click();
  expect(
    await h.evaluate(({ adapter }) =>
      adapter.history.document.items
        .find((i) => i.id === 'rich')!
        .textRuns?.some((run) => run.start === 0 && run.end === 4 && run.bold),
    ),
  ).toBe(true);
  await h.evaluate(({ adapter }) => adapter.select(['curved']));
  await page.getByRole('button', { name: 'Radial', exact: true }).click();
  await color(page, 'Second color', '#aabbdd');
  expect(
    await h.evaluate(({ stage }) =>
      stage
        .findOne('#curved')!
        .find('TextPath')
        .some((node) => node.getAttr('fillPriority') === 'radial-gradient'),
    ),
  ).toBe(true);
});

test('drawings use stroke capabilities without modifying brush geometry', async ({ page }) => {
  const h = await open(page, 'drawing');
  const before = await h.evaluate(({ adapter }) =>
    adapter.history.document.items.find((i) => i.id === 'drawing')!,
  );
  await expect(page.getByRole('group', { name: 'Fill type', exact: true })).toHaveCount(0);
  await color(page, 'Stroke color', '#663399');
  await number(page, 'Opacity (%)', 45);
  await page.getByRole('tab', { name: 'Stroke', exact: true }).click();
  await number(page, 'Stroke width', 17.5);
  await page.getByLabel('Stroke cap', { exact: true }).selectOption({ label: 'Square' });
  await page.getByLabel('Stroke join', { exact: true }).selectOption({ label: 'Bevel' });
  const after = await h.evaluate(({ adapter }) =>
    adapter.history.document.items.find((i) => i.id === 'drawing')!,
  );
  expect({ ...after, appearance: before.appearance }).toEqual(before);
  expect(after.appearance).toMatchObject({
    kind: 'drawing',
    opacity: 0.45,
    stroke: { color: '#663399', width: 17.5, cap: 'square', join: 'bevel' },
  });
  expect(
    await h.evaluate(({ stage }) =>
      stage
        .findOne('#drawing')!
        .find('Line')
        .some(
          (node) =>
            node.getAttr('stroke') === '#663399' &&
            node.getAttr('lineCap') === 'square' &&
            node.getAttr('lineJoin') === 'bevel',
        ),
    ),
  ).toBe(true);
  await page.getByRole('tab', { name: 'Effects', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Outline', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Glow', exact: true }).click();
  expect(
    await h.evaluate(
      ({ adapter }) =>
        adapter.history.document.items.find((i) => i.id === 'drawing')!.appearance?.shadow.enabled,
    ),
  ).toBe(true);
  await h.evaluate(({ adapter }) => adapter.undo());
  await expect(page.getByRole('button', { name: 'None', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('quick controls and inspector use one command path; keyboard tabs never move artwork', async ({
  page,
}) => {
  const h = await open(page);
  await page.getByRole('button', { name: 'Close appearance inspector', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Appearance', exact: true })).toBeFocused();
  await page.getByRole('combobox', { name: 'Quick fill type', exact: true }).selectOption('linear');
  await page.getByRole('button', { name: 'Shape fill color', exact: true }).click();
  await page.getByRole('button', { name: 'Shape fill color: #d15b52', exact: true }).click();
  await page.getByRole('button', { name: 'Close quick appearance control', exact: true }).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Fill color', exact: true })).toHaveValue(
    '#d15b52',
  );
  const before = await h.evaluate(({ adapter }) =>
    adapter.history.document.items.find((i) => i.id === 'solid')!,
  );
  await page.getByRole('tab', { name: 'Fill & color', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Border', exact: true })).toBeFocused();
  expect(
    await h.evaluate(({ adapter }) => adapter.history.document.items.find((i) => i.id === 'solid')),
  ).toEqual(before);
  await page.keyboard.press('Control+z');
  expect(
    await h.evaluate(
      ({ adapter }) => adapter.history.document.items.find((i) => i.id === 'solid')!.appearance,
    ),
  ).not.toEqual(before.appearance);
  await page.keyboard.press('Control+Shift+z');
  expect(
    await h.evaluate(
      ({ adapter }) => adapter.history.document.items.find((i) => i.id === 'solid')!.appearance,
    ),
  ).toEqual(before.appearance);
  await h.evaluate(({ adapter }) => adapter.select(['solid', 'text']));
  await expect(page.getByRole('dialog', { name: 'Object formatting', exact: true })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Appearance inspector' })).toHaveCount(0);
});
