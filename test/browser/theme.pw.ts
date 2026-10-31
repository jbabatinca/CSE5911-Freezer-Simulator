import { expect, test } from '@playwright/test';
import { makeLayout } from '../helpers/questionSets.js';

test('home page follows the system theme and updates when the system changes', async ({ page, colorScheme }) => {
  await page.goto('/');
  await expect(page.locator('#theme-select')).toHaveValue('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme!);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(22, 24, 25)');
  await expect(page.locator('.home-view h1')).toHaveCSS('color', 'rgb(246, 247, 248)');
  await expect(page.locator('#btn-admin-mode')).toHaveCSS('background-color', 'rgb(186, 12, 47)');
  await expect(page.locator('#btn-admin-mode')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(239, 241, 242)');
});

test('manual theme survives reload and overrides the system until System is selected', async ({ page }) => {
  await page.goto('/');
  await page.locator('#theme-select').selectOption('dark');
  await page.reload();
  await expect(page.locator('#theme-select')).toHaveValue('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#theme-select').selectOption('light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.home-view h1')).toHaveCSS('color', 'rgb(33, 35, 37)');
  await page.locator('#theme-select').selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('dark theme covers dialogs, user home, layout dashboard, and freezer cards', async ({ page }) => {
  await page.addInitScript(layout => {
    localStorage.setItem('freezer-layouts', JSON.stringify([layout]));
  }, makeLayout());
  await page.goto('/');
  await page.locator('#theme-select').selectOption('dark');
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
  await expect(page.locator('#theme-select')).toHaveValue('dark');
});
