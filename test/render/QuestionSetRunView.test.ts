import { beforeEach, describe, expect, it } from 'vitest';
import {
  renderUserQuestionSetView, startQuestionSetRun, submitQuestionSetAnswer,
  toggleUserQuestionSetBox, toggleUserQuestionSetRack,
} from '../../src/render/QuestionSetRunView.js';
import { deleteQuestionSet, saveQuestionSet } from '../../src/services/QuestionSetService.js';
import { deleteLayout, saveLayout } from '../../src/services/StorageService.js';
import { element, makeLayout, makeQuestionSet, parseView } from '../helpers/questionSets.js';

const view = () => parseView(renderUserQuestionSetView('set-1'));
const answers = () => Array.from(view().querySelectorAll('[data-question-set-answer]'), button => button.getAttribute('data-question-set-answer'));

describe('Question set run', () => {
  beforeEach(() => {
    localStorage.clear();
    saveLayout(makeLayout());
    saveQuestionSet(makeQuestionSet());
    startQuestionSetRun('set-1');
  });

  it('starts at question one and resets progress and expansion on restart', () => {
    submitQuestionSetAnswer();
    toggleUserQuestionSetRack('layout-1-rack-1');
    toggleUserQuestionSetBox('layout-1-box-1');
    startQuestionSetRun('set-1');
    expect(view().textContent).toContain('Question 1 / 3');
    expect(view().querySelectorAll('.question-set-progress .is-complete')).toHaveLength(0);
    expect(element(view(), '[aria-current="step"]').textContent).toContain('Q1');
    submitQuestionSetAnswer();
    expect(view().querySelector('.tutorial-boxes')).toBeNull();
    toggleUserQuestionSetRack('layout-1-rack-1');
    submitQuestionSetAnswer();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(view().querySelector('.tutorial-sample-grid')).toBeNull();
  });

  it('advances through each question, resets expansion, and completes after the last answer', () => {
    submitQuestionSetAnswer();
    expect(view().textContent).toContain('Question 2 / 3');
    expect(view().querySelectorAll('.question-set-progress .is-complete')).toHaveLength(1);
    expect(element(view(), '.training-question h2').textContent).toBe('Find Box 1');
    toggleUserQuestionSetRack('layout-1-rack-1');
    submitQuestionSetAnswer();
    expect(view().textContent).toContain('Question 3 / 3');
    expect(view().querySelector('.tutorial-boxes')).toBeNull();
    submitQuestionSetAnswer();
    expect(view().textContent).toContain('Set complete · 3 questions');
    expect(view().querySelectorAll('.question-set-progress .is-complete')).toHaveLength(3);
    expect(view().querySelector('[aria-current="step"]')).toBeNull();
    expect(element(view(), '#btn-question-set-restart').textContent).toBe('Run set again');
    expect(answers()).toEqual([]);
    const completed = renderUserQuestionSetView('set-1');
    submitQuestionSetAnswer();
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
    submitQuestionSetAnswer();
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
    submitQuestionSetAnswer();
    submitQuestionSetAnswer();
  }

  it('shows the sample grid only in the expanded box and answers by occupied position ID', () => {
    sampleQuestion();
    expect(answers()).toEqual([]);
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(view().querySelector('.tutorial-sample-grid')).toBeNull();
    toggleUserQuestionSetBox('layout-1-box-1');
    expect(view().querySelectorAll('.tutorial-sample-grid')).toHaveLength(1);
    expect(answers()).toEqual(['layout-1-position-1']);
    expect(element(view(), '.tutorial-sample-grid').children).toHaveLength(81);
    expect(view().querySelectorAll('.tutorial-sample-empty')).toHaveLength(80);
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
    submitQuestionSetAnswer();
    expect(answers()).toEqual([]);
    expect(view().querySelector('#btn-question-set-restart')).toBeNull();
  });

  it('renders an error if the set is deleted during a run', () => {
    deleteQuestionSet('set-1');
    expect(view().textContent).toContain('This question set is no longer available.');
    expect(() => submitQuestionSetAnswer()).not.toThrow();
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
    submitQuestionSetAnswer();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(element(view(), '.tutorial-rack').style.getPropertyValue('--tutorial-rack-color')).toBe('#FFFFFF');
    const box = element(view(), '.tutorial-box-target');
    expect(box.style.getPropertyValue('--tutorial-box-color')).toBe('#FFFFFF');
    expect(box.style.getPropertyValue('--tutorial-box-foreground')).toBe('#18334d');
    expect(view().querySelector('[onmouseover]')).toBeNull();
  });

  it('falls back to white for an invalid box color even when its rack has a valid color', () => {
    const layout = makeLayout();
    layout.freezerData.shelves[0]!.racks[0]!.color = '#000000';
    layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.color = 'red';
    saveLayout(layout);
    submitQuestionSetAnswer();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(element(view(), '.tutorial-box-target').style.getPropertyValue('--tutorial-box-color')).toBe('#FFFFFF');
  });

  it.each([
    ['#000000', '#ffffff'], ['#FFFFFF', '#18334d'], ['#abcdef', '#18334d'],
  ])('uses readable text on %s boxes and sample grids', (color, foreground) => {
    const layout = makeLayout();
    layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.color = color;
    saveLayout(layout);
    submitQuestionSetAnswer();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(element(view(), '.tutorial-box-target').style.getPropertyValue('--tutorial-box-foreground')).toBe(foreground);
    submitQuestionSetAnswer();
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
    layout.freezerData.samples[0]!.name = text;
    saveLayout(layout);
    const set = makeQuestionSet({ name: text, description: text });
    set.questions.forEach(question => { question.prompt = text; });
    saveQuestionSet(set);
    expect(element(view(), 'h1').textContent).toBe(text);
    expect(element(view(), '.training-question h2').textContent).toBe(text);
    expect(element(view(), '.tutorial-map-content > h2').textContent).toBe(text);
    expect(element(view(), '.tutorial-shelf').getAttribute('aria-label')).toBe(text);
    expect(element(view(), '.tutorial-rack-target').textContent).toContain(text);
    submitQuestionSetAnswer();
    toggleUserQuestionSetRack('layout-1-rack-1');
    expect(element(view(), '.tutorial-box-target').textContent).toBe(text);
    expect(view().querySelector('img, script, [onerror]')).toBeNull();
    submitQuestionSetAnswer();
    toggleUserQuestionSetRack('layout-1-rack-1');
    toggleUserQuestionSetBox('layout-1-box-1');
    expect(element(view(), '.tutorial-sample-target').title).toBe(text);
    expect(view().querySelector('img, script, [onerror]')).toBeNull();
    submitQuestionSetAnswer();
    expect(element(view(), 'h1').textContent).toBe(text);
    expect(view().querySelector('img, script, [onerror]')).toBeNull();
  });

  // The current submit API accepts no target ID and advances unconditionally.
  // Activate these when answer checking is implemented rather than locking in that behavior.
  it.todo('keeps the current question active when the selected target is incorrect');
  it.todo('advances only when the selected rack, box, or sample position matches the question target');
});
