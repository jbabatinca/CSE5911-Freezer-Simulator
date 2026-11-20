import { expect, test } from '@playwright/test';
import { makeLayout } from '../helpers/questionSets.js';

test('welcome panel fills the available viewport and keeps its content centered', async ({ page }) => {
  await page.goto('/');

  const viewport = page.viewportSize();
  const header = await page.locator('.app-header').boundingBox();
  const panel = await page.locator('.home-view').boundingBox();
  const buttons = await page.locator('.home-buttons').boundingBox();
  expect(viewport).not.toBeNull();
  expect(header).not.toBeNull();
  expect(panel).not.toBeNull();
  expect(buttons).not.toBeNull();

  const horizontalMargin = viewport!.width <= 600 ? 12 : 24;
  const bottomMargin = viewport!.width <= 600 ? 12 : 32;
  expect(panel!.x).toBe(horizontalMargin);
  expect(panel!.width).toBe(viewport!.width - horizontalMargin * 2);
  expect(header!.x).toBe(panel!.x);
  expect(header!.width).toBe(panel!.width);
  expect(panel!.y).toBe(header!.y + header!.height + 24);
  expect(viewport!.height - (panel!.y + panel!.height)).toBe(bottomMargin);
  expect(await page.locator('.home-view').evaluate(element => getComputedStyle(element).textAlign)).toBe('center');
  expect(buttons!.x + buttons!.width / 2).toBeCloseTo(panel!.x + panel!.width / 2, 0);
});

test('all screen panels share the page width and expanded freezer content scrolls', async ({ page }) => {
  const layout = makeLayout();
  await page.addInitScript(savedLayout => {
    localStorage.setItem('freezer-layouts', JSON.stringify([savedLayout]));
  }, layout);
  await page.goto('/');

  const viewport = page.viewportSize()!;
  const margin = viewport.width <= 600 ? 12 : 24;
  const expectPanelWidth = async (selector: string) => {
    const panel = await page.locator(selector).boundingBox();
    expect(panel).not.toBeNull();
    expect(panel!.x).toBe(margin);
    expect(panel!.width).toBe(viewport.width - margin * 2);
    expect(panel!.y + panel!.height).toBeGreaterThanOrEqual(viewport.height - (viewport.width <= 600 ? 12 : 32));
  };
  const expectScarletTopBorder = async (selector: string) => {
    const panel = page.locator(selector);
    await expect(panel).toHaveCSS('border-top-width', '5px');
    await expect(panel).toHaveCSS('border-top-color', 'rgb(186, 12, 47)');
    await expect(panel).toHaveCSS('border-top-left-radius', '6px');
    await expect(panel).toHaveCSS('border-top-right-radius', '6px');
  };

  await expectPanelWidth('.home-view');
  await expectScarletTopBorder('.home-view');
  await page.locator('#btn-admin-mode').click();
  await page.locator('#admin-password-input').fill('123456');
  await page.locator('#btn-admin-login').click();
  await expectPanelWidth('.mode-home-view');
  await expectScarletTopBorder('.mode-home-view');
  await page.locator('#btn-admin-configuration').click();
  await expectPanelWidth('.layout-dashboard');
  await expectScarletTopBorder('.layout-dashboard');
  await page.locator('#layout-layout-1').click();
  await expectPanelWidth('.freezer-editor');
  await expectScarletTopBorder('.freezer-editor');
  await expect(page.locator('.editor-header')).toHaveCSS('flex-wrap', 'wrap');

  await page.setViewportSize({ width: viewport.width, height: 450 });
  await page.locator('#btn-toggle-shelf-layout-1-shelf').click();
  await page.locator('#btn-toggle-rack-layout-1-rack-1').click();
  await page.locator('#btn-toggle-box-layout-1-box-1').click();
  await expect(page.locator('.box-details')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);

  await page.setViewportSize(viewport);
  await page.locator('#btn-back-to-layouts').click();
  await page.locator('#btn-back').click();
  await page.locator('#btn-home').click();
  await page.locator('#btn-user-mode').click();
  await expectPanelWidth('.mode-home-view');
  await expectScarletTopBorder('.mode-home-view');
  await page.locator('#btn-freezer-layouts').click();
  await expectPanelWidth('.layout-dashboard');
  await expectScarletTopBorder('.layout-dashboard');
  await page.locator('#layout-layout-1').click();
  await expectPanelWidth('.freezer-editor');
  await expectScarletTopBorder('.freezer-editor');
});
