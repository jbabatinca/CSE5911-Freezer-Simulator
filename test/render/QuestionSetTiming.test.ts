import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  advanceQuestionSetRun, refreshQuestionSetTimer, renderUserQuestionSetView,
  startQuestionSetRun, submitQuestionSetAnswer,
} from '../../src/render/QuestionSetRunView.js';
import { saveQuestionSet } from '../../src/services/QuestionSetService.js';
import { saveLayout } from '../../src/services/StorageService.js';
import { element, makeLayout, makeQuestionSet, parseView } from '../helpers/questionSets.js';

const view = () => parseView(renderUserQuestionSetView('set-1'));
const feedback = () => element(view(), '#question-set-feedback').textContent ?? '';
const timer = () => element(view(), '#question-set-timer strong').textContent;
const score = () => element(view(), '.question-set-score').textContent;

describe('Training timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    localStorage.clear();
    saveLayout(makeLayout());
    saveQuestionSet(makeQuestionSet());
    startQuestionSetRun('set-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts the set countdown at 2:00', () => {
    expect(timer()).toBe('2:00');
    expect(element(view(), '#question-set-timer').getAttribute('role')).toBe('timer');
  });

  it('shows non-zero elapsed time in the feedback area after an answer', () => {
    vi.advanceTimersByTime(3200);
    submitQuestionSetAnswer('layout-1-rack-2');
    expect(feedback()).toContain('Incorrect.');
    expect(feedback()).toContain('Time so far on this question: 3.2s');
    vi.advanceTimersByTime(1300);
    submitQuestionSetAnswer('layout-1-rack-1');
    expect(feedback()).toContain('Correct!');
    expect(feedback()).toContain('Time on this question: 4.5s');
  });

  it('times each question from when it is shown', () => {
    vi.advanceTimersByTime(10_000);
    submitQuestionSetAnswer('layout-1-rack-1');
    advanceQuestionSetRun();
    vi.advanceTimersByTime(2500);
    submitQuestionSetAnswer('layout-1-box-1');
    expect(feedback()).toContain('Time on this question: 2.5s');
  });

  it('keeps the countdown running across questions', () => {
    vi.advanceTimersByTime(10_000);
    expect(timer()).toBe('1:50');
    submitQuestionSetAnswer('layout-1-rack-1');
    advanceQuestionSetRun();
    expect(timer()).toBe('1:50');
    vi.advanceTimersByTime(5000);
    expect(view().textContent).toContain('Question 2 / 3');
    expect(timer()).toBe('1:45');
    refreshQuestionSetTimer();
  });

  it('flags low time and updates the live timer element in place', () => {
    document.body.innerHTML = renderUserQuestionSetView('set-1');
    vi.advanceTimersByTime(105_000);
    expect(refreshQuestionSetTimer()).toBe(false);
    expect(document.querySelector('#question-set-timer strong')?.textContent).toBe('0:15');
    expect(document.getElementById('question-set-timer')?.classList.contains('is-low')).toBe(true);
    document.body.innerHTML = '';
  });

  it('restarts at question 1 with 2:00 after the third incorrect answer', () => {
    vi.advanceTimersByTime(30_000);
    submitQuestionSetAnswer('layout-1-rack-1');
    advanceQuestionSetRun();
    vi.advanceTimersByTime(20_000);
    for (let miss = 0; miss < 3; miss++) submitQuestionSetAnswer('layout-1-box-2');
    expect(view().textContent).toContain('Question 1 / 3');
    expect(feedback()).toContain('Three incorrect attempts. Restart from the beginning.');
    expect(timer()).toBe('2:00');
  });

  it('restarts immediately when the countdown reaches 0:00 mid-set', () => {
    submitQuestionSetAnswer('layout-1-rack-1');
    advanceQuestionSetRun();
    vi.advanceTimersByTime(119_999);
    expect(timer()).toBe('0:01');
    expect(view().textContent).toContain('Question 2 / 3');
    vi.advanceTimersByTime(1);
    expect(refreshQuestionSetTimer()).toBe(true);
    expect(view().textContent).toContain('Question 1 / 3');
    expect(feedback()).toContain('Time expired. Restart from the beginning.');
    expect(timer()).toBe('2:00');
  });

  it('does not count an answer submitted after the countdown expired', () => {
    vi.advanceTimersByTime(121_000);
    submitQuestionSetAnswer('layout-1-rack-1');
    expect(score()).toContain('Score: 0 / 3');
    expect(view().textContent).toContain('Question 1 / 3');
    expect(view().querySelector('#btn-question-set-next')).toBeNull();
  });

  it('clears timing history and miss counters on any reset', () => {
    vi.advanceTimersByTime(4000);
    submitQuestionSetAnswer('layout-1-rack-2');
    submitQuestionSetAnswer('layout-1-rack-1');
    advanceQuestionSetRun();
    submitQuestionSetAnswer('layout-1-box-2');
    vi.advanceTimersByTime(120_000);
    expect(refreshQuestionSetTimer()).toBe(true);
    expect(score()).toContain('Score: 0 / 3 · Misses: 0 / 3');
    expect(feedback()).not.toContain('Time on this question');
    expect(feedback()).not.toContain('Time so far');
    expect(view().querySelectorAll('.question-set-progress .is-complete')).toHaveLength(0);

    for (let miss = 0; miss < 3; miss++) submitQuestionSetAnswer('layout-1-rack-2');
    expect(score()).toContain('Score: 0 / 3 · Misses: 0 / 3');
    expect(feedback()).not.toContain('Time on this question');
    expect(timer()).toBe('2:00');
  });

  it('stops the countdown once the final question is answered correctly', () => {
    submitQuestionSetAnswer('layout-1-rack-1');
    advanceQuestionSetRun();
    submitQuestionSetAnswer('layout-1-box-1');
    advanceQuestionSetRun();
    vi.advanceTimersByTime(30_000);
    submitQuestionSetAnswer('layout-1-position-1');
    vi.advanceTimersByTime(300_000);
    expect(refreshQuestionSetTimer()).toBe(false);
    expect(feedback()).toContain('Time on this question: 30.0s');
    advanceQuestionSetRun();
    expect(view().textContent).toContain('Training complete');
    expect(view().textContent).toContain('1:30 left');
  });
});
