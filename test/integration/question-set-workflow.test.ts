import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/render/App.js';
import { cancelQuestionSetEditing } from '../../src/render/QuestionSetCreatorView.js';
import { getAllQuestionSets, getQuestionSet, saveQuestionSet } from '../../src/services/QuestionSetService.js';
import { saveLayout } from '../../src/services/StorageService.js';
import { switchToUserMode } from '../../src/state/authState.js';
import { getCurrentMode, initializeMode, setShowAdminPasswordModal, setShowAdminSettingsModal } from '../../src/state/modeState.js';
import type { QuestionTargetType } from '../../src/models/QuestionSet.js';
import { element, makeLayout, makeQuestionSet } from '../helpers/questionSets.js';

const button = (selector: string) => element<HTMLButtonElement>(document, selector);
const click = (selector: string) => button(selector).click();

function enter(selector: string, value: string, event = 'input') {
  element<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(document, selector).value = value;
  element(document, selector).dispatchEvent(new Event(event, { bubbles: true }));
}

function logIn() {
  click('#btn-admin-mode');
  enter('#admin-password-input', '123456');
  click('#btn-admin-login');
  expect(getCurrentMode()).toBe('admin-home');
  click('#btn-admin-training');
}

function chooseSet(id: string) {
  enter('#user-question-set-select', id, 'change');
  expect(button('#btn-open-question-set').disabled).toBe(false);
  click('#btn-open-question-set');
  expect(getCurrentMode()).toBe('question-set-user');
}

describe('Question set application workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    switchToUserMode();
    initializeMode('home');
    setShowAdminPasswordModal(false);
    setShowAdminSettingsModal(false);
    cancelQuestionSetEditing();
    document.body.innerHTML = '<main id="app"></main>';
    saveLayout(makeLayout());
    // Avoid random ID collisions when adding several questions in one test.
    let random = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => ++random / 1000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cancelQuestionSetEditing();
    document.body.innerHTML = '';
  });

  it('creates and saves a set as admin, then finds and completes it as user without reloading', () => {
    App();
    // Visit user home before creation so the later visit must read fresh storage.
    click('#btn-user-mode');
    expect(element(document, '.user-question-set-launcher').textContent).toContain('No question sets');
    click('#btn-home');
    logIn();
    click('#btn-question-set-new');
    expect(element<HTMLInputElement>(document, '#question-set-name').value).toBe('');
    enter('#question-set-name', 'Lab orientation');
    enter('#question-set-description', 'Practice all three target types');

    function addQuestion(type: QuestionTargetType, prompt: string, target: string) {
      click('#btn-question-set-add');
      enter('[data-question-type]', type, 'change');
      enter('[data-question-prompt]', prompt);
      enter('[data-question-target]', target, 'change');
    }
    addQuestion('rack', 'Choose rack two', 'layout-1-rack-2');
    addQuestion('box', 'Choose box one', 'layout-1-box-1');
    addQuestion('sample', 'Choose Serum at A1', 'layout-1-position-1');
    click('#btn-question-set-save');
    const sets = getAllQuestionSets();
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({
      name: 'Lab orientation', description: 'Practice all three target types',
      questions: [
        expect.objectContaining({ targetType: 'rack', targetId: 'layout-1-rack-2', prompt: 'Choose rack two' }),
        expect.objectContaining({ targetType: 'box', targetId: 'layout-1-box-1', prompt: 'Choose box one' }),
        expect.objectContaining({ targetType: 'sample', targetId: 'layout-1-position-1', prompt: 'Choose Serum at A1' }),
      ],
    });
    expect(document.querySelector('.question-set-editor')).toBeNull();

    // Navigate within the same App instance; no remount, reload, or module reset.
    click('#btn-back');
    click('#btn-logout');
    click('#btn-user-mode');
    expect(element(document, '#user-question-set-select').textContent).toContain('Lab orientation');
    expect(button('#btn-open-question-set').disabled).toBe(true);
    chooseSet(sets[0]!.id);
    expect(element(document, '.training-question h2').textContent).toBe('Choose rack two');
    click('[data-question-set-answer="layout-1-rack-2"]');
    expect(element(document, '.training-question h2').textContent).toBe('Choose box one');
    expect(document.querySelector('[data-question-set-answer]')).toBeNull();
    click('[data-question-set-toggle-rack="layout-1-rack-1"]');
    click('[data-question-set-answer="layout-1-box-1"]');
    expect(element(document, '.training-question h2').textContent).toBe('Choose Serum at A1');
    click('[data-question-set-toggle-rack="layout-1-rack-1"]');
    click('[data-question-set-toggle-box="layout-1-box-1"]');
    click('[data-question-set-answer="layout-1-position-1"]');
    expect(element(document, '#app').textContent).toContain('Set complete · 3 questions');
    expect(document.querySelectorAll('.question-set-progress .is-complete')).toHaveLength(3);
    click('#btn-question-set-restart');
    expect(element(document, '#app').textContent).toContain('Question 1 / 3');
    expect(document.querySelectorAll('.question-set-progress .is-complete')).toHaveLength(0);
    click('#btn-back');
    expect(getCurrentMode()).toBe('user-home');
    expect(element(document, '#user-question-set-select').textContent).toContain('Lab orientation');
  });

  it('enables Open set only while a set is selected and opens the selected set', () => {
    saveQuestionSet(makeQuestionSet());
    saveQuestionSet(makeQuestionSet({ id: 'set-2', name: 'Advanced' }));
    App();
    click('#btn-user-mode');
    expect(button('#btn-open-question-set').disabled).toBe(true);
    enter('#user-question-set-select', 'set-2', 'change');
    expect(button('#btn-open-question-set').disabled).toBe(false);
    enter('#user-question-set-select', '', 'change');
    expect(button('#btn-open-question-set').disabled).toBe(true);
    click('#btn-open-question-set');
    expect(getCurrentMode()).toBe('user-home');
    chooseSet('set-2');
    expect(element(document, '.user-question-set-view h1').textContent).toBe('Advanced');
    click('#btn-back');
    expect(getCurrentMode()).toBe('user-home');
  });

  it('loads a saved set through Edit, cancels changes, and saves an update without duplicating it', () => {
    const original = makeQuestionSet();
    saveQuestionSet(original);
    App();
    logIn();
    click('[data-question-set-edit="set-1"]');
    expect(element<HTMLInputElement>(document, '#question-set-name').value).toBe(original.name);
    expect(document.querySelectorAll('[data-question-toggle]')).toHaveLength(3);
    enter('#question-set-name', 'Discarded');
    click('#btn-question-set-cancel');
    expect(getQuestionSet(original.id)).toEqual(original);
    click('[data-question-set-edit="set-1"]');
    enter('#question-set-name', 'Updated orientation');
    enter('[data-question-prompt="q-rack"]', 'Updated prompt');
    click('[data-question-move="down"][data-question-id="q-rack"]');
    click('[data-question-remove="q-sample"]');
    click('#btn-question-set-save');
    expect(getAllQuestionSets()).toHaveLength(1);
    expect(getQuestionSet('set-1')).toMatchObject({
      name: 'Updated orientation',
      questions: [expect.objectContaining({ id: 'q-box' }), expect.objectContaining({ id: 'q-rack', prompt: 'Updated prompt' })],
    });
  });

  it('keeps an invalid draft open and does not create a saved set', () => {
    App();
    logIn();
    click('#btn-question-set-new');
    click('#btn-question-set-save');
    expect(element(document, '[role="alert"]').textContent).toBe('Enter a question set name.');
    expect(document.querySelector('.question-set-editor')).not.toBeNull();
    expect(getAllQuestionSets()).toEqual([]);
  });

  it('asks for confirmation before deleting and preserves the other set', () => {
    saveQuestionSet(makeQuestionSet());
    const other = makeQuestionSet({ id: 'keep', name: 'Keep this set' });
    saveQuestionSet(other);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    App();
    logIn();
    click('[data-question-set-delete="set-1"]');
    expect(confirm).toHaveBeenCalledExactlyOnceWith('Delete this question set?');
    expect(getAllQuestionSets()).toHaveLength(2);
    expect(document.querySelectorAll('.question-set-card')).toHaveLength(2);
    confirm.mockReturnValue(true);
    click('[data-question-set-delete="set-1"]');
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(getAllQuestionSets()).toEqual([other]);
    expect(document.querySelector('[data-question-set-edit="set-1"]')).toBeNull();
    expect(document.querySelector('[data-question-set-edit="keep"]')).not.toBeNull();
  });
});
