import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const phase = process.env.CRAFT_PHASE || 'before';
for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
  [768, 1024],
  [390, 844],
]) {
  test(`craft evidence ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const folder = `exports/craft/${phase}/${width}x${height}`;
    mkdirSync(folder, { recursive: true });
    const capture = async (name: string) => {
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${folder}/${name}.png`, animations: 'disabled' });
    };
    await page.goto('/');
    await capture('home-empty');
    await page.getByRole('button', { name: '+ New board', exact: true }).click();
    await capture('board-setup');
    await page.getByRole('button', { name: 'Create board', exact: true }).click();
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await expect(page.getByLabel('Editable vision board', { exact: true })).toBeVisible();
    await capture('editor');
    if (['g4', 'g5', 'g6'].includes(phase)) {
      const layout = await page.evaluate(() => {
        const dock = document.querySelector('.vs-bottom-dock')!.getBoundingClientRect();
        const viewport = document.querySelector('.gs-artboard') as HTMLElement;
        const box = viewport.getBoundingClientRect();
        return { dockTop: dock.top, viewportBottom: box.bottom, labels: [...document.querySelectorAll('.vs-rail__tab > span:not([class])')].map(el => ({ text: el.textContent, width: el.clientWidth, scroll: el.scrollWidth })) };
      });
      expect(layout.dockTop).toBeGreaterThanOrEqual(layout.viewportBottom);
      for (const label of layout.labels) expect(label.scroll, label.text ?? '').toBeLessThanOrEqual(label.width);
      writeFileSync(`${folder}/shell-layout.json`, JSON.stringify(layout, null, 2));
    }
    for (const name of ['Templates', 'Elements', 'Uploads', 'Text', 'Create', 'Background', 'AI']) {
      await page.getByRole('button', { name, exact: true }).click();
      await capture(`panel-${name.toLowerCase()}`);
      await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    }
    await page.getByLabel('File menu', { exact: true }).click();
    await capture('file-menu');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Text', exact: true }).click();
    await page.locator('.text-panel__item').first().click();
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await capture('text-selected');
    await page.getByRole('button', { name: 'Text color', exact: true }).click();
    await capture('color-picker');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Formatting', exact: true }).click();
    await capture('text-inspector');
    await page
      .locator('.gs-object-dock')
      .getByRole('button', { name: 'Close editor panel', exact: true })
      .click();
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await capture('export-dialog');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByRole('button', { name: 'star', exact: true }).click();
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await capture('shape-selected');
    await page.getByRole('button', { name: 'Uploads', exact: true }).click();
    await page.getByLabel('Upload photos', { exact: true }).setInputFiles({
      name: 'craft-preview.png',
      mimeType: 'image/png',
      buffer: await page.screenshot(),
    });
    await expect(page.getByRole('status').filter({ hasText: 'photo added' })).toBeVisible();
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await capture('image-selected');
    await page.getByLabel('File menu', { exact: true }).click();
    await page.getByLabel('Open board file', { exact: true }).setInputFiles({
      name: 'invalid.visbo',
      mimeType: 'application/json',
      buffer: Buffer.from('{invalid'),
    });
    await page.keyboard.press('Escape');
    await expect(page.locator('.gs-toast')).toBeVisible();
    await capture('toast');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await capture('reduced-motion');
    const diagnostics = await page.evaluate(() => ({
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      nativeIconTooltips: [...document.querySelectorAll('button[title]')].map((el) => ({
        label: el.getAttribute('aria-label'),
        title: el.getAttribute('title'),
      })),
      railLabels: [...document.querySelectorAll('.vs-rail__tab')].map((el) => ({
        text: el.textContent,
        width: el.clientWidth,
        contentWidth: el.scrollWidth,
      })),
    }));
    writeFileSync(`${folder}/diagnostics.json`, JSON.stringify(diagnostics, null, 2));
    await page.getByRole('button', { name: 'Back to home', exact: true }).click();
    await capture('home-with-boards');
  });
}
