import { chromium } from '@playwright/test';
import { mkdir, copyFile } from 'node:fs/promises';
const destination = 'exports/tweakpane-phase0';
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button', { name: '+ Create a vision board', exact: true }).click();
  await page.getByLabel('Board name', { exact: true }).fill('Phase 0 representative board');
  await page.getByRole('button', { name: 'Create board', exact: true }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: 'rectangle', exact: true }).click();
  await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.screenshot({ path: destination + '/rectangle-inspector.png', fullPage: true });
  await page.getByRole('button', { name: 'Close editor panel', exact: true }).click();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const exported = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  await copyFile(await (await exported).path(), destination + '/rectangle-export.png');
  await page.getByRole('button', { name: 'Close export', exact: true }).click();
  await page.getByLabel('File menu', { exact: true }).click();
  const backedUp = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  await copyFile(await (await backedUp).path(), destination + '/rectangle-board.json');
  console.log('Baseline screenshot, PNG export and board backup saved to ' + destination);
} finally {
  await browser.close();
}
