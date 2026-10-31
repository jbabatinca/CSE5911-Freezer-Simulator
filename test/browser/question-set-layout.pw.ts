import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { makeLayout, makeQuestionSet } from '../helpers/questionSets.js';

const rackId = 'layout-1-rack-1';
const boxId = 'layout-1-box-1';
const positionId = 'layout-1-position-1';
const answer = (page: Page, id: string) => page.locator(`[data-question-set-answer="${id}"]`);
const boxes = (page: Page) => page.locator('.tutorial-boxes');
const samples = (page: Page) => page.locator('.tutorial-sample-grid');
const next = (page: Page) => page.locator('#btn-question-set-next').click();

test.beforeEach(async ({ page, colorScheme }) => {
  // Explicitly select each project theme; the app no longer follows the system.
  await page.addInitScript(theme => localStorage.setItem('freezer-theme', theme), colorScheme ?? 'light');
});

async function openSet(page: Page, legacy: boolean, sampleOnly = false): Promise<void> {
  const layout = makeLayout();
  for (const [index, rack] of layout.freezerData.shelves[0]!.racks.entries()) {
    const box = rack.boxSlots[0]!.box!;
    if (legacy) delete rack.color;
    else rack.color = index === 0 ? '#2878C7' : '#2E9D50';
    delete box.color; // Match rack color, or white for layouts predating colors.
    rack.boxSlots = Array.from({ length: 16 }, (_, slot) => ({
      row: Math.floor(slot / 4) + 1, column: slot % 4 + 1,
      box: slot === 0 ? box : null,
    }));
    if (index === 0) {
      const yellow = {
        ...box, id: 'box-yellow', name: 'Yellow box',
        positions: [{ id: 'yellow-position', label: 'I9', row: 9, column: 9, sampleId: 'layout-1-sample' }],
        ...(!legacy ? { color: '#F2D21B' } : {}),
      };
      const white = { ...box, id: 'box-white', name: 'White box', positions: [], ...(!legacy ? { color: '#FFFFFF' } : {}) };
      rack.boxSlots[5]!.box = yellow;
      rack.boxSlots[15]!.box = white;
    }
  }
  const questionSet = makeQuestionSet();
  if (sampleOnly) questionSet.questions = [questionSet.questions[2]!];
  await page.addInitScript(({ layout, questionSet }) => {
    localStorage.setItem('freezer-layouts', JSON.stringify([layout]));
    localStorage.setItem('freezer-question-sets', JSON.stringify([questionSet]));
  }, { layout, questionSet });
  await page.goto('/');
  await page.locator('#btn-user-mode').click();
  await page.locator('#user-question-set-select').selectOption(questionSet.id);
  await page.locator('#btn-open-question-set').click();
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content, 'page content must fit the viewport').toBeLessThanOrEqual(dimensions.viewport);
}

async function expectGrid(grid: Locator, columns: number, rows: number): Promise<void> {
  await expect(grid).toBeVisible();
  const geometry = await grid.evaluate(element => {
    const cells = Array.from(element.children, cell => cell.getBoundingClientRect());
    return {
      columns: new Set(cells.map(cell => Math.round(cell.x))).size,
      rows: new Set(cells.map(cell => Math.round(cell.y))).size,
    };
  });
  expect(geometry).toEqual({ columns, rows });
}

async function cardPositions(page: Page) {
  return boxes(page).evaluate(grid => {
    const origin = grid.getBoundingClientRect();
    return Array.from(grid.querySelectorAll('button'), card => {
      const { x, y, width, height } = card.getBoundingClientRect();
      // Compare physical slots independently of scrolling caused by a click.
      return { x: x - origin.x, y: y - origin.y, width, height };
    });
  });
}

for (const legacy of [false, true]) {
  test(`${legacy ? 'legacy white' : 'colored'} layout completes all question types with physical grids`, async ({ page, colorScheme }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await openSet(page, legacy);

    // Check the applied theme, rather than matching stylesheet source text.
    const view = page.locator('.user-question-set-view');
    await expect(view).toHaveCSS('border-top-color', 'rgb(186, 12, 47)');
    await expect(view).toHaveCSS('background-color', colorScheme === 'dark' ? 'rgb(33, 35, 37)' : 'rgb(255, 255, 255)');
    await expect(page.locator('.training-heading h1')).toHaveCSS('font-weight', '800');
    await expect(page.locator('.tutorial-level.is-current')).toHaveCSS('background-color', 'rgb(186, 12, 47)');
    await expect(page.locator('.tutorial-level.is-current strong')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expectNoPageOverflow(page);

    await answer(page, 'layout-1-rack-2').click();
    await expect(answer(page, 'layout-1-rack-2')).toHaveClass(/is-incorrect/);
    await expect(page.locator('#question-set-feedback')).toContainText('1 of 3 misses');
    await answer(page, rackId).click();
    await expect(answer(page, rackId)).toBeDisabled();
    await expect(page.locator('#btn-question-set-next')).toHaveCSS('background-color', 'rgb(186, 12, 47)');
    await expect(page.locator('#btn-question-set-next')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await page.locator('#btn-question-set-next').hover();
    await expect(page.locator('#btn-question-set-next')).toHaveCSS('background-color', 'rgb(112, 7, 28)');
    await expect(page.locator('#btn-question-set-next')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await next(page);

    await page.locator(`[data-question-set-toggle-rack="${rackId}"]`).click();
    await expectGrid(boxes(page), 4, 4);
    await expect(boxes(page).locator('.question-set-box-slot')).toHaveCount(13);
    await expect(boxes(page).locator('.question-set-box-slot').first()).toHaveCSS('border-top-style', 'dashed');
    await expect(answer(page, boxId)).toHaveCSS('border-top-color', legacy ? 'rgb(255, 255, 255)' : 'rgb(40, 120, 199)');
    await expect(answer(page, 'box-yellow')).toHaveCSS('border-top-color', legacy ? 'rgb(255, 255, 255)' : 'rgb(242, 210, 27)');
    await expect(answer(page, 'box-white')).toHaveCSS('border-top-color', 'rgb(255, 255, 255)');
    await expectNoPageOverflow(page);
    await answer(page, boxId).click();
    await expect(answer(page, boxId)).toBeDisabled();
    await next(page);

    await page.locator(`[data-question-set-toggle-rack="${rackId}"]`).click();
    await page.locator(`[data-question-set-toggle-box="${boxId}"]`).click();
    await expectGrid(boxes(page), 4, 4);
    await expectGrid(samples(page), 9, 9);
    await expect(samples(page).locator('.tutorial-sample-empty')).toHaveCount(80);
    await expect(answer(page, positionId)).toHaveCSS('background-color', legacy ? 'rgb(255, 255, 255)' : 'rgb(40, 120, 199)');
    await expect(answer(page, positionId)).toHaveCSS('color', legacy ? 'rgb(24, 51, 77)' : 'rgb(255, 255, 255)');
    const gridBounds = await boxes(page).boundingBox();
    const detailsBounds = await page.locator('.question-set-box-details').boundingBox();
    expect(detailsBounds!.y).toBeGreaterThanOrEqual(gridBounds!.y + gridBounds!.height);
    await expectNoPageOverflow(page);
    await answer(page, positionId).click();
    await expect(answer(page, positionId)).toBeDisabled();
    await next(page);
    await expect(page.locator('.question-set-score')).toHaveText('Score: 3 / 3 (100%)');
    await expect(view).toHaveCSS('border-top-color', 'rgb(186, 12, 47)');
    await expect(view).toHaveCSS('background-color', colorScheme === 'dark' ? 'rgb(33, 35, 37)' : 'rgb(255, 255, 255)');
    await expect(page.locator('#btn-question-set-restart')).toHaveCSS('background-color', 'rgb(186, 12, 47)');
    await expect(page.locator('#btn-question-set-restart')).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expectNoPageOverflow(page);
    expect(errors).toEqual([]);
  });
}

test('switching boxes keeps the 4x4 cards in place and updates only the sample details', async ({ page }) => {
  await openSet(page, false, true);
  await page.locator(`[data-question-set-toggle-rack="${rackId}"]`).click();
  await page.locator(`[data-question-set-toggle-box="${boxId}"]`).click();
  const cardBounds = await cardPositions(page);
  await page.locator('[data-question-set-toggle-box="box-yellow"]').click();
  await expect(page.locator(`[data-question-set-toggle-box="${boxId}"]`)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-question-set-toggle-box="box-yellow"]')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.question-set-box-details h3')).toHaveText('Yellow box — positions');
  await expect(answer(page, positionId)).toHaveCount(0);
  await expect(answer(page, 'yellow-position')).toHaveCSS('background-color', 'rgb(242, 210, 27)');
  await expect(answer(page, 'yellow-position')).toHaveText('I9');
  expect(await cardPositions(page)).toEqual(cardBounds);
  await expectGrid(samples(page), 9, 9);
  await expectNoPageOverflow(page);
  await page.locator('[data-question-set-toggle-box="box-white"]').click();
  await expectGrid(samples(page), 9, 9);
  await expect(samples(page).locator('button')).toHaveCount(0);
  await expect(samples(page).locator('.tutorial-sample-empty')).toHaveCount(81);
  await page.locator('[data-question-set-toggle-box="box-white"]').click();
  await expect(page.locator('.question-set-box-details')).toHaveCount(0);
  await expectGrid(boxes(page), 4, 4);
});

test('switching theme during training preserves expanded boxes and answer progress', async ({ page }) => {
  await openSet(page, false, true);
  await page.locator(`[data-question-set-toggle-rack="${rackId}"]`).click();
  await page.locator(`[data-question-set-toggle-box="${boxId}"]`).click();
  for (const theme of ['dark', 'light']) {
    await page.locator(`[data-theme-value="${theme}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.question-set-run-view')).toHaveCSS('background-color', theme === 'dark' ? 'rgb(33, 35, 37)' : 'rgb(255, 255, 255)');
    await expectGrid(boxes(page), 4, 4);
    await expectGrid(samples(page), 9, 9);
    await expect(answer(page, positionId)).toHaveCSS('background-color', 'rgb(40, 120, 199)');
    await expectNoPageOverflow(page);
  }
  await answer(page, positionId).click();
  await page.getByRole('button', { name: 'Switch to Dark Mode' }).click();
  await expect(page.locator('#question-set-feedback')).toContainText('Correct!');
  await expect(page.locator('.question-set-score')).toHaveText('Score: 1 / 1 · Misses: 0 / 3');
  await expect(answer(page, positionId)).toBeDisabled();
});
