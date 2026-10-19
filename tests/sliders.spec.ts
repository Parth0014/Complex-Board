import { test, expect } from '@playwright/test';
import { createBoard } from './helpers/board';
import { runtime } from './appearance-helpers';

test('color hue and transparency share the slider while keeping their own units', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const handle = await runtime(page);
  await handle.evaluate(({ adapter }) =>
    adapter.createTextPreset({
      id: 'slider-test',
      label: 'Text',
      sample: 'My vision',
      fontFamily: 'georgia',
      fontSize: 48,
      color: '#4a3fd8',
    }),
  );
  await page.getByRole('button', { name: 'Text color', exact: true }).click();
  const hue = page.getByRole('slider', { name: 'Text color hue', exact: true });
  await expect(hue).toHaveClass(/gs-slider/);
  await expect(hue).toHaveAttribute('data-spectrum', 'true');
  await hue.focus();
  await page.keyboard.press('Home');
  await expect(hue).toHaveValue('0');
  await expect(hue).toHaveAttribute('aria-valuetext', '0 degrees');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Formatting', exact: true }).click();
  await page
    .locator('.object-inspector summary')
    .filter({ hasText: /^Opacity$/ })
    .click();
  const opacity = page.getByRole('slider', {
    name: 'Opacity',
    exact: true,
  });
  await expect(opacity).toHaveClass(/gs-slider/);
  await opacity.fill('65');
  await expect(opacity).toHaveAttribute('aria-valuetext', '65%');
});

test('canvas and photo zoom use matching sliders with native keyboard steps and fill', async ({
  page,
}) => {
  await createBoard(page, { closeLibrary: true });
  const canvasZoom = page.getByRole('slider', { name: 'Zoom', exact: true });
  const appearance = (slider: typeof canvasZoom) =>
    slider.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        height: getComputedStyle(node).height,
        track: style.getPropertyValue('--gs-range-track-size'),
        thumb: style.getPropertyValue('--gs-range-thumb-size'),
        accent: getComputedStyle(node).getPropertyValue('--gs-accent'),
      };
    });
  await expect(canvasZoom).toHaveClass(/gs-slider/);
  const canvasStyle = await appearance(canvasZoom);
  await canvasZoom.focus();
  await page.keyboard.press('Home');
  await expect(canvasZoom).toHaveValue('10');
  await page.keyboard.press('ArrowRight');
  await expect(canvasZoom).toHaveValue('11');
  const handle = await runtime(page);
  await handle.evaluate(async ({ adapter }) => {
    const c = document.createElement('canvas');
    c.width = 120;
    c.height = 180;
    c.getContext('2d')!.fillRect(0, 0, 120, 180);
    const blob = await new Promise<Blob>((resolve) => c.toBlob((value) => resolve(value!)));
    await adapter.uploadPhotos([new File([blob], 'slider.png', { type: 'image/png' })]);
    adapter.setImageFit('fill');
    adapter.startImageCrop();
  });
  const photoZoom = page.getByRole('slider', { name: 'Photo zoom', exact: true });
  await expect(photoZoom).toHaveClass(/gs-slider/);
  expect(await appearance(photoZoom)).toEqual(canvasStyle);
  await photoZoom.focus();
  await page.keyboard.press('End');
  await expect(photoZoom).toHaveValue('5');
  expect(await photoZoom.evaluate((node) => node.style.getPropertyValue('--gs-range-fill'))).toBe(
    '100%',
  );
  await page.keyboard.press('Home');
  await expect(photoZoom).toHaveValue('1');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Apply crop', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Cancel crop', exact: true })).toBeInViewport();
  await page.screenshot({ path: '.godmode/screenshots/sliders-mobile.png' });
  await page.getByRole('button', { name: 'Cancel crop', exact: true }).click();
});
