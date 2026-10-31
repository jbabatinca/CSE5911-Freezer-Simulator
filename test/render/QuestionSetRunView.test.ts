import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceQuestionSetRun, renderUserQuestionSetView, startQuestionSetRun, submitQuestionSetAnswer,
  toggleUserQuestionSetBox, toggleUserQuestionSetRack,
} from '../../src/render/QuestionSetRunView.js';
import { deleteQuestionSet, getQuestionSet, saveQuestionSet } from '../../src/services/QuestionSetService.js';
import { deleteLayout, saveLayout } from '../../src/services/StorageService.js';
import { element, makeLayout, makeQuestionSet, parseView } from '../helpers/questionSets.js';

const view = () => parseView(renderUserQuestionSetView('set-1'));
const answers = () => Array.from(view().querySelectorAll('[data-question-set-answer]'), button => button.getAttribute('data-question-set-answer'));

// Rendering tests move through the fixture by answering the current question and pressing Next.
function answerAndAdvance() {
  const step = view().querySelector('[aria-current="step"] strong')?.textContent;
  const question = step ? getQuestionSet('set-1')?.questions[Number(step.slice(1)) - 1] : null;
  submitQuestionSetAnswer(question?.targetId ?? 'missing');
  advanceQuestionSetRun();
}

describe('Question set run', () => {
  beforeEach(() => {
    localStorage.clear();
    saveLayout(makeLayout());
    saveQuestionSet(makeQuestionSet());
    startQuestionSetRun('set-1');
  });

  it('starts at question one and resets progress and expansion on restart', () => {
    answerAndAdvance();
    toggleUserQuestionSetRack('layout-1-rack-1');
    toggleUserQuestionSetBox('layout-1-box-1');
    startQuestionSetRun('set-1');
    expect(view().textContent).toContain('Question 1 / 3');
    expect(view().querySelectorAll('.question-set-progress .is-complete')).toHaveLength(0);
    expect(element(view(), '[aria-current="step"]').textContent).toContain('Q1');
    answerAndAdvance();
    expect(view().querySelector('.tutorial-boxes')).toBeNull();
    toggleUserQuestionSetRack('layout-1-rack-1');
    answerAndAdvance();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(view().querySelector('.tutorial-sample-grid')).toBeNull();
  });

  it('advances through each question, resets expansion, and completes after the last answer', () => {
    answerAndAdvance();
    expect(view().textContent).toContain('Question 2 / 3');
    expect(view().querySelectorAll('.question-set-progress .is-complete')).toHaveLength(1);
    expect(element(view(), '.training-question h2').textContent).toBe('Find Box 1');
    toggleUserQuestionSetRack('layout-1-rack-1');
    answerAndAdvance();
    expect(view().textContent).toContain('Question 3 / 3');
    expect(view().querySelector('.tutorial-boxes')).toBeNull();
    answerAndAdvance();
    expect(view().textContent).toContain('Set complete · 3 questions');
    expect(view().querySelectorAll('.question-set-progress .is-complete')).toHaveLength(3);
    expect(view().querySelector('[aria-current="step"]')).toBeNull();
    expect(element(view(), '#btn-question-set-restart').textContent).toBe('Run set again');
    expect(answers()).toEqual([]);
    const completed = renderUserQuestionSetView('set-1');
    answerAndAdvance();
    expect(renderUserQuestionSetView('set-1')).toBe(completed);
    startQuestionSetRun('set-1');
    expect(view().textContent).toContain('Question 1 / 3');
    expect(view().querySelector('#btn-question-set-restart')).toBeNull();
  });

  it('offers only rack answers for a rack question and never shows boxes', () => {
    expect(answers()).toEqual(['layout-1-rack-1', 'layout-1-rack-2']);
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(view().querySelector('.tutorial-boxes, .tutorial-sample-grid, [data-question-set-toggle-box]')).toBeNull();
    expect(view().querySelector('[data-question-set-toggle-rack]')).toBeNull();
  });

  it('requires expanding a rack to answer a box question and collapses it again', () => {
    answerAndAdvance();
    expect(answers()).toEqual([]);
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(answers()).toEqual(['layout-1-box-1']);
    expect(element(view(), '[data-question-set-toggle-rack="layout-1-rack-1"]').getAttribute('aria-expanded')).toBe('true');
    expect(view().querySelector('.tutorial-sample-grid')).toBeNull();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(answers()).toEqual([]);
    expect(element(view(), '[data-question-set-toggle-rack="layout-1-rack-1"]').getAttribute('aria-expanded')).toBe('false');
  });

  function sampleQuestion() {
    answerAndAdvance();
    answerAndAdvance();
  }

  it('shows the expanded sample grid below the box grid and answers by occupied position ID', () => {
    sampleQuestion();
    expect(answers()).toEqual([]);
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(view().querySelector('.tutorial-sample-grid')).toBeNull();
    toggleUserQuestionSetBox('layout-1-box-1');
    expect(view().querySelectorAll('.tutorial-sample-grid')).toHaveLength(1);
    expect(answers()).toEqual(['layout-1-position-1']);
    expect(element(view(), '.tutorial-sample-grid').children).toHaveLength(81);
    expect(view().querySelectorAll('.tutorial-sample-empty')).toHaveLength(80);
    const root = view();
    const cards = element(root, '.tutorial-boxes');
    const details = element(root, '.question-set-box-details');
    expect(cards.nextElementSibling).toBe(details);
    expect(details.querySelector('.tutorial-sample-grid')).not.toBeNull();
    expect(cards.querySelector('.tutorial-sample-grid')).toBeNull();
    expect(details.querySelector('h3')?.textContent).toBe('Box 1 — positions');
    expect(element(view(), '[data-question-set-answer]').getAttribute('aria-label')).toBe('Select Serum, position A1');
    toggleUserQuestionSetBox('layout-1-box-1');
    expect(view().querySelector('.tutorial-sample-grid')).toBeNull();
    expect(element(view(), '[data-question-set-toggle-box]').getAttribute('aria-expanded')).toBe('false');
  });

  it('collapsing or switching a rack clears its expanded box', () => {
    sampleQuestion();
    toggleUserQuestionSetRack('layout-1-rack-1');
    toggleUserQuestionSetBox('layout-1-box-1');
    expect(view().querySelector('.tutorial-sample-grid')).not.toBeNull();
    toggleUserQuestionSetRack('layout-1-rack-1');
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(view().querySelector('.tutorial-sample-grid')).toBeNull();
    toggleUserQuestionSetBox('layout-1-box-1');
    toggleUserQuestionSetRack('layout-1-rack-2');
    expect(view().querySelector('.tutorial-sample-grid')).toBeNull();
    expect(view().querySelectorAll('[data-question-set-toggle-rack][aria-expanded="true"]')).toHaveLength(1);
    toggleUserQuestionSetBox('layout-1-box-2');
    expect(answers()).toEqual(['layout-1-position-2']);
  });

  it('renders an empty set without answer controls', () => {
    saveQuestionSet(makeQuestionSet({ questions: [] }));
    expect(view().textContent).toContain('This set does not contain any questions.');
    answerAndAdvance();
    expect(answers()).toEqual([]);
    expect(view().querySelector('#btn-question-set-restart')).toBeNull();
  });

  it('renders an error if the set is deleted during a run', () => {
    deleteQuestionSet('set-1');
    expect(view().textContent).toContain('This question set is no longer available.');
    expect(() => answerAndAdvance()).not.toThrow();
    expect(answers()).toEqual([]);
  });

  it('renders an error if the source layout is missing', () => {
    deleteLayout('layout-1');
    expect(view().textContent).toContain('The source layout for this question set is no longer available.');
    expect(answers()).toEqual([]);
  });

  it.each(['red', 'var(--rack)', '#fff', '#GGGGGG', '" onmouseover="alert(1)'])('falls back to white for invalid rack and box color %s', color => {
    const layout = makeLayout();
    layout.freezerData.shelves[0]!.racks[0]!.color = color;
    layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.color = color;
    saveLayout(layout);
    answerAndAdvance();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(element(view(), '.tutorial-rack').style.getPropertyValue('--tutorial-rack-color')).toBe('#FFFFFF');
    const box = element(view(), '.tutorial-box-target');
    expect(box.style.getPropertyValue('--tutorial-box-color')).toBe('#FFFFFF');
    expect(box.style.getPropertyValue('--tutorial-box-foreground')).toBe('#18334d');
    expect(view().querySelector('[onmouseover]')).toBeNull();
  });

  it.each([undefined, 'red'])('inherits the rack color for box color %s', color => {
    const layout = makeLayout();
    layout.freezerData.shelves[0]!.racks[0]!.color = '#000000';
    const box = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!;
    if (color === undefined) delete box.color;
    else box.color = color;
    saveLayout(layout);
    answerAndAdvance();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(element(view(), '.tutorial-box-target').style.getPropertyValue('--tutorial-box-color')).toBe('#000000');
    expect(element(view(), '.tutorial-box-target').style.getPropertyValue('--tutorial-box-foreground')).toBe('#ffffff');
    answerAndAdvance();
    toggleUserQuestionSetRack('layout-1-rack-1');
    toggleUserQuestionSetBox('layout-1-box-1');
    expect(element(view(), '.tutorial-sample-grid').style.getPropertyValue('--tutorial-box-color')).toBe('#000000');
  });

  it('keeps an explicitly white box white on a colored rack', () => {
    const layout = makeLayout();
    layout.freezerData.shelves[0]!.racks[0]!.color = '#174477';
    saveLayout(layout);
    answerAndAdvance();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(element(view(), '.tutorial-box-target').style.getPropertyValue('--tutorial-box-color')).toBe('#FFFFFF');
  });

  it('renders older layouts without colors as white rack and box cards', () => {
    const layout = makeLayout();
    const rack = layout.freezerData.shelves[0]!.racks[0]!;
    delete rack.color;
    delete rack.boxSlots[0]!.box!.color;
    saveLayout(layout);
    answerAndAdvance();
    toggleUserQuestionSetRack(rack.id);
    expect(element(view(), '.tutorial-rack').style.getPropertyValue('--tutorial-rack-color')).toBe('#FFFFFF');
    expect(element(view(), '.tutorial-box-target').style.getPropertyValue('--tutorial-box-color')).toBe('#FFFFFF');
  });

  it('preserves physical box coordinates in all 16 slots, including empty placeholders', () => {
    const layout = makeLayout();
    const rack = layout.freezerData.shelves[0]!.racks[0]!;
    const box = rack.boxSlots[0]!.box!;
    // A sparse, out-of-order layout must not shift a box to an earlier slot.
    rack.boxSlots = [{ row: 4, column: 4, box }, { row: 1, column: 1, box: null }];
    saveLayout(layout);
    answerAndAdvance();
    toggleUserQuestionSetRack(rack.id);
    const grid = element(view(), '.tutorial-boxes');
    expect(grid.children).toHaveLength(16);
    expect(grid.querySelectorAll('.question-set-box-slot')).toHaveLength(15);
    expect(grid.children[0]?.getAttribute('aria-label')).toBe('Empty box slot, row 1, column 1');
    expect(grid.children[15]?.getAttribute('data-question-set-answer')).toBe(box.id);
    expect(grid.querySelectorAll('button')).toHaveLength(1);
  });

  it('renders a full rack without placeholders and keeps every box answer available', () => {
    const layout = makeLayout();
    const rack = layout.freezerData.shelves[0]!.racks[0]!;
    const original = rack.boxSlots[0]!.box!;
    rack.boxSlots = Array.from({ length: 16 }, (_, index) => ({
      row: Math.floor(index / 4) + 1,
      column: index % 4 + 1,
      box: { ...original, id: index === 0 ? original.id : `full-rack-box-${index}` },
    }));
    saveLayout(layout);
    answerAndAdvance();
    toggleUserQuestionSetRack(rack.id);
    const root = view();
    expect(element(root, '.question-set-rack-capacity').textContent).toBe('16 / 16 boxes filled');
    expect(root.querySelectorAll('.tutorial-boxes > button')).toHaveLength(16);
    expect(root.querySelector('.question-set-box-slot')).toBeNull();
    expect(Array.from(root.querySelectorAll('.tutorial-box-target'), button => button.getAttribute('data-question-set-answer')))
      .toEqual(rack.boxSlots.map(slot => slot.box!.id));
  });

  it('places unordered samples at A1 and I9 without making unassigned positions answerable', () => {
    const layout = makeLayout();
    const box = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!;
    const firstPosition = box.positions[0]!;
    const unassignedPosition = box.positions[1]!;
    box.positions = [
      { ...firstPosition, id: 'position-i9', label: 'I9', row: 9, column: 9 },
      unassignedPosition,
      firstPosition,
    ];
    saveLayout(layout);
    sampleQuestion();
    toggleUserQuestionSetRack('layout-1-rack-1');
    toggleUserQuestionSetBox(box.id);
    const root = view();
    const grid = element(root, '.tutorial-sample-grid');
    expect(grid.children).toHaveLength(81);
    expect(grid.children[0]?.getAttribute('data-question-set-answer')).toBe(firstPosition.id);
    expect(grid.children[1]?.getAttribute('data-question-set-answer')).toBeNull();
    expect(grid.children[80]?.getAttribute('data-question-set-answer')).toBe('position-i9');
    expect(grid.children[80]?.textContent).toBe('I9');
    expect(grid.querySelectorAll('button')).toHaveLength(2);
    expect(element(root, '[data-question-set-answer="position-i9"]').getAttribute('aria-label'))
      .toBe('Select Serum, position I9');
  });

  it.each([
    ['#000000', '#ffffff'], ['#FFFFFF', '#18334d'], ['#abcdef', '#18334d'],
  ])('uses readable text on %s boxes and sample grids', (color, foreground) => {
    const layout = makeLayout();
    layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.color = color;
    saveLayout(layout);
    answerAndAdvance();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(element(view(), '.tutorial-box-target').style.getPropertyValue('--tutorial-box-foreground')).toBe(foreground);
    answerAndAdvance();
    toggleUserQuestionSetRack('layout-1-rack-1');
    toggleUserQuestionSetBox('layout-1-box-1');
    expect(element(view(), '.tutorial-sample-grid').style.getPropertyValue('--tutorial-box-foreground')).toBe(foreground);
  });

  it('escapes question prompts and set, layout, shelf, rack, box, and sample names', () => {
    const text = `<img src=x onerror="alert('x')"> & "quoted"`;
    const layout = makeLayout();
    layout.name = text;
    layout.freezerData.shelves[0]!.name = text;
    layout.freezerData.shelves[0]!.racks[0]!.name = text;
    layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.name = text;
    layout.freezerData.samples![0]!.name = text;
    saveLayout(layout);
    const set = makeQuestionSet({ name: text, description: text });
    set.questions.forEach(question => { question.prompt = text; });
    saveQuestionSet(set);
    expect(element(view(), 'h1').textContent).toBe(text);
    expect(element(view(), '.training-question h2').textContent).toBe(text);
    expect(element(view(), '.tutorial-map-content > h2').textContent).toBe(text);
    expect(element(view(), '.tutorial-shelf').getAttribute('aria-label')).toBe(text);
    expect(element(view(), '.tutorial-rack-target').textContent).toContain(text);
    answerAndAdvance();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(element(view(), '.tutorial-box-target').textContent).toBe(text);
    expect(view().querySelector('img, script, [onerror]')).toBeNull();
    answerAndAdvance();
    toggleUserQuestionSetRack('layout-1-rack-1');
    toggleUserQuestionSetBox('layout-1-box-1');
    expect(element(view(), '.tutorial-sample-target').title).toBe(text);
    expect(view().querySelector('img, script, [onerror]')).toBeNull();
    answerAndAdvance();
    expect(element(view(), 'h1').textContent).toBe(text);
    expect(view().querySelector('img, script, [onerror]')).toBeNull();
  });

  it('keeps the current question active when the selected target is incorrect', () => {
    submitQuestionSetAnswer('layout-1-rack-2');
    advanceQuestionSetRun();
    expect(element(view(), '.training-question h2').textContent).toBe('Find Rack 1');
    expect(element(view(), '[role="status"]').textContent).toContain('Incorrect. Try again. 1 of 3 misses.');
    expect(view().textContent).toContain('Score: 0 / 3');
  });

  it('requires a matching target and explicit Next to advance through all three types', () => {
    for (const [index, question] of makeQuestionSet().questions.entries()) {
      submitQuestionSetAnswer(question.targetId);
      expect(view().textContent).toContain(`Question ${index + 1} / 3`);
      expect(element(view(), '[role="status"]').textContent).toContain('Correct!');
      advanceQuestionSetRun();
    }
    expect(view().textContent).toContain('Score: 3 / 3 (100%)');
  });
});
