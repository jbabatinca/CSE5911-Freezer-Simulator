import { expect, test, type Page } from '@playwright/test';
import { makeLayout } from '../helpers/questionSets.js';

async function openFreezer(page: Page, role: 'user' | 'admin') {
  const layout = makeLayout();
  const bottomRack = layout.freezerData.shelves[0]!.racks.pop()!;
  layout.freezerData.shelves.push(
    { id: 'bottom-shelf', name: 'Bottom shelf', racks: [bottomRack] },
    { id: 'empty-shelf', name: 'Empty shelf', racks: [] },
  );
  await page.addInitScript(layout => {
    localStorage.setItem('freezer-layouts', JSON.stringify([layout]));
  }, layout);
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
  await page.locator('#layout-layout-1').click();
}

for (const role of ['user', 'admin'] as const) {
  test(`expands all shelves and allows independent toggling in ${role} mode`, async ({ page }) => {
    await openFreezer(page, role);
    const expandAll = page.getByRole('button', { name: 'Expand All Shelves' });
    const topToggle = page.getByRole('button', { name: 'Toggle Top shelf' });
    const topRack = page.locator('#rack-layout-1-rack-1');
    const bottomRack = page.locator('#rack-layout-1-rack-2');
    const emptyNote = page.getByText('No racks on this shelf.');

    await expect(topRack).toBeHidden();
    await topToggle.click();
    await expect(topRack).toBeVisible();
    await expect(bottomRack).toBeHidden();

    await expandAll.click();
    await expect(expandAll).toBeFocused();
    await expect(topRack).toBeVisible();
    await expect(bottomRack).toBeVisible();
    await expect(emptyNote).toBeVisible();

    await topToggle.press('Enter');
    await expect(topToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(topRack).toBeHidden();
    await expect(bottomRack).toBeVisible();
    await expect(emptyNote).toBeVisible();
    await topToggle.press('Enter');
    await expect(topToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(topRack).toBeVisible();
    await expect(bottomRack).toBeVisible();
  });
}

test('edits racks and boxes on the selected shelf with all shelves open', async ({ page }) => {
  await openFreezer(page, 'admin');
  await page.getByRole('button', { name: 'Expand All Shelves' }).click();
  const top = page.getByRole('region', { name: 'Top shelf' });
  const bottom = page.getByRole('region', { name: 'Bottom shelf' });
  const bottomRack = bottom.locator('#rack-layout-1-rack-2');

  await bottom.getByRole('button', { name: '+ Add Rack to Bottom shelf' }).click();
  await expect(top.locator('.rack')).toHaveCount(1);
  await expect(bottom.locator('.rack')).toHaveCount(2);
  page.once('dialog', dialog => dialog.accept());
  await bottom.locator('.rack').last().getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(bottom.locator('.rack')).toHaveCount(1);
  await expect(top.locator('#rack-layout-1-rack-1')).toBeVisible();

  await bottomRack.locator('#btn-toggle-rack-layout-1-rack-2').click();
  const addBox = bottomRack.getByRole('button', { name: 'Add box at row 1, column 2' });
  await addBox.click();
  await page.getByRole('button', { name: 'Create box' }).click();
  await expect(bottomRack.getByRole('button', { name: /^▶ Box 1-2 \(/ })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await bottomRack.locator('#btn-remove-box-1-2').click();
  await expect(addBox).toBeVisible();
  await expect(top.locator('#rack-layout-1-rack-1')).toBeVisible();
});
