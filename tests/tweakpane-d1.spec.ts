import { test, expect, type Page } from '@playwright/test';
import {
  createAppearanceBoard,
  runtime,
  frames,
  downloadBackup,
  pixelDifference,
} from './appearance-helpers';

test.use({
  baseURL: process.env.TWEAKPANE_D1_URL || 'http://127.0.0.1:4180',
  viewport: { width: 1440, height: 1000 },
});
test.skip(!process.env.TWEAKPANE_D1_URL, 'Run against a VITE_TWEAKPANE_D1=1 server.');

async function open(page: Page, id = 'solid') {
  await createAppearanceBoard(page);
  const closeLibrary = page.getByRole('button', { name: 'Close panel', exact: true });
  if (await closeLibrary.isVisible()) await closeLibrary.click();
  await frames(page);
  const handle = await runtime(page);
  const point = await handle.evaluate(({ stage }, id) => {
    const bounds = stage.findOne('#' + id)!.getClientRect({ relativeTo: stage });
    const surface = stage.container().getBoundingClientRect();
    return {
      x: surface.left + bounds.x + bounds.width / 2,
      y: surface.top + bounds.y + bounds.height / 2,
    };
  }, id);
  await page.mouse.click(point.x, point.y);
  await expect.poll(() => handle.evaluate(({ adapter }) => adapter.selectedIds)).toEqual([id]);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Quick Shape inspector' })).toBeVisible();
  return handle;
}
async function number(page: Page, name: string, value: number) {
  const input = page.getByLabel(name, { exact: true });
  await input.fill(String(value));
  await input.press('Enter');
  await input.blur();
}
async function color(page: Page, name: string, value: string) {
  const input = page.getByLabel(name, { exact: true });
  await input.fill(value);
  await input.press('Enter');
  await input.blur();
}

test('real pane edits solid fill, border and opacity through canonical state and live Konva', async ({
  page,
}) => {
  const h = await open(page);
  await expect(page.getByLabel('Shape solid fill', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Object opacity', { exact: true })).toHaveCount(0);
  await color(page, 'Fill color', '#123456');
  await color(page, 'Border color', '#abcdef');
  await number(page, 'Border width', 12);
  await page.getByLabel('Border style', { exact: true }).selectOption({ label: 'Dotted' });
  await number(page, 'Opacity (%)', 60);
  await expect
    .poll(() =>
      h.evaluate(({ adapter }) => adapter.history.document.items.find((i) => i.id === 'solid')),
    )
    .toMatchObject({
      appearance: {
        opacity: 0.6,
        fill: { paint: { kind: 'solid', color: '#123456' } },
        stroke: { color: '#abcdef', width: 12, style: 'dotted' },
      },
    });
  const nodes = await h.evaluate(({ stage }) => {
    const group = stage.findOne('#solid')!;
    const node = group.find('Rect').at(-1)!;
    return {
      opacity: group.opacity(),
      fill: node.fill(),
      stroke: node.stroke(),
      width: node.strokeWidth(),
      dash: node.dash(),
    };
  });
  expect(nodes).toMatchObject({ opacity: 0.6, fill: '#123456', stroke: '#abcdef', width: 12 });
  await page.screenshot({ path: 'exports/tweakpane-d1/inspector-desktop.png' });
});

test('two-color gradients, fill enablement, shadows and supported effects have observable rendering', async ({
  page,
}) => {
  const h = await open(page);
  await page.getByLabel('Fill type', { exact: true }).selectOption({ label: 'Linear' });
  await color(page, 'Fill color', '#112233');
  await color(page, 'Second color', '#445566');
  await page.getByLabel('Fill type', { exact: true }).selectOption({ label: 'Radial' });
  await expect
    .poll(() =>
      h.evaluate(({ stage }) =>
        stage.findOne('#solid')!.find('Rect').at(-1)!.getAttr('fillPriority'),
      ),
    )
    .toBe('radial-gradient');
  await page.getByLabel('Enable fill', { exact: true }).uncheck();
  await expect(page.getByLabel('Fill color', { exact: true })).toBeDisabled();
  await page.getByLabel('Enable fill', { exact: true }).check();
  await page.getByRole('button', { name: 'Shadow', exact: true }).click();
  await page.getByLabel('Enable shadow', { exact: true }).check();
  await color(page, 'Shadow color', '#102030');
  await number(page, 'Shadow opacity (%)', 35);
  await number(page, 'Shadow blur', 15);
  await number(page, 'Shadow X', -4);
  await number(page, 'Shadow Y', 9);
  await expect
    .poll(() => h.evaluate(({ stage }) => stage.findOne('#solid')!.find('Rect').at(-1)!.getAttrs()))
    .toMatchObject({
      fillRadialGradientColorStops: [0, '#112233', 1, '#445566'],
      shadowEnabled: true,
      shadowColor: '#102030',
      shadowOpacity: 0.35,
      shadowBlur: 15,
      shadowOffsetX: -4,
      shadowOffsetY: 9,
    });
  await page.getByLabel('Effect', { exact: true }).selectOption({ label: 'Glow' });
  await expect(page.getByLabel('Shadow opacity (%)', { exact: true })).toHaveValue('80');
  await page.getByLabel('Effect', { exact: true }).selectOption({ label: 'Outline' });
  await expect
    .poll(() =>
      h.evaluate(({ adapter }) => adapter.history.document.items.find((i) => i.id === 'solid')),
    )
    .toMatchObject({ appearance: { effect: 'outline', shadow: { enabled: false } } });
});

test('slider and color drags each coalesce; keyboard undo/redo refreshes the visible pane', async ({
  page,
}) => {
  const h = await open(page);
  const before = await h.evaluate(({ adapter }) => adapter.history.document);
  const slider = page.getByRole('slider', { name: 'Opacity (%) slider', exact: true });
  const box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + 5, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => h.evaluate(({ adapter }) => adapter.history.gestureActive)).toBe(false);
  const after = await h.evaluate(({ adapter }) => adapter.history.document);
  expect(after).not.toEqual(before);
  await slider.press('Control+z');
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(before);
  await expect(page.getByLabel('Opacity (%)', { exact: true })).toHaveValue('100');
  await slider.press('Control+Shift+z');
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(after);
  await page.getByRole('button', { name: 'Fill color picker', exact: true }).click();
  const palette = page.locator('[data-appearance-control="fillColor"] .tp-svpv');
  const paletteBox = (await palette.boundingBox())!;
  const colorBefore = await h.evaluate(({ adapter }) => adapter.history.document);
  await page.mouse.move(paletteBox.x + 3, paletteBox.y + 3);
  await page.mouse.down();
  await page.mouse.move(
    paletteBox.x + paletteBox.width * 0.8,
    paletteBox.y + paletteBox.height * 0.6,
    { steps: 12 },
  );
  await page.mouse.up();
  await expect.poll(() => h.evaluate(({ adapter }) => adapter.history.gestureActive)).toBe(false);
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).not.toEqual(colorBefore);
  await h.evaluate(({ adapter }) => adapter.undo());
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(colorBefore);
});

test('selection switching, duplicate, lock and deletion never let an old binding edit another target', async ({
  page,
}) => {
  const h = await open(page);
  await color(page, 'Fill color', '#223344');
  await h.evaluate(({ adapter }) => adapter.select(['linear']));
  await expect(page.getByLabel('Fill color', { exact: true })).toHaveValue('#3366ff');
  await number(page, 'Border width', 9);
  await h.evaluate(({ adapter }) => adapter.select(['solid']));
  await expect(page.getByLabel('Fill color', { exact: true })).toHaveValue('#223344');
  await expect(page.getByLabel('Border width', { exact: true })).toHaveValue('8.0');
  await h.evaluate(({ adapter }) => adapter.duplicateSelection());
  const duplicate = await h.evaluate(({ adapter }) => adapter.selectedIds[0]);
  await number(page, 'Border width', 17);
  expect(
    await h.evaluate(({ adapter }) => adapter.history.document.items.find((i) => i.id === 'solid')),
  ).toMatchObject({ appearance: { stroke: { width: 8 } } });
  expect(
    await h.evaluate(
      ({ adapter }, id) => adapter.history.document.items.find((i) => i.id === id),
      duplicate,
    ),
  ).toMatchObject({ appearance: { stroke: { width: 17 } } });
  await h.evaluate(
    ({ adapter }, id) => adapter.patchItems([{ id, patch: { locked: true } }]),
    duplicate,
  );
  await expect(page.getByLabel('Border width', { exact: true })).toBeDisabled();
  await h.evaluate(
    ({ adapter }, id) => adapter.patchItems([{ id, patch: { locked: false } }]),
    duplicate,
  );
  await expect(page.getByLabel('Border width', { exact: true })).toBeEnabled();
  await h.evaluate(({ adapter }, id) => adapter.delete([id]), duplicate);
  await expect(page.getByRole('region', { name: 'Quick Shape inspector' })).toHaveCount(0);
  expect(await h.evaluate(({ adapter }) => adapter.history.gestureActive)).toBe(false);
  for (const id of ['text', 'drawing', 'line']) {
    await h.evaluate(({ adapter }, id) => adapter.select([id]), id);
    await expect(page.getByRole('region', { name: 'Quick Shape inspector' })).toHaveCount(0);
  }
});

test('Escape cancels an active drag, pointer cancellation and close finalize safely', async ({
  page,
}) => {
  const h = await open(page);
  const before = await h.evaluate(({ adapter }) => adapter.history.document);
  const slider = page.getByRole('slider', { name: 'Border width slider', exact: true });
  const box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(before);
  expect(await h.evaluate(({ adapter }) => adapter.history.gestureActive)).toBe(false);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.mouse.down();
  await slider.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
  expect(await h.evaluate(({ adapter }) => adapter.history.gestureActive)).toBe(false);
  await page.mouse.up();
  const canceled = await h.evaluate(({ adapter }) => adapter.history.document);
  await page.getByRole('button', { name: 'Close shape inspector', exact: true }).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(canceled);
  await expect(page.locator('.gs-tweakpane .tp-rotv')).toHaveCount(1);
});

test('keyboard increments are precise and external undo updates bindings without reopening', async ({
  page,
}) => {
  const h = await open(page);
  const slider = page.getByRole('slider', { name: 'Border width slider', exact: true });
  await slider.focus();
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  const edited = await h.evaluate(({ adapter }) => adapter.history.document);
  expect(edited.items.find((i) => i.id === 'solid')).toMatchObject({
    appearance: { stroke: { width: 9 } },
  });
  await h.evaluate(({ adapter }) => adapter.undo());
  await expect(page.getByLabel('Border width', { exact: true })).toHaveValue('8.0');
  await h.evaluate(({ adapter }) => adapter.redo());
  await expect(page.getByLabel('Border width', { exact: true })).toHaveValue('9.0');
  await page.getByLabel('Border width', { exact: true }).fill('invalid');
  await page.getByLabel('Border width', { exact: true }).press('Enter');
  expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(edited);
});

test('save/reload and PNG export preserve the exact canvas artwork after inspector edits', async ({
  page,
}) => {
  const h = await open(page);
  await page.getByLabel('Fill type', { exact: true }).selectOption({ label: 'Radial' });
  await color(page, 'Fill color', '#112244');
  await color(page, 'Second color', '#aabbdd');
  await number(page, 'Border width', 6);
  await number(page, 'Opacity (%)', 80);
  await page.getByRole('button', { name: 'Close shape inspector', exact: true }).click();
  const saved = await downloadBackup(page);
  expect(saved.version).toBe(3);
  await h.evaluate(({ adapter }) => {
    adapter.select([]);
    return adapter.flushSave();
  });
  await frames(page);
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
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const { readFileSync } = await import('node:fs');
  const exported = readFileSync((await (await pending).path())!);
  expect(await pixelDifference(page, Buffer.from(live.split(',')[1], 'base64'), exported)).toEqual({
    count: 0,
    max: 0,
  });
  await page.reload();
  await page.getByLabel('Editable vision board', { exact: true }).waitFor();
  expect((await downloadBackup(page)).items).toEqual(saved.items);
  const reloaded = await runtime(page);
  await reloaded.evaluate(({ adapter }) => adapter.select(['solid']));
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await expect(page.getByLabel('Second color', { exact: true })).toHaveValue('#aabbdd');
});

test('curated Elements and uploaded images never receive a Tweakpane inspector', async ({
  page,
}) => {
  const h = await open(page);
  await page.getByRole('button', { name: 'Close shape inspector', exact: true }).click();
  await page.getByRole('button', { name: 'Elements', exact: true }).click();
  await page.getByRole('button', { name: 'Soon Soon', exact: true }).click();
  const curated = await h.evaluate(({ adapter }) =>
    adapter.history.document.items.find((i) => adapter.selectedIds.includes(i.id)),
  );
  expect(curated?.kind).toBe('asset');
  await page.getByRole('button', { name: 'Image effects', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Quick Shape inspector' })).toHaveCount(0);
  expect(
    await h.evaluate(
      ({ adapter }, id) => adapter.history.document.items.find((i) => i.id === id),
      curated!.id,
    ),
  ).toEqual(curated);
  await page.getByRole('button', { name: 'Uploads', exact: true }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#c65533';
    context.fillRect(0, 0, 32, 32);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Upload photos', { exact: true }).setInputFiles({
    name: 'd1-photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });
  await expect(page.getByText('1 photo added.', { exact: true })).toBeVisible();
  const photo = await h.evaluate(({ adapter }) =>
    adapter.history.document.items.find((i) => adapter.selectedIds.includes(i.id)),
  );
  expect(photo?.kind).toBe('asset');
  await expect(page.getByRole('region', { name: 'Quick Shape inspector' })).toHaveCount(0);
  expect(
    await h.evaluate(
      ({ adapter }, id) => adapter.history.document.items.find((i) => i.id === id),
      photo!.id,
    ),
  ).toEqual(photo);
});

test('real React Strict Mode replay and unmount during a slider drag dispose subscriptions and vendor drag listeners', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/tweakpane-lifecycle.html');
  await expect(page.locator('.gs-tweakpane .tp-rotv')).toHaveCount(1);
  const state = () =>
    page.evaluate(() => {
      const h = (
        window as unknown as {
          d1Harness: {
            adapter: {
              history: { gestureActive: boolean; document: { items: unknown[] }; canUndo: boolean };
            };
            stats: { created: number; disposed: number };
          };
        }
      ).d1Harness;
      return {
        ...h.stats,
        active: h.adapter.history.gestureActive,
        items: h.adapter.history.document.items,
      };
    });
  expect(await state()).toMatchObject({ created: 2, disposed: 1, active: false });
  const slider = page.getByRole('slider', { name: 'Border width slider', exact: true });
  const box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
  await page.mouse.down();
  expect((await state()).active).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { d1Harness: { unmount(): void } }).d1Harness.unmount(),
  );
  expect(await state()).toMatchObject({ created: 2, disposed: 2, active: false });
  const unmounted = (await state()).items;
  expect(
    await page.evaluate(() =>
      (window as unknown as { d1Harness: { listeners(): number } }).d1Harness.listeners(),
    ),
  ).toBe(0);
  await page.mouse.move(900, 700);
  await page.mouse.up();
  expect((await state()).items).toEqual(unmounted);
  await expect(page.locator('.tp-rotv')).toHaveCount(0);
});

test.describe('mobile touch inspector', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('touch edits coalesce, controls stay within the viewport and expanded inline colors scroll without clipping', async ({
    page,
  }) => {
    const h = await open(page);
    const before = await h.evaluate(({ adapter }) => adapter.history.document);
    const slider = page.getByRole('slider', { name: 'Border width slider', exact: true });
    const box = (await slider.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, x: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y: box.y + box.height / 2, id: 1 }],
      });
    await touch('touchStart', box.x + 5);
    for (const fraction of [0.2, 0.4, 0.6, 0.8])
      await touch('touchMove', box.x + box.width * fraction);
    await touch('touchEnd', 0);
    await expect.poll(() => h.evaluate(({ adapter }) => adapter.history.gestureActive)).toBe(false);
    expect(await h.evaluate(({ adapter }) => adapter.history.document)).not.toEqual(before);
    await h.evaluate(({ adapter }) => adapter.undo());
    expect(await h.evaluate(({ adapter }) => adapter.history.document)).toEqual(before);
    await page.getByRole('button', { name: 'Fill color picker', exact: true }).tap();
    await expect(page.locator('[data-appearance-control="fillColor"] .tp-svpv')).toBeVisible();
    await page.getByRole('button', { name: 'Shadow', exact: true }).tap();
    const panel = page.getByRole('dialog', { name: 'Shape appearance', exact: true });
    const panelBox = (await panel.boundingBox())!;
    expect(panelBox.x).toBeGreaterThanOrEqual(8);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(382);
    expect(panelBox.y).toBeGreaterThanOrEqual(8);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(836);
    expect(
      await page
        .locator('.gs-shape-inspector__body')
        .evaluate((e) => e.scrollHeight > e.clientHeight),
    ).toBe(true);
    await page.getByLabel('Enable shadow', { exact: true }).tap();
    await page.getByLabel('Shadow Y', { exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByLabel('Shadow Y', { exact: true })).toBeInViewport();
    await page.screenshot({ path: 'exports/tweakpane-d1/inspector-mobile.png' });
    await cdp.detach();
  });
});
