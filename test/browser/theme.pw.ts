import { expect, test } from '@playwright/test';
import { makeLayout, makeQuestionSet } from '../helpers/questionSets.js';

test('home page offers only sun and moon icons, with Light as the default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.brand-banner-light')).toBeVisible();
  await expect.poll(() => page.locator('.brand-banner-light').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.brand-banner-light')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
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
  await expect(page.locator('.brand-banner-dark')).toBeVisible();
  await expect(page.locator('.brand-banner-light')).toBeHidden();
  await expect.poll(() => page.locator('.brand-banner-dark').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(moon).toHaveAttribute('aria-pressed', 'true');
  await expect(sun).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(22, 24, 25)');
  await expect(page.locator('.home-view h1')).toHaveCSS('color', 'rgb(246, 247, 248)');
  await expect(page.locator('#btn-admin-mode')).toHaveCSS('background-color', 'rgb(186, 12, 47)');
  await expect(page.locator('#btn-admin-mode')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await sun.focus();
  await sun.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.brand-banner-light')).toBeVisible();
  await expect(page.locator('.brand-banner-dark')).toBeHidden();
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

test('admin password dialog switches logo variants with the selected theme', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btn-admin-mode').click();
  await expect(page.locator('.admin-password-brand-light')).toBeVisible();
  await expect.poll(() => page.locator('.admin-password-brand-light').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.locator('#btn-cancel-admin').click();
  await page.getByRole('button', { name: 'Switch to Dark Mode' }).click();
  await page.locator('#btn-admin-mode').click();
  await expect(page.locator('.admin-password-brand-dark')).toBeVisible();
  await expect(page.locator('.admin-password-brand-light')).toBeHidden();
  await expect.poll(() => page.locator('.admin-password-brand-dark').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});

test('dark theme covers dialogs, user home, layout dashboard, and freezer cards', async ({ page }) => {
  await page.addInitScript(layout => {
    localStorage.setItem('freezer-layouts', JSON.stringify([layout]));
  }, makeLayout());
  const expectScarletTopBorder = async (selector: string) => {
    const panel = page.locator(selector);
    await expect(panel).toHaveCSS('border-top-width', '5px');
    await expect(panel).toHaveCSS('border-top-color', 'rgb(186, 12, 47)');
    await expect(panel).toHaveCSS('border-top-left-radius', '6px');
    await expect(panel).toHaveCSS('border-top-right-radius', '6px');
  };
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to Dark Mode' }).click();
  await expectScarletTopBorder('.home-view');
  await page.locator('#btn-admin-mode').click();
  await expect(page.locator('.modal-content')).toHaveCSS('background-color', 'rgb(33, 35, 37)');
  await expect(page.locator('.admin-password-brand-dark')).toBeVisible();
  await expect(page.locator('.admin-password-brand-light')).toBeHidden();
  await expect.poll(() => page.locator('.admin-password-brand-dark').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('#admin-password-input')).toHaveCSS('background-color', 'rgb(46, 49, 51)');
  await expect(page.locator('#admin-password-input')).toHaveCSS('color', 'rgb(246, 247, 248)');
  await page.locator('#btn-cancel-admin').click();
  await page.locator('#btn-user-mode').click();
  await expect(page.locator('.mode-home-view')).toHaveCSS('background-color', 'rgb(33, 35, 37)');
  await expectScarletTopBorder('.mode-home-view');
  await expect(page.locator('.user-question-set-launcher')).toHaveCSS('background-color', 'rgb(46, 49, 51)');
  await page.locator('#btn-user-training').click();
  await expectScarletTopBorder('.training-view');
  await page.locator('#btn-back').click();
  await page.locator('#btn-freezer-layouts').click();
  await expect(page.locator('.layout-dashboard')).toHaveCSS('background-color', 'rgb(33, 35, 37)');
  await expectScarletTopBorder('.layout-dashboard');
  await page.locator('#layout-layout-1').click();
  await expect(page.locator('.freezer-editor')).toHaveCSS('background-color', 'rgb(33, 35, 37)');
  await expectScarletTopBorder('.freezer-editor');
  await page.locator('#btn-toggle-shelf-layout-1-shelf').click();
  await page.locator('#btn-toggle-rack-layout-1-rack-1').click();
  await expect(page.locator('.freezer-editor .box-slot.empty')).toHaveCSS('background-color', 'rgb(33, 35, 37)');
  await expect(page.locator('#btn-toggle-box-layout-1-box-1')).toHaveCSS('color', 'rgb(246, 247, 248)');
  await expect(page.getByRole('button', { name: 'Switch to Dark Mode' })).toHaveAttribute('aria-pressed', 'true');
});

test('navigation, history, and freezer controls match the configuration button in both themes', async ({ page }) => {
  await page.addInitScript(layout => {
    localStorage.setItem('freezer-layouts', JSON.stringify([layout]));
  }, makeLayout());
  await page.goto('/');
  await page.locator('#btn-admin-mode').click();
  await page.locator('#admin-password-input').fill('123456');
  await page.locator('#btn-admin-login').click();

  const expectScarletButton = async (selector: string) => {
    const button = page.locator(selector);
    await expect(button).toHaveCSS('border-color', 'rgb(186, 12, 47)');
    await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(button).toHaveCSS('background-color', 'rgb(186, 12, 47)');
    await button.hover();
    await expect(button).toHaveCSS('border-color', 'rgb(112, 7, 28)');
    await expect(button).toHaveCSS('background-color', 'rgb(112, 7, 28)');
    await page.locator('.app-header h1').hover();
    await expect(button).toHaveCSS('background-color', 'rgb(186, 12, 47)');
  };
  const adminHomeButtons = ['#btn-admin-configuration', '#btn-home', '#btn-admin-settings', '#btn-logout', '#btn-user-history'];

  for (const theme of ['Light', 'Dark']) {
    if (await page.locator('html').getAttribute('data-theme') !== theme.toLowerCase()) {
      await page.getByRole('button', { name: `Switch to ${theme} Mode` }).click();
    }
    for (const selector of adminHomeButtons) {
      await expectScarletButton(selector);
    }
  }

  await page.locator('#btn-admin-configuration').click();
  for (const theme of ['Dark', 'Light']) {
    if (await page.locator('html').getAttribute('data-theme') !== theme.toLowerCase()) {
      await page.getByRole('button', { name: `Switch to ${theme} Mode` }).click();
    }
    await expectScarletButton('#btn-back');
  }
  await page.locator('#layout-layout-1').click();
  const search = page.locator('.editor-header #btn-toggle-layout-search');
  const shelf = page.getByRole('region', { name: 'Top shelf' });
  const shelfToggle = page.locator('.btn-toggle-shelf');
  for (const theme of ['Dark', 'Light']) {
    if (await page.locator('html').getAttribute('data-theme') !== theme.toLowerCase()) {
      await page.getByRole('button', { name: `Switch to ${theme} Mode` }).click();
    }
    for (const selector of ['.btn-back', '#btn-expand-all-shelves', '#btn-toggle-layout-search', '#btn-download', '#btn-export-pdf']) {
      await expectScarletButton(selector);
    }
    const shelfEdgeColor = theme === 'Dark' ? 'rgb(134, 142, 146)' : 'rgb(167, 177, 183)';
    await expect(shelf).toHaveCSS('border-bottom-color', shelfEdgeColor);
    await expect(shelf).toHaveCSS('border-bottom-width', '5px');
    await expect(shelf).toHaveCSS('border-top-width', '1px');
    await expect(shelf).toHaveCSS('border-radius', '8px');
    await expect(shelfToggle).toHaveText('▸');
    await expectScarletButton('.btn-toggle-shelf');
    await shelfToggle.press('Enter');
    await expect(shelfToggle).toHaveText('▾');
    await expectScarletButton('.btn-toggle-shelf');
    await shelfToggle.press('Enter');

    await search.press('Enter');
    await expect(search).toHaveAttribute('aria-expanded', 'true');
    await expectScarletButton('#btn-toggle-layout-search');
    await expect(search.locator('svg')).toHaveCSS('stroke', 'rgb(255, 255, 255)');
    await page.getByRole('button', { name: 'Close search' }).click();
  }
});

test('Training Mode question-set launcher stays readable and its Open set button matches Configuration Mode', async ({ page }) => {
  const questionSet = makeQuestionSet();
  await page.addInitScript(questionSet => {
    localStorage.setItem('freezer-question-sets', JSON.stringify([questionSet]));
  }, questionSet);
  await page.goto('/');
  await page.locator('#btn-user-mode').click();

  for (const theme of ['Light', 'Dark']) {
    if (await page.locator('html').getAttribute('data-theme') !== theme.toLowerCase()) {
      await page.getByRole('button', { name: `Switch to ${theme} Mode` }).click();
    }

    const dark = theme === 'Dark';
    const textColor = dark ? 'rgb(246, 247, 248)' : 'rgb(33, 35, 37)';
    const mutedColor = dark ? 'rgb(191, 198, 203)' : 'rgb(100, 106, 110)';
    const surfaceColor = dark ? 'rgb(33, 35, 37)' : 'rgb(255, 255, 255)';
    const disabledSurface = dark ? 'rgb(63, 68, 67)' : 'rgb(239, 241, 242)';
    const button = page.locator('#btn-open-question-set');
    const select = page.locator('#user-question-set-select');

    await expect(page.locator('.user-question-set-launcher h3')).toHaveCSS('color', textColor);
    await expect(page.locator('.user-question-set-launcher > p').first()).toHaveCSS('color', mutedColor);
    await expect(page.locator('.user-question-set-launcher label')).toHaveCSS('color', textColor);
    await expect(select).toHaveCSS('color', textColor);
    await expect(select).toHaveCSS('background-color', surfaceColor);
    await expect(select.locator('option').nth(1)).toHaveCSS('color', textColor);
    await expect(select.locator('option').nth(1)).toHaveCSS('background-color', surfaceColor);

    await select.selectOption('');
    await expect(button).toBeDisabled();
    await expect(button).toHaveCSS('background-color', disabledSurface);
    await expect(button).toHaveCSS('color', mutedColor);

    await select.selectOption(questionSet.id);
    await expect(button).toBeEnabled();
    await expect(button).toHaveCSS('background-color', 'rgb(186, 12, 47)');
    await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
    await button.hover();
    await expect(button).toHaveCSS('background-color', 'rgb(112, 7, 28)');
    await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
    await page.locator('.app-header h1').hover();
  }
});
