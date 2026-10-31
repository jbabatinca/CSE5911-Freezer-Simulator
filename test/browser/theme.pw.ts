import { expect, test } from '@playwright/test';
import { makeLayout } from '../helpers/questionSets.js';

test('home page offers only sun and moon icons, with Light as the default', async ({ page }) => {
  await page.goto('/');
  const controls = page.getByRole('group', { name: 'Color theme' });
  const sun = controls.getByRole('button', { name: 'Switch to Light Mode' });
  const moon = controls.getByRole('button', { name: 'Switch to Dark Mode' });
  await expect(controls.getByRole('button')).toHaveCount(2);
  await expect(controls.locator('select, option')).toHaveCount(0);
  await expect(sun.locator('svg')).toBeVisible();
  await expect(moon.locator('svg')).toBeVisible();
  await expect(sun).toHaveAttribute('aria-pressed', 'true');
  await expect(moon).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await moon.focus();
  await moon.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(moon).toHaveAttribute('aria-pressed', 'true');
  await expect(sun).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(22, 24, 25)');
  await expect(page.locator('.home-view h1')).toHaveCSS('color', 'rgb(246, 247, 248)');
  await expect(page.locator('#btn-admin-mode')).toHaveCSS('background-color', 'rgb(186, 12, 47)');
  await expect(page.locator('#btn-admin-mode')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await sun.focus();
  await sun.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(239, 241, 242)');
});

test('icon choices survive reload and are independent of the system theme', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to Dark Mode' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Switch to Dark Mode' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to Light Mode' }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.home-view h1')).toHaveCSS('color', 'rgb(33, 35, 37)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Switch to Light Mode' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('dark theme covers dialogs, user home, layout dashboard, and freezer cards', async ({ page }) => {
  await page.addInitScript(layout => {
    localStorage.setItem('freezer-layouts', JSON.stringify([layout]));
  }, makeLayout());
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to Dark Mode' }).click();
  await page.locator('#btn-admin-mode').click();
  await expect(page.locator('.modal-content')).toHaveCSS('background-color', 'rgb(33, 35, 37)');
  await expect(page.locator('#admin-password-input')).toHaveCSS('background-color', 'rgb(46, 49, 51)');
  await expect(page.locator('#admin-password-input')).toHaveCSS('color', 'rgb(246, 247, 248)');
  await page.locator('#btn-cancel-admin').click();
  await page.locator('#btn-user-mode').click();
  await expect(page.locator('.mode-home-view')).toHaveCSS('background-color', 'rgb(33, 35, 37)');
  await expect(page.locator('.user-question-set-launcher')).toHaveCSS('background-color', 'rgb(46, 49, 51)');
  await page.locator('#btn-freezer-layouts').click();
  await expect(page.locator('.layout-dashboard')).toHaveCSS('background-color', 'rgb(33, 35, 37)');
  await page.locator('#layout-layout-1').click();
  await expect(page.locator('.freezer-editor')).toHaveCSS('background-color', 'rgb(33, 35, 37)');
  await page.locator('#btn-toggle-shelf-layout-1-shelf').click();
  await page.locator('#btn-toggle-rack-layout-1-rack-1').click();
  await expect(page.locator('.freezer-editor .box-slot.empty')).toHaveCSS('background-color', 'rgb(33, 35, 37)');
  await expect(page.locator('#btn-toggle-box-layout-1-box-1')).toHaveCSS('color', 'rgb(246, 247, 248)');
  await expect(page.getByRole('button', { name: 'Switch to Dark Mode' })).toHaveAttribute('aria-pressed', 'true');
});
