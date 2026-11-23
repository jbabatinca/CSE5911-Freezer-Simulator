import { expect, test } from '@playwright/test';
import { makeLayout } from '../helpers/questionSets.js';

test('welcome panel fills the available viewport and keeps its content centered', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('banner').getByRole('heading', { level: 1, name: 'Freeze Tag', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome to Freeze Tag' })).toBeVisible();
  await expect(page.getByText('Choose your role to get started.', { exact: true })).toBeVisible();

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
  const labManagerButton = page.getByRole('button', { name: 'Lab Manager', exact: true });
  const loginDialog = page.locator('.admin-password-modal');
  const passwordInput = loginDialog.getByPlaceholder('Enter lab manager password', { exact: true });
  const loginButton = loginDialog.getByRole('button', { name: 'Login', exact: true });
  await labManagerButton.click();
  await expect(loginDialog.getByRole('heading', { name: 'Lab Manager', exact: true })).toBeVisible();
  await expect(loginDialog.getByText('Enter the lab manager password to configure freezer layouts and manage training exercises.', { exact: true })).toBeVisible();
  await passwordInput.fill('invalid-password');
  await loginButton.click();
  await expect(loginDialog.getByText('Incorrect password', { exact: true })).toBeVisible();
  await loginDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(loginDialog).toBeHidden();
  await expect(labManagerButton).toBeVisible();

  await labManagerButton.click();
  await passwordInput.fill('123456');
  await loginButton.click();
  await expect(loginDialog).toBeHidden();
  const dashboard = page.locator('.mode-home-view');
  await expect(dashboard.getByRole('heading', { name: 'Lab Manager', exact: true })).toBeVisible();
  await expect(dashboard.getByText('Create and edit virtual freezer layouts, build custom training question sets, and review training results in Progress History.', { exact: true })).toBeVisible();
  await expectPanelWidth('.mode-home-view');
  await expectScarletTopBorder('.mode-home-view');

  await dashboard.getByRole('button', { name: 'Question Set Creator Mode', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Question Set Creator Mode', exact: true })).toBeVisible();
  await page.locator('#btn-back').click();
  await dashboard.getByRole('button', { name: 'Progress History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Progress History', exact: true })).toBeVisible();
  await page.locator('#btn-back').click();

  await dashboard.getByRole('button', { name: 'Configuration Mode', exact: true }).click();
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
  await page.getByRole('button', { name: 'Student Worker', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Student Worker', exact: true })).toBeVisible();
  await expect(page.getByText('Explore the freezer layout, follow a guided tutorial, or practice finding sample locations with a training question set. View your results in Progress History.', { exact: true })).toBeVisible();
  await expectPanelWidth('.mode-home-view');
  await expectScarletTopBorder('.mode-home-view');

  await page.getByRole('button', { name: 'Tutorial Mode', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Freezer location tutorial', exact: true })).toBeVisible();
  await page.locator('#btn-back').click();
  await page.getByRole('button', { name: 'Progress History', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Progress History', exact: true })).toBeVisible();
  await page.locator('#btn-back').click();

  await page.getByRole('button', { name: 'Layout View', exact: true }).click();
  await expectPanelWidth('.layout-dashboard');
  await expectScarletTopBorder('.layout-dashboard');
  await page.locator('#layout-layout-1').click();
  await expectPanelWidth('.freezer-editor');
  await expectScarletTopBorder('.freezer-editor');
});
