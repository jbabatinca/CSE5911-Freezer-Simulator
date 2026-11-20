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
  test(`toggles all shelves and follows individual shelf changes in ${role} mode`, async ({ page }) => {
    await openFreezer(page, role);
    const expandAll = page.getByRole('button', { name: 'Expand All Shelves' });
    const collapseAll = page.getByRole('button', { name: 'Collapse All Shelves' });
    const topToggle = page.getByRole('button', { name: 'Toggle Top shelf' });
    const topRack = page.locator('#rack-layout-1-rack-1');
    const bottomRack = page.locator('#rack-layout-1-rack-2');
    const emptyNote = page.getByText('No racks on this shelf.');

    await expect(topRack).toBeHidden();
    await topToggle.click();
    await expect(topRack).toBeVisible();
    await expect(bottomRack).toBeHidden();

    await expandAll.click();
    await expect(collapseAll).toBeFocused();
    await expect(collapseAll).toHaveAttribute('aria-expanded', 'true');
    await expect(topRack).toBeVisible();
    await expect(bottomRack).toBeVisible();
    await expect(emptyNote).toBeVisible();

    await collapseAll.press('Enter');
    await expect(expandAll).toBeFocused();
    await expect(expandAll).toHaveAttribute('aria-expanded', 'false');
    await expect(topRack).toBeHidden();
    await expect(bottomRack).toBeHidden();
    await expect(emptyNote).toBeHidden();

    await expandAll.click();
    await topToggle.press('Enter');
    await expect(topToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(expandAll).toBeVisible();
    await expect(topRack).toBeHidden();
    await expect(bottomRack).toBeVisible();
    await expect(emptyNote).toBeVisible();
    await topToggle.press('Enter');
    await expect(topToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(collapseAll).toBeVisible();
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

test('pastes and drags items on their respective shelves with all shelves open', async ({ page }) => {
  await openFreezer(page, 'admin');
  await page.getByRole('button', { name: 'Expand All Shelves' }).click();
  const top = page.getByRole('region', { name: 'Top shelf' });
  const bottom = page.getByRole('region', { name: 'Bottom shelf' });
  const bottomRacks = bottom.locator('.rack-info h4');
  await top.getByRole('heading', { name: 'Rack 1' }).click();
  await page.keyboard.press('Control+c');

  await page.locator('#freezer-title').hover();
  await page.keyboard.press('Control+v');
  await expect(page.locator('#editor-message')).toContainText('Hover over the shelf');
  await expect(bottomRacks).toHaveText(['Rack 2']);

  await bottom.getByRole('heading', { name: 'Bottom shelf' }).hover();
  await page.keyboard.press('Control+v');
  await expect(bottomRacks).toHaveText(['Rack 2', 'Rack 1']);
  await bottomRacks.first().dragTo(bottomRacks.last());
  await expect(bottomRacks).toHaveText(['Rack 1', 'Rack 2']);
  await expect(top.locator('.rack-info h4')).toHaveText(['Rack 1']);

  await bottom.locator('#btn-toggle-rack-layout-1-rack-2').click();
  const box = bottom.locator('#box-layout-1-box-2');
  const emptySlot = bottom.locator('.box-slot.empty[data-row="1"][data-column="2"]');
  await emptySlot.scrollIntoViewIfNeeded();
  await box.dragTo(emptySlot);
  await expect(box).toHaveAttribute('data-column', '2');
});
