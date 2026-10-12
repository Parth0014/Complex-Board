/**
 * ui-craft.spec.ts — Phase G craft gates, locked by automated checks (item 44).
 *
 * Invariants (target state; several are expected to FAIL at the a52d38f
 * baseline — the failures are the G-phase backlog, fixed by G6):
 * - no horizontal overflow at the four viewports, home and editor
 * - rail tab labels never truncate (scrollWidth <= clientWidth)
 * - the floating bottom dock never intersects the canvas scrollbar track
 * - every icon-only button has aria-label and no native title tooltip
 * - the first 25 keyboard Tab stops all show a visible focus ring
 * - reduced motion yields animation-name: none on toast, skeleton and dock
 *
 * Walkthrough: captures the §7 surface x viewport matrix into
 * exports/craft/<phase>/ (gitignored). G0 captures exports/craft/before/.
 *
 * App state is driven through the mounted adapter (tests/appearance-helpers
 * runtime harness); UI clicks are used only where the UI itself is under test
 * (rail tabs, menus, dialogs, file inputs).
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { runtime } from './appearance-helpers';
import { createBoard as setupBoard } from './helpers/board';

const SHOT_DIR = `exports/craft/${process.env.CRAFT_PHASE || 'before'}`;
mkdirSync(SHOT_DIR, { recursive: true });

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const;

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
}

/** Let webfonts, the Konva stage and layout settle before measuring. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.waitForTimeout(300);
}

async function createBoard(page: Page, name = 'Craft board'): Promise<string> {
  await setupBoard(page, { name });
  await expect(page).toHaveURL(/board=/);
  await expect(page.getByLabel('Editable vision board', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await settle(page);
  return page.url();
}

/** Insert one item of the given kind via the adapter and leave it selected. */
async function addItem(page: Page, kind: 'text' | 'shape' | 'image') {
  const h = await runtime(page);
  await h.evaluate(
    async ({ adapter }, payload) => {
      const { kind, png } = payload as { kind: string; png?: string };
      if (kind === 'text') {
        adapter.createTextPreset({
          id: 'craft',
          label: 'Craft',
          sample: 'The moments I want to remember',
          fontFamily: 'georgia',
          fontSize: 48,
          color: '#33272b',
        });
      } else if (kind === 'shape') {
        adapter.createShape('rectangle');
      } else {
        const bytes = Uint8Array.from(atob(png!), (c) => c.charCodeAt(0));
        await adapter.uploadPhotos([new File([bytes], 'tiny.png', { type: 'image/png' })]);
      }
      const items = adapter.history.document.items;
      adapter.select([items[items.length - 1].id]);
    },
    { kind, png: TINY_B64 },
  );
  await expect(page.getByRole('toolbar', { name: 'Selected object actions' })).toBeVisible();
}

/** A minimal valid 1x1 PNG, decodable by createImageBitmap. */
const TINY_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function openRailTab(page: Page, tab: string) {
  await page
    .getByRole('navigation', { name: 'Studio tools' })
    .getByRole('button', { name: tab, exact: true })
    .click();
  await expect(page.getByLabel(`${tab} panel`, { exact: true })).toBeVisible();
}

/** Open the flag-off object inspector for the current selection (idempotent). */
async function openInspector(page: Page) {
  const inspector = page
    .getByLabel('Object inspector', { exact: true })
    .or(page.getByLabel('Quick Shape inspector', { exact: true }));
  if (await inspector.isVisible()) return;
  const toolbar = page.getByRole('toolbar', { name: 'Selected object actions' });
  // The opening dock portals over the trigger, so a synthetic click is used.
  await toolbar
    .getByRole('button', { name: /Formatting|Appearance|Image effects/ })
    .first()
    .dispatchEvent('click');
  // Text opens EditorFeatures ("Object inspector"); quick shapes open the
  // QuickShapeInspector inside the ObjectDock.
  await expect(inspector).toBeVisible();
}

test.describe('craft invariants (item 44)', () => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    test(`desktop object dock stays in the workspace beside the canvas at ${viewport.width}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await createBoard(page);
      await addItem(page, 'shape');
      await openInspector(page);
      await settle(page);
      const canvas = await page.getByRole('main', { name: 'Vision board canvas' }).boundingBox();
      const dock = await page.locator('.gs-object-dock').boundingBox();
      const workspace = await page.locator('.vs-body').boundingBox();
      expect(dock!.x).toBeGreaterThanOrEqual(canvas!.x + canvas!.width - 1);
      expect(dock!.y).toBeCloseTo(workspace!.y, 0);
      expect(dock!.y + dock!.height).toBeLessThanOrEqual(workspace!.y + workspace!.height + 1);
      expect(
        Number(
          await page
            .getByLabel('Editable vision board', { exact: true })
            .getAttribute('data-scale'),
        ),
      ).toBeGreaterThan(0.25);
    });
  }
  test('no horizontal overflow at the four viewports, home and editor', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: '+ New board' })).toBeVisible();
    const homeOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(homeOverflow, 'home horizontal overflow at 1366x768').toBe(0);
    await createBoard(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await settle(page);
      const editorOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(
        editorOverflow,
        `editor horizontal overflow at ${viewport.width}x${viewport.height}`,
      ).toBe(0);
    }
  });

  test('rail tab labels never truncate, including Background', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await createBoard(page);
    const truncated = await page.evaluate(() => {
      const bad: string[] = [];
      for (const tab of document.querySelectorAll('.vs-rail__tab')) {
        for (const span of tab.querySelectorAll('span')) {
          if (span.textContent?.trim() && span.scrollWidth > span.clientWidth + 1)
            bad.push(span.textContent.trim());
        }
      }
      return bad;
    });
    expect(truncated).toEqual([]);
  });

  test('the floating dock never covers the canvas scrollbar track', async ({ page }) => {
    await createBoard(page);
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await settle(page);
      const overlap = await page.evaluate(() => {
        const board = document.querySelector('[aria-label="Editable vision board"]');
        const dock = document.querySelector('.vs-bottom-dock');
        if (!(board instanceof HTMLElement) || !(dock instanceof HTMLElement))
          return 'missing elements';
        const b = board.getBoundingClientRect();
        const d = dock.getBoundingClientRect();
        const vBarW = board.offsetWidth - board.clientWidth;
        const hBarH = board.offsetHeight - board.clientHeight;
        if (vBarW <= 0 && hBarH <= 0) return 'overlay scrollbars: no track to cover';
        const intersects = (r: { x: number; y: number; w: number; h: number }) =>
          d.left < r.x + r.w && d.right > r.x && d.top < r.y + r.h && d.bottom > r.y;
        if (vBarW > 0 && intersects({ x: b.right - vBarW, y: b.top, w: vBarW, h: b.height }))
          return 'dock covers the vertical scrollbar track';
        if (hBarH > 0 && intersects({ x: b.left, y: b.bottom - hBarH, w: b.width, h: hBarH }))
          return 'dock covers the horizontal scrollbar track';
        return 'ok';
      });
      expect(overlap, `dock/scrollbar at ${viewport.width}x${viewport.height}`).toBe('ok');
    }
  });

  test('every icon-only button has an accessible name and no native tooltip', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await createBoard(page);
    await addItem(page, 'text');
    const offenders = await page.evaluate(() => {
      const bad: string[] = [];
      for (const el of document.querySelectorAll('button')) {
        const text = (el.textContent || '').trim();
        if (!text && el.querySelector('svg, img')) {
          if (!el.getAttribute('aria-label'))
            bad.push(`missing aria-label: ${el.className.toString().slice(0, 60)}`);
          if (el.hasAttribute('title'))
            bad.push(`native title: ${el.className.toString().slice(0, 60)}`);
        }
      }
      return bad;
    });
    expect(offenders).toEqual([]);
  });

  test('the first 25 keyboard Tab stops all show a visible focus ring', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await createBoard(page);
    await page.getByLabel('Back to home').focus();
    const invisible: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const ring =
          (cs.boxShadow !== 'none' && cs.boxShadow !== '') ||
          (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0);
        return ring
          ? null
          : `${el.tagName.toLowerCase()}.${(el.className?.toString() || '').slice(0, 40)}`;
      });
      if (info) invisible.push(`stop ${i + 1}: ${info}`);
    }
    expect(invisible).toEqual([]);
  });

  test('reduced motion disables toast, skeleton and dock animation', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await createBoard(page);
    // Toast: the toast class must collapse its animation under reduced motion
    // (checked via the class itself, mirroring the skeleton check below).
    const toastAnim = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'gs-toast';
      document.body.appendChild(el);
      const name = getComputedStyle(el).animationName;
      el.remove();
      return name;
    });
    expect(toastAnim).toBe('none');
    // Skeleton: the CSS class must also collapse under reduced motion.
    const skeletonAnim = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'gs-skeleton';
      document.body.appendChild(el);
      const name = getComputedStyle(el).animationName;
      el.remove();
      return name;
    });
    expect(skeletonAnim).toBe('none');
    // Dock: neither the bottom dock nor the object dock may animate.
    for (const selector of ['.vs-bottom-dock', '.gs-object-dock']) {
      const el = page.locator(selector).first();
      if (await el.count()) {
        expect(await el.evaluate((n) => getComputedStyle(n).animationName), selector).toBe('none');
      }
    }
  });
});

test.describe('before screenshots (G0 baseline)', () => {
  test('home: empty, dialog and with boards', async ({ page }) => {
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.getByRole('button', { name: '+ New board' })).toBeVisible();
      await shot(page, `home-empty-${viewport.width}x${viewport.height}`);
      await page.getByRole('button', { name: '+ New board' }).click();
      await expect(page.getByLabel('New board setup')).toBeVisible();
      await shot(page, `home-dialog-${viewport.width}x${viewport.height}`);
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await createBoard(page, 'Craft board one');
    await page.getByLabel('Back to home').click();
    await expect(page.getByRole('button', { name: '+ New board' })).toBeVisible();
    await shot(page, 'home-with-boards-1366x768');
    await page.setViewportSize({ width: 390, height: 844 });
    await shot(page, 'home-with-boards-390x844');
  });

  test('editor: empty board across viewports', async ({ page }) => {
    await createBoard(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await settle(page);
      await shot(page, `editor-empty-${viewport.width}x${viewport.height}`);
    }
  });

  test('editor: text selected (flag-off inspector)', async ({ page }) => {
    await createBoard(page);
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await settle(page);
      await addItem(page, 'text');
      await shot(page, `editor-text-selected-${viewport.width}x${viewport.height}`);
      await openInspector(page);
      await shot(page, `editor-text-inspector-${viewport.width}x${viewport.height}`);
    }
  });

  test('editor: shape selected', async ({ page }) => {
    await createBoard(page);
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await settle(page);
      await addItem(page, 'shape');
      await openInspector(page);
      await shot(page, `editor-shape-inspector-${viewport.width}x${viewport.height}`);
    }
  });

  test('editor: image selected', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await createBoard(page);
    await addItem(page, 'image');
    await openInspector(page);
    await shot(page, 'editor-image-inspector-1366x768');
  });

  test('editor: each library panel open', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await createBoard(page);
    for (const tab of ['Templates', 'Elements', 'Uploads', 'Text', 'Create', 'Background']) {
      await openRailTab(page, tab);
      await shot(page, `editor-panel-${tab.toLowerCase()}-1366x768`);
    }
  });

  test('editor: menu, toast and color picker', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await createBoard(page);
    // File menu open.
    await page.getByLabel('File menu', { exact: true }).click();
    await shot(page, 'editor-menu-open-1366x768');
    await page.keyboard.press('Escape');
    // Upload failure → inline error with retry (item 26 design).
    await addItem(page, 'shape');
    await openRailTab(page, 'Uploads');
    await page.locator('input[aria-label="Upload photos"]').setInputFiles({
      name: 'big.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(26 * 1024 * 1024),
    });
    await expect(page.locator('.panel-inline-error')).toBeVisible();
    await shot(page, 'editor-upload-error-1366x768');
    // Toast via the deterministic backup-too-large path (181 MB > 180 MB limit).
    // Playwright caps inline buffers at 50 MB, so the file is written to disk.
    await page.getByLabel('File menu', { exact: true }).click();
    const bigBackupPath = testInfo.outputPath('craft-big-backup.visbo');
    writeFileSync(bigBackupPath, Buffer.alloc(181 * 1024 * 1024));
    try {
      await page.locator('input[aria-label="Open board file"]').setInputFiles(bigBackupPath);
    } finally {
      unlinkSync(bigBackupPath);
    }
    await expect(page.locator('.gs-toast')).toBeVisible();
    await shot(page, 'editor-toast-visible-1366x768');
    await page.getByRole('button', { name: 'Dismiss' }).click();
    // Color picker open on a text item's fill (flag-off inspector).
    await addItem(page, 'text');
    await openInspector(page);
    await page
      .getByLabel('Object inspector', { exact: true })
      .getByRole('button', { name: 'Text color' })
      .first()
      .click();
    await expect(page.getByLabel('Text color picker')).toBeVisible();
    await shot(page, 'editor-color-picker-1366x768');
  });

  test('editor: reduced-motion capture', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await createBoard(page);
    await addItem(page, 'text');
    await shot(page, 'editor-reduced-motion-1366x768');
  });
});
