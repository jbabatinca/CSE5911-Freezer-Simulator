import { expect, test } from '@playwright/test';
import { makeLayout } from '../helpers/questionSets.js';

for (const role of ['user', 'admin'] as const) {
  test.describe(`${role} mode search`, () => {

    test.beforeEach(async ({ page, colorScheme }) => {
      const layout = makeLayout();
      const secondRack = layout.freezerData.shelves[0]!.racks.pop()!;
      layout.freezerData.shelves.push({ id: 'bottom-shelf', name: 'Bottom shelf', racks: [secondRack] });
      await page.addInitScript(({ layouts, theme }) => {
        localStorage.setItem('freezer-layouts', JSON.stringify(layouts));
        localStorage.setItem('freezer-theme', theme);
      }, { layouts: [layout, makeLayout('layout-2')], theme: colorScheme ?? 'light' });
      await page.goto('/');
      if (role === 'admin') {
        await page.locator('#btn-admin-mode').click();
        await page.locator('#admin-password-input').fill('123456');
        await page.locator('#btn-admin-login').click();
        await page.locator('#btn-admin-configuration').click();
      } else {
        await page.locator('#btn-user-mode').click();
        await page.locator('#btn-freezer-layouts').click();
      }
    });

    test('sample search opens and highlights locations, supports keyboard use, and clears in Layout View', async ({ page }) => {
      await page.locator('#layout-layout-1').click();
      const input = page.getByRole('searchbox', { name: 'Name or position' });
      await expect(input).toBeHidden();
      await page.getByRole('button', { name: 'Search', exact: true }).click();
      await expect(input).toBeFocused();
      await input.fill('  SER  ');
      await input.press('Enter');
      const results = page.locator('[data-layout-search-key]');
      await expect(results).toHaveCount(2);
      await results.nth(1).focus();
      await results.nth(1).press('Enter');
      const target = page.locator('#pos-layout-1-position-2');
      await expect(target).toBeVisible();
      await expect(target).toBeFocused();
      await expect(target).toHaveClass(/layout-search-target/);
      await expect(target).toHaveCSS('outline-style', 'solid');
      await expect(target).toHaveCSS('outline-width', '4px');
      await expect(page.locator('.layout-search-ancestor')).toHaveCount(3);
      await expect(page.locator('.layout-search-selection')).toContainText('Bottom shelf → Rack 2 → Box 2 → Position A1');

      await results.first().click();
      await expect(page.locator('#pos-layout-1-position-1')).toHaveClass(/layout-search-target/);
      await expect(page.locator('.layout-search-target')).toHaveCount(1);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      await expect(input).toHaveValue('');
      await expect(results).toHaveCount(0);
      await expect(page.locator('.layout-search-target, .layout-search-ancestor')).toHaveCount(0);
      await input.fill('missing sample');
      await input.press('Enter');
      await expect(page.locator('.layout-search [role="status"]')).toContainText('No results found');
      await page.locator('#btn-back-to-layouts').click();
      await page.locator('#layout-layout-1').click();
      await expect(page.locator('#layout-search-panel')).toBeHidden();
      await expect(page.locator('#layout-search-input')).toHaveValue('');
    });

    test('dashboard search opens layouts, shelves, racks, boxes, and positions across freezers', async ({ page }) => {
      const layoutCards = page.locator('.layout-grid .layout-slot');
      await expect(layoutCards).toHaveCount(2);
      for (const card of await layoutCards.all()) {
        await expect(card).toHaveCSS('border-top-color', 'rgb(186, 12, 47)');
        await expect(card).toHaveCSS('border-top-width', '4px');
        await expect(card).toHaveCSS('border-radius', '12px');
      }
      await layoutCards.first().hover();
      await expect(layoutCards.first()).toHaveCSS('border-top-color', 'rgb(186, 12, 47)');

      const toggle = page.getByRole('button', { name: 'Search', exact: true });
      await expect(toggle).toHaveCSS('background-color', 'rgb(186, 12, 47)');
      await expect(toggle).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(toggle.locator('svg')).toHaveCSS('stroke', 'rgb(255, 255, 255)');
      await toggle.hover();
      await expect(toggle).toHaveCSS('background-color', 'rgb(112, 7, 28)');
      await expect(toggle.locator('svg')).toHaveCSS('stroke', 'rgb(255, 255, 255)');

      const input = page.getByRole('searchbox', { name: 'Name or position' });
      await expect(page.locator('#layout-search-help')).toContainText('all saved layouts');
      const cases = [
        { query: 'layout-2', name: 'Layout: Freezer layout-2', target: '#freezer-title' },
        { query: 'bottom', name: 'Shelf: Bottom shelf', target: '#shelf-bottom-shelf' },
        { query: 'rack 2', name: 'Rack: Rack 2', target: '#rack-layout-1-rack-2' },
        { query: 'box 2', name: 'Box: Box 2', target: '#box-layout-1-box-2' },
        { query: 'a2', name: 'Position: Position A2', target: '#pos-layout-1-empty-1' },
      ];
      for (const item of cases) {
        await toggle.click();
        await input.fill(item.query);
        await input.press('Enter');
        await page.getByRole('button', { name: item.name, exact: false }).first().click();
        const target = page.locator(item.target);
        await expect(target).toBeVisible();
        await expect(target).toBeFocused();
        await expect(target).toHaveClass(/layout-search-target/);
        await expect(target).toHaveCSS('outline-width', '4px');
        await expect(page.locator('.layout-search-target')).toHaveCount(1);
        await expect(page.locator('#layout-search-help')).toContainText('this layout');
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth,
        }));
        expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
        await page.locator('#btn-back-to-layouts').click();
        await expect(page.locator('#layout-search-panel')).toBeHidden();
        await expect(page.locator('#layout-search-input')).toHaveValue('');
      }
    });

    test('search opens from the top toolbar and closes with Escape, close, or the Search button', async ({ page }, testInfo) => {
      await page.locator('#layout-layout-1').click();
      const toggle = page.locator('.editor-header #btn-toggle-layout-search');
      const panel = page.locator('#layout-search-panel');
      const input = page.getByRole('searchbox', { name: 'Name or position' });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toBeHidden();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(input).toBeFocused();
      await input.fill('rack');
      await input.press('Enter');
      await expect(page.locator('[data-layout-search-key]')).toHaveCount(2);
      await page.screenshot({ path: testInfo.outputPath('search-open.png') });
      await input.press('Escape');
      await expect(panel).toBeHidden();
      await expect(toggle).toBeFocused();
      await toggle.click();
      await expect(input).toHaveValue('rack');
      await expect(page.locator('[data-layout-search-key]')).toHaveCount(2);
      await page.getByRole('button', { name: 'Close search' }).click();
      await expect(panel).toBeHidden();
      await expect(toggle).toBeFocused();
      await toggle.click();
      await toggle.click();
      await expect(panel).toBeHidden();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('hidden search controls are skipped by Tab and Escape from a result preserves the highlighted sample', async ({ page }) => {
      await page.locator('#layout-layout-1').click();
      const toggle = page.getByRole('button', { name: 'Search', exact: true });
      const input = page.getByRole('searchbox', { name: 'Name or position' });
      const panel = page.locator('#layout-search-panel');
      await page.getByRole('button', { name: 'Export to PDF', exact: true }).focus();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Expand All Shelves' })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('#btn-toggle-shelf-layout-1-shelf')).toBeFocused();
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(input).toBeFocused();
      await input.fill('serum');
      await page.getByRole('button', { name: 'Find', exact: true }).click();
      const result = page.getByRole('button', { name: /Sample: Serum/ }).first();
      await result.click();
      const target = page.locator('#pos-layout-1-position-1');
      await expect(target).toBeFocused();
      await result.focus();
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await expect(toggle).toBeFocused();
      await expect(target).toHaveClass(/layout-search-target/);
      await toggle.click();
      await expect(result).toHaveAttribute('aria-pressed', 'true');
      await expect(input).toHaveValue('serum');
    });

    test('an empty dashboard recovers when searching or clearing without any saved freezers', async ({ page }) => {
      await page.evaluate(() => localStorage.removeItem('freezer-layouts'));
      await page.locator('#btn-back').click();
      await page.locator(role === 'admin' ? '#btn-admin-configuration' : '#btn-freezer-layouts').click();
      const toggle = page.getByRole('button', { name: 'Search', exact: true });
      const input = page.getByRole('searchbox', { name: 'Name or position' });
      await toggle.click();
      await input.fill('serum');
      await input.press('Enter');
      await expect(page.locator('.layout-search [role="status"]')).toContainText('No results found');
      await expect(page.locator('[data-layout-search-key]')).toHaveCount(0);
      await page.getByRole('button', { name: 'Clear', exact: true }).click();
      await expect(input).toHaveValue('');
      await expect(input).toBeFocused();
      await expect(page.locator('.layout-search [role="status"]')).toBeEmpty();
      await expect(page.locator('.layout-slot')).toHaveCount(0);
      await input.press('Escape');
      await expect(toggle).toBeFocused();
    });

    if (role === 'admin') {
      test('admin search preserves draft edits and leaves saving to the Save button', async ({ page }) => {
        await page.locator('#layout-layout-1').click();
        const saved = await page.evaluate(() => localStorage.getItem('freezer-layouts'));
        const name = 'Draft "Research" freezer';
        const nameInput = page.locator('#layout-name-input');
        await nameInput.fill(name);
        await page.getByRole('button', { name: 'Search', exact: true }).click();
        const input = page.getByRole('searchbox', { name: 'Name or position' });
        await input.fill('draft');
        await input.press('Enter');
        await page.getByRole('button', { name: /Layout: Draft/ }).click();
        await expect(page.locator('#freezer-title')).toHaveClass(/layout-search-target/);
        await expect(nameInput).toHaveValue(name);
        expect(await page.evaluate(() => localStorage.getItem('freezer-layouts'))).toBe(saved);
        await page.locator('#btn-add-shelf').click();
        await input.fill('shelf 3');
        await input.press('Enter');
        await page.getByRole('button', { name: /Shelf: Shelf 3/ }).click();
        await expect(page.locator('.shelf.layout-search-target')).toBeFocused();
        await expect(nameInput).toHaveValue(name);
        expect(await page.evaluate(() => localStorage.getItem('freezer-layouts'))).toBe(saved);
        page.once('dialog', dialog => dialog.accept());
        await page.locator('#btn-save').click();
        const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('freezer-layouts')!));
        expect(stored[0].name).toBe(name);
        expect(stored[0].freezerData.shelves).toHaveLength(3);
      });
    }

  });
}
