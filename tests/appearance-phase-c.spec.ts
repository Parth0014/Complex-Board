import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const multipage = JSON.parse(readFileSync('tests/fixtures/appearance-multipage-v2.json', 'utf8'));
import {
  createAppearanceBoard,
  runtime,
  frames,
  downloadBackup,
  pixelDifference,
  boardScreenBounds,
} from './appearance-helpers';

test.use({ viewport: { width: 1440, height: 1000 } });

test('expanded legacy appearance has exact canvas pixels and PNG export parity', async ({
  page,
}, info) => {
  await createAppearanceBoard(page);
  await page.getByLabel('Editable vision board', { exact: true }).focus();
  await page.keyboard.press('Escape');
  await frames(page);
  const screen = await page.screenshot();
  expect(
    await pixelDifference(
      page,
      readFileSync('exports/appearance-legacy/phase-c-canvas.png'),
      screen,
      await boardScreenBounds(page, 1600, 1400),
    ),
  ).toEqual({ count: 0, max: 0 });
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const png = readFileSync((await (await pending).path())!);
  await info.attach('canonical-expanded.png', { body: png, contentType: 'image/png' });
  expect(png.equals(readFileSync('exports/appearance-legacy/phase-c.png'))).toBe(true);
});

test('existing formatting controls edit canonical state, refresh canvas, undo and survive reopening', async ({
  page,
}) => {
  await createAppearanceBoard(page);
  const r = await runtime(page);
  await r.evaluate(({ adapter }) => adapter.select(['solid']));
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Object formatting', exact: true });
  await panel.getByRole('button', { name: 'Item gradient', exact: true }).click();
  await page.getByLabel('Item gradient hex', { exact: true }).fill('#1122ee');
  await page.getByRole('button', { name: 'Close color picker', exact: true }).click();
  await panel.getByLabel('Item gradient type', { exact: true }).selectOption('radial');
  await panel.getByLabel('Border width', { exact: true }).fill('11');
  await panel.getByLabel('Border width', { exact: true }).press('Enter');
  await panel.getByLabel('Stroke style', { exact: true }).selectOption('dotted');
  await panel.getByLabel('Shadow preset', { exact: true }).selectOption('hard');
  await panel.getByText('Shadow details', { exact: true }).click();
  await panel.getByLabel('Shadow blur', { exact: true }).fill('17');
  await panel.getByLabel('Shadow blur', { exact: true }).press('Enter');
  await panel.getByLabel('Opacity (%)', { exact: true }).fill('55');
  await panel.getByLabel('Opacity (%)', { exact: true }).press('Enter');
  await panel.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await frames(page);
  expect(
    await r.evaluate(({ stage }) => {
      const group = stage.findOne('#solid')!;
      const node = group.find('Rect').at(-1)!;
      return {
        opacity: group.opacity(),
        fill: node.getAttr('fillPriority'),
        stroke: node.getAttr('strokeWidth'),
        dash: node.getAttr('dash'),
        blur: node.getAttr('shadowBlur'),
      };
    }),
  ).toEqual({ opacity: 0.55, fill: 'radial-gradient', stroke: 11, dash: [2, 6], blur: 17 });
  const saved = await downloadBackup(page);
  expect(saved.version).toBe(3);
  expect(saved.items[0].appearance).toMatchObject({
    opacity: 0.55,
    stroke: { width: 11, style: 'dotted' },
    shadow: { enabled: true, blur: 17 },
    fill: { paint: { kind: 'radial', stops: ['#ff6600', '#1122ee'] } },
  });
  await r.evaluate(({ adapter }) => {
    adapter.select(['rich']);
    adapter.select(['solid']);
    adapter.undo();
  });
  expect((await downloadBackup(page)).items[0].appearance?.opacity).toBe(1);
  await r.evaluate(({ adapter }) => adapter.redo());
  await r.evaluate(({ adapter }) => adapter.flushSave());
  await page.reload();
  await page.getByLabel('Editable vision board', { exact: true }).waitFor();
  expect((await downloadBackup(page)).items).toEqual(saved.items);
});

test('rich character colors and explicit false formatting override object gradients in real rendered nodes', async ({
  page,
}) => {
  await createAppearanceBoard(page);
  const r = await runtime(page);
  await r.evaluate(({ adapter }) => {
    adapter.select(['rich']);
    adapter.patchItems([
      {
        id: 'rich',
        patch: {
          bold: true,
          textRuns: [{ start: 5, end: 8, color: '#116633', bold: false, italic: false }],
        },
      },
    ]);
    adapter.changeAppearance({
      property: 'fill',
      value: { enabled: true, paint: { kind: 'linear', stops: ['#116633', '#eecc44'] } },
    });
  });
  await frames(page);
  const nodes = await r.evaluate(({ stage }) =>
    stage
      .findOne('#rich')!
      .find('Text')
      .map((node) => ({
        text: node.getAttr('text'),
        priority: node.getAttr('fillPriority'),
        color: node.getAttr('fill'),
        style: node.getAttr('fontStyle'),
      })),
  );
  const red = nodes.find((node) => node.text === 'red')!;
  expect(red).toMatchObject({ priority: 'color', color: '#116633', style: '400 ' });
  expect(nodes.find((node) => node.text === 'Rich')!.priority).toBe('linear-gradient');
  const backup = await downloadBackup(page);
  const rich = backup.items.find((item) => item.id === 'rich')!;
  expect(rich.textRuns).toEqual([
    { start: 5, end: 8, color: '#116633', bold: false, italic: false },
  ]);
  await r.evaluate(({ adapter }) => {
    adapter.copyStyle();
    adapter.select(['text']);
    adapter.pasteStyle();
    adapter.select(['rich']);
    adapter.setAppearanceField('fill.color', '#aabbcc');
  });
  expect((await downloadBackup(page)).items.find((item) => item.id === 'rich')!.textRuns).toEqual(
    rich.textRuns,
  );
});

test('drawings and open shapes use stroke controls and canonical document serialization', async ({
  page,
}) => {
  await createAppearanceBoard(page);
  const r = await runtime(page);
  await r.evaluate(({ adapter }) => adapter.select(['drawing']));
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Object formatting', exact: true });
  await panel.getByText('Pen', { exact: true }).click();
  await panel.getByLabel('Pen width', { exact: true }).fill('23');
  await panel.getByLabel('Pen width', { exact: true }).press('Enter');
  await expect(panel.getByLabel('Border width', { exact: true })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await frames(page);
  expect(
    await r.evaluate(({ stage }) =>
      stage.findOne('#drawing')!.findOne('Line')!.getAttr('strokeWidth'),
    ),
  ).toBe(23);
  await r.evaluate(({ adapter }) => {
    adapter.select(['line']);
    adapter.setAppearanceField('stroke.width', 12);
    adapter.setAppearanceField('stroke.color', '#ff0000');
  });
  await frames(page);
  expect(
    await r.evaluate(({ stage }) => stage.findOne('#line')!.findOne('Line')!.getAttr('stroke')),
  ).toBe('#ff0000');
  const doc = await downloadBackup(page);
  expect(doc.items.find((item) => item.id === 'drawing')!.appearance).toMatchObject({
    kind: 'drawing',
    stroke: { width: 23 },
  });
  for (const item of doc.items)
    if (item.kind !== 'asset')
      expect(Object.keys(item)).not.toEqual(
        expect.arrayContaining(['color', 'opacity', 'borderWidth']),
      );
});

test('new-format backup restore and canonical clipboard preserve editable objects and exports', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await createAppearanceBoard(page);
  const r = await runtime(page);
  const original = await downloadBackup(page);
  await r.evaluate(({ adapter }) => {
    adapter.select(['solid', 'rich']);
    adapter.copySelection();
    adapter.duplicateSelection();
    adapter.undo();
  });
  await r.evaluate(async ({ adapter }) => {
    await adapter.restore(JSON.stringify(adapter.history.document));
    adapter.select(['solid']);
    await adapter.copyToSystem();
    await adapter.pasteFromSystem();
  });
  const doc = await downloadBackup(page);
  expect(doc.version).toBe(3);
  expect(doc.items.length).toBe(original.items.length + 1);
  const pasted = doc.items.find((item) => !original.items.some((entry) => entry.id === item.id))!;
  expect(pasted.appearance).toEqual(original.items[0].appearance);
  await r.evaluate(({ adapter }) => adapter.undo());
  expect((await downloadBackup(page)).items).toEqual(original.items);
  await r.evaluate(({ adapter }) => adapter.flushSave());
  await page.reload();
  await page.getByLabel('Editable vision board', { exact: true }).waitFor();
  expect((await downloadBackup(page)).items).toEqual(original.items);
});

test('legacy first save preserves an original recovery snapshot and v3 reload remains idempotent', async ({
  page,
}) => {
  await page.goto('/');
  const original = JSON.parse(readFileSync('tests/fixtures/appearance-phase-c-v2.json', 'utf8'));
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gratitude-studio-v1', 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('boards', 'readwrite');
      tx.objectStore('boards').put(value, 'legacy-recovery-test');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, original);
  await page.goto('/?board=legacy-recovery-test');
  await page.getByLabel('Editable vision board', { exact: true }).waitFor();
  const r = await runtime(page);
  await r.evaluate(async ({ adapter }) => {
    adapter.select(['solid']);
    adapter.setAppearanceField('stroke.width', 6);
    await adapter.flushSave();
  });
  const recovery = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('gratitude-studio-v1', 2);
      r.onsuccess = () => resolve(r.result);
    });
    const data = await new Promise((resolve) => {
      const r = db
        .transaction('boards', 'readonly')
        .objectStore('boards')
        .get('appearance-recovery:v2:legacy-recovery-test');
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return data;
  });
  expect(recovery).toEqual(original);
  const saved = await downloadBackup(page);
  await page.reload();
  await page.getByLabel('Editable vision board', { exact: true }).waitFor();
  expect((await downloadBackup(page)).items).toEqual(saved.items);
});

test('multipage documents preserve exact page renders and actual all-pages PDF export', async ({
  page,
}, info) => {
  await page.goto('/');
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open('gratitude-studio-v1', 2);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('boards', 'readwrite');
      tx.objectStore('boards').put(value, 'multipage-parity');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, multipage);
  await page.goto('/?board=multipage-parity');
  await page.getByLabel('Editable vision board', { exact: true }).waitFor();
  const r = await runtime(page);
  let pending = page.waitForEvent('download');
  await r.evaluate(({ adapter }) => adapter.exportFormat('pdf-all'));
  const pdf = readFileSync((await (await pending).path())!);
  await info.attach('canonical-multipage.pdf', { body: pdf, contentType: 'application/pdf' });
  expect(pdf.equals(readFileSync('exports/appearance-legacy/multipage.pdf'))).toBe(true);
  for (const id of ['first', 'second']) {
    await r.evaluate(({ adapter }, id) => adapter.switchPage(id), id);
    await frames(page);
    expect(
      await pixelDifference(
        page,
        readFileSync(`exports/appearance-legacy/multipage-${id}-canvas.png`),
        await page.screenshot(),
        await boardScreenBounds(page, 1080, 1080),
      ),
    ).toEqual({ count: 0, max: 0 });
    pending = page.waitForEvent('download');
    await r.evaluate(({ adapter }) => adapter.exportImage());
    expect(
      readFileSync((await (await pending).path())!).equals(
        readFileSync(`exports/appearance-legacy/multipage-${id}.png`),
      ),
    ).toBe(true);
  }
});

test('curated assets remain outside canonical appearance updates', async ({ page }) => {
  await createAppearanceBoard(page);
  await page.locator('.elements-card').first().click();
  const r = await runtime(page);
  const before = await r.evaluate(({ adapter }) => structuredClone(adapter.history.document));
  await r.evaluate(({ adapter }) => {
    adapter.changeAppearance({ property: 'stroke', value: { width: 30, color: '#ff0000' } });
    adapter.changeAppearance({ property: 'effect', value: 'glow' });
    adapter.setAppearanceField('fill.color', '#000000');
  });
  expect(await r.evaluate(({ adapter }) => adapter.history.document)).toEqual(before);
  const item = before.items.find((item) => item.kind === 'asset')!;
  expect(item.asset?.provider).toBe('curated-v1');
  expect(item.appearance).toBeUndefined();
});
