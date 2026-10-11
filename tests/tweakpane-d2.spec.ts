import { test, expect, type Page } from '@playwright/test';
import {
  createAppearanceBoard,
  runtime,
  frames,
  downloadBackup,
  pixelDifference,
} from './appearance-helpers';
import { readFileSync } from 'node:fs';
const multipage = JSON.parse(readFileSync('tests/fixtures/appearance-multipage-v2.json', 'utf8'));

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
  await expect(page.locator('[aria-label="Appearance inspector"]')).toBeVisible();
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

test('continuous gestures cancel coalesce and reject vendor events after switching or closing', async ({
  page,
}) => {
  const h = await open(page, 'drawing');
  const before = await h.evaluate(({ adapter }) => adapter.history.document);
  let slider = page.getByRole('slider', { name: 'Opacity (%) slider', exact: true });
  let box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + 3, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 14 });
  await page.mouse.up();
  await expect.poll(() => h.evaluate(({ adapter }) => adapter.history.gestureActive)).toBe(false);
  const changed = await h.evaluate(({ adapter }) => adapter.history.document);
  expect(changed).not.toEqual(before);
  await slider.press('Control+z');
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(before);
  await slider.press('Control+Shift+z');
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(changed);
  await page.getByRole('button', { name: 'Stroke color picker', exact: true }).click();
  const palette = page.locator('[data-appearance-control="stroke.color"] .tp-svpv');
  box = (await palette.boundingBox())!;
  const beforeColor = await h.evaluate(({ adapter }) => adapter.history.document);
  await page.mouse.move(box.x + 3, box.y + 3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.6, { steps: 12 });
  await page.mouse.up();
  await h.evaluate(({ adapter }) => adapter.undo());
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(beforeColor);
  slider = page.getByRole('slider', { name: 'Opacity (%) slider', exact: true });
  box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
  await page.mouse.down();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(beforeColor);
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
  await page.mouse.down();
  await h.evaluate(({ adapter }) => adapter.select(['text']));
  const switched = await h.evaluate(({ adapter }) => adapter.history.document);
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.mouse.up();
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(switched);
  expect(await h.evaluate(({ adapter }) => adapter.history.gestureActive)).toBe(false);
  await page.getByRole('button', { name: 'Close appearance inspector', exact: true }).click();
  await expect(page.locator('[aria-label="Appearance inspector"]')).toHaveCount(0);
});

test('style paste duplicate locking deletion backups reload and PNG keep one canonical appearance', async ({
  page,
}) => {
  const h = await open(page);
  await page.getByRole('button', { name: 'Radial', exact: true }).click();
  await color(page, 'Second color', '#aabbdd');
  await page.getByRole('tab', { name: 'Border', exact: true }).click();
  await number(page, 'Border width', 7.5);
  const original = await h.evaluate(({ adapter }) =>
    adapter.history.document.items.find((i) => i.id === 'solid')!,
  );
  await h.evaluate(({ adapter }) => {
    adapter.copyStyle();
    adapter.select(['linear']);
    adapter.pasteStyle();
  });
  const pasted = await h.evaluate(({ adapter }) =>
    adapter.history.document.items.find((i) => i.id === 'linear')!,
  );
  expect(pasted.appearance).toEqual(original.appearance);
  await expect(page.getByRole('textbox', { name: 'Second color', exact: true })).toHaveValue(
    '#aabbdd',
  );
  await h.evaluate(({ adapter }) => adapter.duplicateSelection());
  const duplicate = await h.evaluate(({ adapter }) => adapter.selectedIds[0]);
  await page.getByRole('tab', { name: 'Border', exact: true }).click();
  await number(page, 'Border width', 12);
  expect(
    await h.evaluate(
      ({ adapter }) =>
        adapter.history.document.items.find((i) => i.id === 'linear')!.appearance?.stroke.width,
    ),
  ).toBe(7.5);
  await h.evaluate(
    ({ adapter }, id) => adapter.patchItems([{ id, patch: { locked: true } }]),
    duplicate,
  );
  await expect(page.getByLabel('Border width', { exact: true })).toBeDisabled();
  await h.evaluate(({ adapter }, id) => {
    adapter.patchItems([{ id, patch: { locked: false } }]);
    adapter.delete([id]);
  }, duplicate);
  await expect(page.locator('[aria-label="Appearance inspector"]')).toHaveCount(0);
  await h.evaluate(({ adapter }) => adapter.select(['solid']));
  await page.getByRole('button', { name: 'Close appearance inspector', exact: true }).click();
  const saved = await downloadBackup(page);
  expect(saved.version).toBe(3);
  await h.evaluate(({ adapter }) => {
    adapter.select([]);
    return adapter.flushSave();
  });
  const live = await h.evaluate(({ stage, adapter }) => {
    const artwork = stage.findOne('#artboard')!.clone({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
    try {
      return artwork.toDataURL({
        x: 0,
        y: 0,
        width: adapter.history.document.width,
        height: adapter.history.document.height,
        pixelRatio: 1,
      });
    } finally {
      artwork.destroy();
    }
  });
  const pending = page.waitForEvent('download');
  await h.evaluate(({ adapter }) => adapter.exportImage());
  expect(
    await pixelDifference(
      page,
      Buffer.from(live.split(',')[1], 'base64'),
      readFileSync((await (await pending).path())!),
    ),
  ).toEqual({ count: 0, max: 0 });
  await page.reload();
  await page.getByLabel('Editable vision board', { exact: true }).waitFor();
  expect((await downloadBackup(page)).items).toEqual(saved.items);
  await page.getByLabel('File menu', { exact: true }).click();
  await page.getByLabel('Restore backup', { exact: true }).setInputFiles({
    name: 'edited-v3.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  const reloaded = await runtime(page);
  await expect
    .poll(() => reloaded.evaluate(({ adapter }) => adapter.history.document.items))
    .toEqual(saved.items);
});

test('desktop layout captures all categories and expanded effects without canvas reflow', async ({
  page,
}) => {
  const h = await open(page, 'text');
  const canvas = page.getByLabel('Editable vision board', { exact: true });
  const before = await canvas.boundingBox();
  for (const id of ['text', 'solid', 'drawing']) {
    await h.evaluate(({ adapter }, id) => adapter.select([id]), id);
    if (id === 'drawing') await page.getByRole('tab', { name: 'Stroke', exact: true }).click();
    await page.mouse.move(1000, 950);
    await frames(page);
    await page.screenshot({ path: `exports/tweakpane-d2/desktop-${id}.png` });
    expect(await canvas.boundingBox()).toEqual(before);
    const dock = (await page.locator('[aria-label="Appearance inspector"]').boundingBox())!;
    expect(dock.x).toBeGreaterThan(1000);
    expect(dock.x + dock.width).toBeLessThanOrEqual(1440);
  }
  await h.evaluate(({ adapter }) => adapter.select(['solid']));
  await page.getByRole('tab', { name: 'Effects', exact: true }).click();
  await page.getByRole('button', { name: 'Glow', exact: true }).click();
  await page.mouse.move(1000, 950);
  await frames(page);
  await page.screenshot({ path: 'exports/tweakpane-d2/desktop-effects.png' });
});

test('curated Elements and uploaded photos retain their separate controls and unchanged data', async ({
  page,
}) => {
  const h = await open(page);
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByRole('button', { name: 'Soon Soon', exact: true }).click();
  const asset = await h.evaluate(({ adapter }) =>
    adapter.history.document.items.find((i) => adapter.selectedIds.includes(i.id))!,
  );
  expect(asset.kind).toBe('asset');
  await expect(page.locator('[aria-label="Appearance inspector"]')).toHaveCount(0);
  if (!(await page.getByRole('dialog', { name: 'Object formatting', exact: true }).isVisible()))
    await page.getByRole('button', { name: 'Image effects', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Object formatting', exact: true })).toBeVisible();
  expect(
    await h.evaluate(
      ({ adapter }, id) => adapter.history.document.items.find((i) => i.id === id),
      asset.id,
    ),
  ).toEqual(asset);
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    canvas.getContext('2d')!.fillRect(0, 0, 32, 32);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Upload photos', { exact: true }).setInputFiles({
    name: 'hybrid-photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });
  await expect(page.getByText('1 photo added.', { exact: true })).toBeVisible();
  await expect(page.locator('[aria-label="Appearance inspector"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Crop', exact: true })).toBeVisible();
});

test('multipage switching interrupts the inspector and preserves edits on each page', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('gratitude-studio-v1', 2);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('boards', 'readwrite');
      transaction.objectStore('boards').put(value, 'isolated-d2-multipage');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, multipage);
  await page.goto('/?board=isolated-d2-multipage');
  await page.getByLabel('Editable vision board', { exact: true }).waitFor();
  const close = page.getByRole('button', { name: 'Close panel', exact: true });
  if (await close.isVisible()) await close.click();
  const h = await runtime(page);
  await h.evaluate(({ adapter }) => adapter.select(['solid']));
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await number(page, 'Opacity (%)', 65);
  const edited = await h.evaluate(
    ({ adapter }) => adapter.history.document.items.find((i) => i.id === 'solid')!.appearance,
  );
  await h.evaluate(({ adapter }) => adapter.switchPage('second'));
  await expect(page.locator('[aria-label="Appearance inspector"]')).toHaveCount(0);
  expect(await h.evaluate(({ adapter }) => adapter.history.gestureActive)).toBe(false);
  await h.evaluate(({ adapter }) => adapter.switchPage('first'));
  expect(
    await h.evaluate(
      ({ adapter }) => adapter.history.document.items.find((i) => i.id === 'solid')!.appearance,
    ),
  ).toEqual(edited);
  await h.evaluate(({ adapter }) => adapter.select(['solid']));
  await expect(page.getByLabel('Opacity (%)', { exact: true })).toHaveValue('65');
});

test('inspector navigation does not redraw artwork; bounds remain an explicit separate action', async ({
  page,
}) => {
  const h = await open(page, 'text');
  await frames(page);
  const counter = await h.evaluateHandle(({ stage }) => {
    const counter = { draws: 0 };
    stage.find('Layer').forEach((layer) => layer.on('draw.d2-proof', () => counter.draws++));
    return counter;
  });
  await page.getByRole('tab', { name: 'Outline', exact: true }).click();
  await page.getByRole('tab', { name: 'Effects', exact: true }).click();
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  await frames(page);
  expect(await counter.evaluate((counter) => counter.draws)).toBe(0);
  await page.getByText('Object settings', { exact: false }).first().click();
  const size = page.getByLabel('Bounds width', { exact: true });
  const before = await h.evaluate(({ adapter }) => adapter.history.document);
  await size.fill('400');
  await size.press('Escape');
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(before);
  await number(page, 'Bounds width', 320);
  expect(
    await h.evaluate(
      ({ adapter }) => adapter.history.document.items.find((i) => i.id === 'text')!.width,
    ),
  ).toBe(320);
  await h.evaluate(({ adapter }) => adapter.undo());
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(before);
});

test('generalized Text and Drawing panes survive Strict Mode and dispose during a vendor drag', async ({
  page,
}) => {
  test.skip(process.env.TWEAKPANE_D2_PRODUCTION === '1', 'Development-only lifecycle harness.');
  for (const kind of ['text', 'drawing', 'line']) {
    await page.goto(`/tests/fixtures/tweakpane-lifecycle.html?kind=${kind}`);
    await expect(page.locator('.tp-rotv')).toHaveCount(1);
    const h = await page.evaluateHandle(
      () =>
        (
          window as unknown as {
            d1Harness: {
              adapter: { history: { gestureActive: boolean; document: unknown } };
              stats: { created: number; disposed: number };
              listeners(): number;
              unmount(): void;
            };
          }
        ).d1Harness,
    );
    expect(await h.evaluate((h) => h.stats)).toEqual({ created: 2, disposed: 1 });
    const slider = page.getByRole('slider', { name: 'Opacity (%) slider', exact: true });
    const box = (await slider.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
    await page.mouse.down();
    expect(await h.evaluate((h) => h.adapter.history.gestureActive)).toBe(true);
    await h.evaluate((h) => h.unmount());
    expect(
      await h.evaluate((h) => ({
        ...h.stats,
        listeners: h.listeners(),
        active: h.adapter.history.gestureActive,
      })),
    ).toEqual({ created: 2, disposed: 2, listeners: 0, active: false });
    const disposed = await h.evaluate((h) => h.adapter.history.document);
    await page.mouse.move(900, 700);
    await page.mouse.up();
    expect(await h.evaluate((h) => h.adapter.history.document)).toEqual(disposed);
  }
});

test('shape frame conversion remains available as the original explicit object action', async ({
  page,
}) => {
  const h = await open(page);
  await page.getByText('Object settings', { exact: false }).first().click();
  const frame = page.getByRole('combobox', { name: 'Convert shape to frame', exact: true });
  await expect.poll(() => frame.locator('option').count()).toBeGreaterThan(1);
  const id = await frame.locator('option').nth(1).getAttribute('value');
  await frame.selectOption(id!);
  await expect
    .poll(() =>
      h.evaluate(
        ({ adapter }) => adapter.history.document.items.find((item) => item.id === 'solid')?.kind,
      ),
    )
    .toBe('asset');
  await expect(page.locator('[aria-label="Appearance inspector"]')).toHaveCount(0);
  expect(await h.evaluate(({ adapter }) => adapter.history.document.version)).toBe(3);
  await h.evaluate(({ adapter }) => adapter.undo());
  await expect(page.locator('[aria-label="Appearance inspector"]')).toBeVisible();
});

for (const [id, width] of [
  ['text', 360],
  ['solid', 390],
  ['drawing', 430],
] as const) {
  test.describe(`mobile ${id}`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    test('sheet touch editing focus and reachable content', async ({ page }) => {
      const h = await open(page, id);
      const sheet = page.getByRole('dialog', { name: 'Appearance inspector', exact: true });
      await expect(sheet).toHaveAttribute('aria-modal', 'true');
      expect(await h.evaluate(({ adapter }) => adapter.selectedIds)).toEqual([id]);
      const before = await h.evaluate(({ adapter }) => adapter.history.document);
      const slider = page.getByRole('slider', { name: 'Opacity (%) slider', exact: true });
      await slider.scrollIntoViewIfNeeded();
      const box = (await slider.boundingBox())!;
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: box.x + 5, y: box.y + box.height / 2 }],
      });
      for (let step = 1; step <= 8; step++)
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: box.x + (box.width * step) / 10, y: box.y + box.height / 2 }],
        });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect
        .poll(() => h.evaluate(({ adapter }) => adapter.history.gestureActive))
        .toBe(false);
      expect(await h.evaluate(({ adapter }) => adapter.history.document)).not.toEqual(before);
      await h.evaluate(({ adapter }) => adapter.undo());
      expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(before);
      const sheetBounds = (await sheet.boundingBox())!;
      expect(sheetBounds.x).toBeGreaterThanOrEqual(0);
      expect(sheetBounds.x + sheetBounds.width).toBeLessThanOrEqual(width);
      expect(sheetBounds.y + sheetBounds.height).toBeLessThanOrEqual(844);
      if (id === 'text') await page.getByRole('tab', { name: 'Text', exact: true }).click();
      if (id === 'drawing') await page.getByRole('tab', { name: 'Stroke', exact: true }).click();
      if (id === 'solid') {
        await page.getByRole('button', { name: 'Fill color picker', exact: true }).click();
        await page
          .locator('[data-appearance-control="fill.color"] .tp-svpv')
          .scrollIntoViewIfNeeded();
      }
      await page.screenshot({ path: `exports/tweakpane-d2/mobile-${id}.png` });
      await page.getByRole('button', { name: 'Close appearance inspector', exact: true }).click();
      await expect(sheet).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Appearance', exact: true })).toBeFocused();
      expect(await h.evaluate(({ adapter }) => adapter.selectedIds)).toEqual([id]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  });
}
