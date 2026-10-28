import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as creator from '../../src/render/QuestionSetCreatorView.js';
import { getAllQuestionSets, getQuestionSet, saveQuestionSet } from '../../src/services/QuestionSetService.js';
import { saveLayout } from '../../src/services/StorageService.js';
import { element, makeLayout, makeQuestionSet, parseView } from '../helpers/questionSets.js';

const view = () => parseView(creator.QuestionSetCreatorView());
const input = (selector: string) => element<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(view(), selector);
const questionIds = () => Array.from(view().querySelectorAll('[data-question-toggle]'), button => button.getAttribute('data-question-toggle')!);

describe('Question set creator', () => {
  beforeEach(() => {
    localStorage.clear();
    creator.cancelQuestionSetEditing();
    saveLayout(makeLayout());
  });
  afterEach(() => vi.restoreAllMocks());

  function openSaved() {
    const set = makeQuestionSet();
    saveQuestionSet(set);
    creator.editQuestionSet(set.id);
    return set;
  }

  it('opens an empty draft using the first saved layout without saving it', () => {
    creator.startQuestionSetCreation();
    expect(input('#question-set-name').value).toBe('');
    expect(input('#question-set-description').value).toBe('');
    expect(input('#question-set-layout').value).toBe('layout-1');
    expect(questionIds()).toEqual([]);
    expect(view().textContent).toContain('Add a question');
    expect(getAllQuestionSets()).toEqual([]);
  });

  it('loads an existing set and discards edits when canceled', () => {
    const set = openSaved();
    expect(input('#question-set-name').value).toBe(set.name);
    expect(input('#question-set-description').value).toBe(set.description);
    expect(questionIds()).toEqual(set.questions.map(question => question.id));
    creator.setQuestionSetName('Unsaved change');
    creator.updateQuestionInSet('q-rack', { prompt: 'Unsaved prompt' });
    creator.cancelQuestionSetEditing();
    expect(view().querySelector('.question-set-editor')).toBeNull();
    expect(getQuestionSet(set.id)).toEqual(set);
    creator.editQuestionSet(set.id);
    expect(input('#question-set-name').value).toBe(set.name);
    expect(input('[data-question-prompt="q-rack"]').value).toBe(set.questions[0]!.prompt);
  });

  it('discards a new draft and handles editing an unknown set', () => {
    creator.startQuestionSetCreation();
    creator.setQuestionSetName('Discard me');
    creator.cancelQuestionSetEditing();
    expect(getAllQuestionSets()).toEqual([]);
    creator.editQuestionSet('missing');
    expect(view().querySelector('.question-set-editor')).toBeNull();
  });

  it('updates name, description, and layout', () => {
    saveLayout(makeLayout('layout-2'));
    creator.startQuestionSetCreation();
    creator.setQuestionSetName('New name');
    creator.setQuestionSetDescription('New instructions');
    creator.setQuestionSetLayout('layout-2');
    expect(input('#question-set-name').value).toBe('New name');
    expect(input('#question-set-description').value).toBe('New instructions');
    expect(input('#question-set-layout').value).toBe('layout-2');
  });

  it('replaces stale rack, box, and sample targets when the layout changes', () => {
    openSaved();
    saveLayout(makeLayout('layout-2'));
    creator.setQuestionSetLayout('layout-2');
    expect(creator.saveQuestionSetDraft()).toBe(true);
    expect(getQuestionSet('set-1')!.questions.map(question => question.targetId)).toEqual([
      'layout-2-rack-1', 'layout-2-box-1', 'layout-2-position-1',
    ]);
  });

  it('clears stale targets when the new layout has no matching targets', () => {
    openSaved();
    const empty = makeLayout('empty');
    empty.freezerData.shelves = [];
    saveLayout(empty);
    creator.setQuestionSetLayout(empty.id);
    expect(input('[data-question-target="q-rack"]').value).toBe('');
    expect(input('[data-question-target="q-rack"]').disabled).toBe(true);
    expect(creator.saveQuestionSetDraft()).toBe(false);
    expect(view().textContent).toContain('Every question needs a prompt and a target');
  });

  it('adds a default rack question and expands its editor', () => {
    creator.startQuestionSetCreation();
    creator.addQuestionToSet();
    expect(questionIds()).toHaveLength(1);
    const id = questionIds()[0]!;
    expect(input(`[data-question-type="${id}"]`).value).toBe('rack');
    expect(input(`[data-question-target="${id}"]`).value).toBe('layout-1-rack-1');
    expect(input(`[data-question-prompt="${id}"]`).value).toBe('Find Rack 1');
    expect(element(view(), '[data-question-toggle]').getAttribute('aria-expanded')).toBe('true');
  });

  it('updates a question prompt, type, and selected target', () => {
    openSaved();
    creator.updateQuestionInSet('q-rack', { prompt: 'Choose box two', targetType: 'box', targetId: 'layout-1-box-2' });
    expect(input('[data-question-prompt="q-rack"]').value).toBe('Choose box two');
    expect(input('[data-question-type="q-rack"]').value).toBe('box');
    expect(input('[data-question-target="q-rack"]').value).toBe('layout-1-box-2');
    expect(creator.saveQuestionSetDraft()).toBe(true);
    expect(getQuestionSet('set-1')!.questions[0]).toEqual({
      id: 'q-rack', prompt: 'Choose box two', targetType: 'box', targetId: 'layout-1-box-2',
    });
  });

  it.each([
    ['box', ['layout-1-box-1', 'layout-1-box-2']],
    ['sample', ['layout-1-position-1', 'layout-1-position-2']],
    ['rack', ['layout-1-rack-1', 'layout-1-rack-2']],
  ] as const)('refreshes target options for %s questions', (targetType, expected) => {
    openSaved();
    creator.updateQuestionInSet('q-rack', { targetType: 'sample' });
    creator.updateQuestionInSet('q-rack', { targetType });
    const select = element<HTMLSelectElement>(view(), '[data-question-target="q-rack"]');
    expect(Array.from(select.options, option => option.value)).toEqual(expected);
    expect(select.value).toBe(expected[0]);
  });

  it('removes only one question and expands a remaining question', () => {
    openSaved();
    creator.removeQuestionFromSet('q-rack');
    expect(questionIds()).toEqual(['q-box', 'q-sample']);
    expect(element(view(), '[data-question-toggle="q-box"]').getAttribute('aria-expanded')).toBe('true');
    creator.removeQuestionFromSet('missing');
    expect(questionIds()).toEqual(['q-box', 'q-sample']);
  });

  it('moves questions in both directions and ignores list boundaries and unknown IDs', () => {
    openSaved();
    creator.moveQuestionInSet('q-rack', -1);
    creator.moveQuestionInSet('q-sample', 1);
    creator.moveQuestionInSet('missing', 1);
    expect(questionIds()).toEqual(['q-rack', 'q-box', 'q-sample']);
    creator.moveQuestionInSet('q-rack', 1);
    expect(questionIds()).toEqual(['q-box', 'q-rack', 'q-sample']);
    creator.moveQuestionInSet('q-sample', -1);
    expect(questionIds()).toEqual(['q-box', 'q-sample', 'q-rack']);
    expect(element<HTMLButtonElement>(view(), '[data-question-move="up"][data-question-id="q-box"]').disabled).toBe(true);
    expect(element<HTMLButtonElement>(view(), '[data-question-move="down"][data-question-id="q-rack"]').disabled).toBe(true);
  });

  it.each([
    ['blank name', () => creator.setQuestionSetName('   '), 'Enter a question set name.'],
    ['missing layout', () => creator.setQuestionSetLayout(''), 'Choose a saved freezer layout.'],
    ['deleted layout', () => creator.setQuestionSetLayout('missing'), 'Choose a saved freezer layout.'],
    ['no questions', () => ['q-rack', 'q-box', 'q-sample'].forEach(creator.removeQuestionFromSet), 'Add at least one question.'],
    ['blank prompt', () => creator.updateQuestionInSet('q-box', { prompt: '  ' }), 'Every question needs a prompt'],
    ['missing target', () => creator.updateQuestionInSet('q-box', { targetId: '' }), 'Every question needs a prompt'],
    ['invalid target', () => creator.updateQuestionInSet('q-box', { targetId: 'layout-1-rack-1' }), 'Every question needs a prompt'],
  ])('does not persist a draft with %s', (_label, invalidate, message) => {
    const original = openSaved();
    const write = vi.spyOn(localStorage, 'setItem');
    invalidate();
    expect(creator.saveQuestionSetDraft()).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(getQuestionSet(original.id)).toEqual(original);
    expect(element(view(), '[role="alert"]').textContent).toContain(message);
  });

  it('does not save without a draft', () => {
    expect(creator.saveQuestionSetDraft()).toBe(false);
    expect(getAllQuestionSets()).toEqual([]);
  });

  it('saves a valid new draft, trims metadata, and closes the editor', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'));
      creator.startQuestionSetCreation();
      creator.setQuestionSetName('  New set  ');
      creator.setQuestionSetDescription('  Instructions  ');
      creator.addQuestionToSet();
      vi.setSystemTime(new Date('2026-02-02T00:00:00.000Z'));
      expect(creator.saveQuestionSetDraft()).toBe(true);
      expect(getAllQuestionSets()).toEqual([expect.objectContaining({
        name: 'New set', description: 'Instructions', layoutId: 'layout-1',
        createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-02T00:00:00.000Z',
        questions: [expect.objectContaining({ targetType: 'rack', targetId: 'layout-1-rack-1' })],
      })]);
      expect(view().querySelector('.question-set-editor')).toBeNull();
      expect(view().querySelectorAll('.question-set-card')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('deletes a saved set and renders the empty state', () => {
    saveQuestionSet(makeQuestionSet());
    creator.removeSavedQuestionSet('set-1');
    expect(getAllQuestionSets()).toEqual([]);
    expect(view().textContent).toContain('No question sets yet.');
  });

  it('renders a disabled creator and layout select when no layouts exist', () => {
    localStorage.clear();
    expect(element<HTMLButtonElement>(view(), '#btn-question-set-new').disabled).toBe(true);
    expect(view().textContent).toContain('Create and save a freezer layout');
    creator.startQuestionSetCreation();
    expect(input('#question-set-layout').disabled).toBe(true);
    expect(element<HTMLButtonElement>(view(), '#btn-question-set-add').disabled).toBe(true);
  });

  it('escapes user text in the list, metadata, prompts, and target options', () => {
    const text = `<img src=x onerror="alert('x')"> & "quoted"`;
    const layout = makeLayout();
    layout.name = text;
    layout.freezerData.shelves[0]!.name = text;
    layout.freezerData.shelves[0]!.racks[0]!.name = text;
    saveLayout(layout);
    const set = makeQuestionSet({ name: text, description: `</textarea>${text}` });
    set.questions[0]!.prompt = text;
    saveQuestionSet(set);
    const list = view();
    expect(element(list, '.question-set-card h2').textContent).toBe(text);
    expect(list.querySelector('img, script, [onerror]')).toBeNull();
    creator.editQuestionSet(set.id);
    expect(input('#question-set-name').value).toBe(text);
    expect(input('#question-set-description').value).toBe(`</textarea>${text}`);
    expect(input('[data-question-prompt="q-rack"]').value).toBe(text);
    expect(element(view(), '[data-question-target] option').textContent).toContain(text);
    expect(view().querySelector('img, script, [onerror]')).toBeNull();
    creator.toggleQuestionEditor('q-rack');
    expect(element(view(), '.question-set-question-collapsed-summary').textContent).toContain(text);
    expect(view().querySelector('img, script, [onerror]')).toBeNull();
  });
});
