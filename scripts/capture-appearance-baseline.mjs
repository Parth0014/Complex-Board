import { chromium } from '@playwright/test';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';

const output = 'exports/appearance-legacy';
await mkdir(output, { recursive: true });
await mkdir('tests/fixtures', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button', { name: '+ Create a vision board', exact: true }).click();
  await page.getByRole('button', { name: 'Create board', exact: true }).click();
  const backup = async () => {
    await page.getByLabel('File menu', { exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save backup', exact: true }).click();
    const data = JSON.parse(await readFile(await (await pending).path(), 'utf8'));
    await page.getByLabel('File menu', { exact: true }).click();
    return data;
  };
  if (process.argv.includes('--cards')) {
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByRole('button', { name: 'Add goal card', exact: true }).click();
    await page.getByRole('button', { name: 'Add affirmation', exact: true }).click();
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await writeFile('tests/fixtures/legacy-cards.json', JSON.stringify(await backup(), null, 2));
  } else {
    const source = process.argv[2] || 'tests/fixtures/appearance-v2.json';
    await page.getByLabel('File menu', { exact: true }).click();
    await page.getByLabel('Restore backup', { exact: true }).setInputFiles(source);
    await page.getByLabel('File menu', { exact: true }).click();
  }
  await page.getByLabel('Editable vision board', { exact: true }).focus();
  await page.keyboard.press('Escape');
  await page.screenshot({
    path: output + (process.argv.includes('--cards') ? '/cards-canvas.png' : '/styles-canvas.png'),
  });
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  await copyFile(
    await (await pending).path(),
    output + (process.argv.includes('--cards') ? '/cards.png' : '/styles.png'),
  );
  console.log('Captured legacy canvas and PNG export in ' + output);
} finally {
  await browser.close();
}
