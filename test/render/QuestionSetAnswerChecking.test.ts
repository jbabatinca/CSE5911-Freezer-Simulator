import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceQuestionSetRun, renderUserQuestionSetView, startQuestionSetRun,
  submitQuestionSetAnswer, toggleUserQuestionSetBox, toggleUserQuestionSetRack,
} from '../../src/render/QuestionSetRunView.js';
import { deleteQuestionSet, saveQuestionSet } from '../../src/services/QuestionSetService.js';
import { deleteLayout, saveLayout } from '../../src/services/StorageService.js';
import { element, makeLayout, makeQuestionSet, parseView } from '../helpers/questionSets.js';

const view = () => parseView(renderUserQuestionSetView('set-1'));
const feedback = () => element(view(), '#question-set-feedback').textContent;
const score = () => element(view(), '.question-set-score').textContent;

describe('Training answer checking and scoring', () => {
  beforeEach(() => {
    localStorage.clear();
    saveLayout(makeLayout());
    saveQuestionSet(makeQuestionSet());
    startQuestionSetRun('set-1');
  });

  it('cannot advance before answering and does not reveal the answer after one or two misses', () => {
    advanceQuestionSetRun();
    expect(view().textContent).toContain('Question 1 / 3');
    for (let miss = 1; miss <= 2; miss++) {
      submitQuestionSetAnswer('layout-1-rack-2');
      expect(feedback()).toContain(`${miss} of 3 misses`);
      expect(view().querySelector('.tutorial-rack-target.is-correct')).toBeNull();
      expect(element(view(), '.tutorial-rack-target.is-incorrect').getAttribute('data-question-set-answer')).toBe('layout-1-rack-2');
      expect(view().querySelector('#btn-question-set-next')).toBeNull();
      advanceQuestionSetRun();
      expect(view().textContent).toContain('Question 1 / 3');
    }
    expect(score()).toContain('Score: 0 / 3');
  });

  it('awards one point for a correct answer after two misses, locks answers, and resets misses on Next', () => {
    submitQuestionSetAnswer('layout-1-rack-2');
    submitQuestionSetAnswer('layout-1-rack-2');
    submitQuestionSetAnswer('layout-1-rack-1');
    expect(feedback()).toContain('Correct! One point earned.');
    expect(score()).toContain('Score: 1 / 3 · Misses: 2 / 3');
    expect(view().textContent).toContain('Question 1 / 3');
    expect(element(view(), '.is-correct[data-question-set-answer]').getAttribute('data-question-set-answer')).toBe('layout-1-rack-1');
    expect(Array.from(view().querySelectorAll<HTMLButtonElement>('[data-question-set-answer]')).every(button => button.disabled)).toBe(true);
    const answered = renderUserQuestionSetView('set-1');
    submitQuestionSetAnswer('layout-1-rack-1');
    submitQuestionSetAnswer('layout-1-rack-2');
    expect(renderUserQuestionSetView('set-1')).toBe(answered);
    advanceQuestionSetRun();
    advanceQuestionSetRun();
    expect(view().textContent).toContain('Question 2 / 3');
    expect(score()).toContain('Score: 1 / 3 · Misses: 0 / 3');
    expect(view().querySelector('.is-incorrect[data-question-set-answer]')).toBeNull();
  });

  it.each(makeQuestionSet().questions)('restarts the set after three incorrect $targetType answers', question => {
    saveQuestionSet(makeQuestionSet({ questions: [question] }));
    const wrongId = question.targetId.replace(/1$/, '2');
    toggleUserQuestionSetRack('layout-1-rack-2');
    toggleUserQuestionSetBox('layout-1-box-2');
    submitQuestionSetAnswer(wrongId);
    submitQuestionSetAnswer(wrongId);
    expect(feedback()).toContain('2 of 3 misses');
    expect(view().querySelector('#btn-question-set-next')).toBeNull();
    submitQuestionSetAnswer(wrongId);
    expect(view().textContent).toContain('Question 1 / 1');
    expect(feedback()).toContain('Three incorrect attempts. The entire question set has restarted');
    expect(score()).toContain('Score: 0 / 1 · Misses: 0 / 3');
    expect(view().querySelector('#btn-question-set-next')).toBeNull();
    expect(view().querySelector('.tutorial-rack-target.is-correct')).toBeNull();
    expect(view().querySelectorAll('.question-set-progress .is-complete')).toHaveLength(0);
  });

  it.each(['', 'unknown', 'layout-1-box-1', 'layout-1-position-1', 'layout-2-rack-1'])('ignores invalid or wrong-type selection "%s" without consuming an attempt', id => {
    const before = renderUserQuestionSetView('set-1');
    submitQuestionSetAnswer(id);
    expect(renderUserQuestionSetView('set-1')).toBe(before);
  });

  it('checks sample position IDs even if both positions contain the same specimen', () => {
    saveQuestionSet(makeQuestionSet({ questions: [makeQuestionSet().questions[2]!] }));
    submitQuestionSetAnswer('layout-1-sample');
    expect(score()).toContain('Misses: 0 / 3');
    submitQuestionSetAnswer('layout-1-position-2');
    expect(feedback()).toContain('Incorrect.');
    submitQuestionSetAnswer('layout-1-position-1');
    expect(feedback()).toContain('Correct!');
  });

  it('totals correct answers and misses in the completion screen and ignores late answers', () => {
    submitQuestionSetAnswer('layout-1-rack-2');
    submitQuestionSetAnswer('layout-1-rack-1');
    advanceQuestionSetRun();
    submitQuestionSetAnswer('layout-1-box-2');
    submitQuestionSetAnswer('layout-1-box-1');
    advanceQuestionSetRun();
    submitQuestionSetAnswer('layout-1-position-1');
    advanceQuestionSetRun();
    expect(score()).toBe('Score: 3 / 3 (100%)');
    expect(view().textContent).toContain('2 misses');
    expect(view().querySelectorAll('.question-set-progress .is-complete')).toHaveLength(3);
    expect(view().querySelectorAll('.question-set-progress .is-revealed')).toHaveLength(0);
    expect(view().querySelector('#btn-question-set-restart')).not.toBeNull();
    expect(view().querySelector('#btn-question-set-change')).not.toBeNull();
    const complete = renderUserQuestionSetView('set-1');
    submitQuestionSetAnswer('layout-1-position-1');
    advanceQuestionSetRun();
    expect(renderUserQuestionSetView('set-1')).toBe(complete);
  });

  it('clears score, feedback, misses, and results on restart or when starting another set', () => {
    for (let miss = 0; miss < 3; miss++) submitQuestionSetAnswer('layout-1-rack-2');
    advanceQuestionSetRun();
    submitQuestionSetAnswer('layout-1-box-1');
    startQuestionSetRun('set-1');
    expect(score()).toContain('Score: 0 / 3 · Misses: 0 / 3');
    expect(feedback()).toBe('Select the matching target in the freezer layout.');
    expect(view().querySelector('.is-revealed, .is-complete, #btn-question-set-next')).toBeNull();
    saveQuestionSet(makeQuestionSet({ id: 'set-2', questions: [makeQuestionSet().questions[2]!] }));
    startQuestionSetRun('set-2');
    const other = parseView(renderUserQuestionSetView('set-2'));
    expect(other.textContent).toContain('Question 1 / 1');
    expect(element(other, '.question-set-score').textContent).toContain('Score: 0 / 1 · Misses: 0 / 3');
  });

  it('rejects a stale target, provides recovery, and cannot score it', () => {
    const layout = makeLayout();
    layout.freezerData.shelves[0]!.racks.shift();
    saveLayout(layout);
    submitQuestionSetAnswer('layout-1-rack-1');
    expect(element(view(), '[role="alert"]').textContent).toContain('A question target is no longer available');
    expect(view().querySelector('[data-question-set-answer]')).toBeNull();
    expect(view().querySelector('#btn-question-set-change')).not.toBeNull();
    saveLayout(makeLayout());
    expect(score()).toContain('Score: 0 / 3 · Misses: 0 / 3');
  });

  it('handles missing layout and deleted set during submission and exposes Change set', () => {
    deleteLayout('layout-1');
    expect(() => submitQuestionSetAnswer('layout-1-rack-1')).not.toThrow();
    expect(view().textContent).toContain('The source layout');
    expect(view().querySelector('#btn-question-set-change')).not.toBeNull();
    deleteQuestionSet('set-1');
    expect(() => submitQuestionSetAnswer('layout-1-rack-1')).not.toThrow();
    expect(view().textContent).toContain('This question set is no longer available.');
    expect(view().querySelector('#btn-question-set-change')).not.toBeNull();
  });

  it('escapes a malicious rack name in the question layout', () => {
    const layout = makeLayout();
    const name = `<img src=x onerror="alert('x')"> & "quoted"`;
    layout.freezerData.shelves[0]!.racks[0]!.name = name;
    saveLayout(layout);
    expect(element(view(), '.tutorial-rack-target').textContent).toContain(name);
    expect(view().querySelector('img, script, [onerror]')).toBeNull();
  });

  it('does not display a different active set as if this run were complete', () => {
    saveQuestionSet(makeQuestionSet({ id: 'set-2' }));
    expect(parseView(renderUserQuestionSetView('set-2')).textContent).toContain('Choose this question set in Training Mode');
  });
});
