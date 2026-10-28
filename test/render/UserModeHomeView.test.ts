import { beforeEach, describe, expect, it } from 'vitest';
import { UserModeHomeView } from '../../src/render/UserModeHomeView.js';
import { saveQuestionSet } from '../../src/services/QuestionSetService.js';
import { element, makeQuestionSet, parseView } from '../helpers/questionSets.js';

describe('Custom training launcher', () => {
  beforeEach(() => localStorage.clear());

  it('shows the empty message with a disabled select and Open set button', () => {
    const root = parseView(UserModeHomeView());
    expect(root.textContent).toContain('No question sets are available yet.');
    expect(element<HTMLSelectElement>(root, '#user-question-set-select').disabled).toBe(true);
    expect(element<HTMLButtonElement>(root, '#btn-open-question-set').disabled).toBe(true);
  });

  it('lists all saved sets and keeps Open set disabled before a selection', () => {
    saveQuestionSet(makeQuestionSet());
    saveQuestionSet(makeQuestionSet({ id: 'set-2', name: 'Advanced' }));
    const root = parseView(UserModeHomeView());
    const select = element<HTMLSelectElement>(root, '#user-question-set-select');
    expect(select.disabled).toBe(false);
    expect(select.value).toBe('');
    expect(Array.from(select.options, option => [option.value, option.textContent])).toEqual([
      ['', 'Choose a question set'], ['set-1', 'Orientation'], ['set-2', 'Advanced'],
    ]);
    expect(element<HTMLButtonElement>(root, '#btn-open-question-set').disabled).toBe(true);
    expect(root.textContent).not.toContain('No question sets are available yet.');
  });

  it('escapes saved set names and option IDs', () => {
    const text = `<img src=x onerror="alert('x')"> & "quoted"`;
    saveQuestionSet(makeQuestionSet({ id: text, name: text }));
    const root = parseView(UserModeHomeView());
    const option = element<HTMLSelectElement>(root, 'select').options[1]!;
    expect(option.value).toBe(text);
    expect(option.textContent).toBe(text);
    expect(root.querySelector('img, script, [onerror]')).toBeNull();
  });
});
