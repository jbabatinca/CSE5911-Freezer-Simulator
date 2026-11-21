import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteQuestionSet, generateQuestionId, generateQuestionSetId,
  getAllQuestionSets, getQuestionSet, getQuestionSetTimeLimitSeconds, saveQuestionSet,
} from '../../src/services/QuestionSetService.js';
import { makeQuestionSet } from '../helpers/questionSets.js';

describe('QuestionSetService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('returns an empty list for empty storage', () => {
    expect(getAllQuestionSets()).toEqual([]);
  });

  it('parses stored sets, including every question target type', () => {
    const sets = [makeQuestionSet(), makeQuestionSet({ id: 'set-2' })];
    localStorage.setItem('freezer-question-sets', JSON.stringify(sets));
    expect(getAllQuestionSets()).toEqual(sets);
  });

  it('persists new sets without overwriting existing sets', () => {
    const first = makeQuestionSet();
    const second = makeQuestionSet({ id: 'set-2', name: 'Advanced' });
    saveQuestionSet(first);
    saveQuestionSet(second);
    expect(JSON.parse(localStorage.getItem('freezer-question-sets')!)).toEqual([first, second]);
  });

  it('persists a configured time limit and defaults legacy or invalid limits', () => {
    const configured = makeQuestionSet({ timeLimitSeconds: 240 });
    saveQuestionSet(configured);
    expect(getQuestionSet('set-1')?.timeLimitSeconds).toBe(240);
    expect(getQuestionSetTimeLimitSeconds(getQuestionSet('set-1'))).toBe(240);
    expect(getQuestionSetTimeLimitSeconds(makeQuestionSet())).toBe(120);
    for (const timeLimitSeconds of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
      expect(getQuestionSetTimeLimitSeconds(makeQuestionSet({ timeLimitSeconds }))).toBe(120);
    }
  });

  it('replaces the set with the same ID and preserves unrelated sets', () => {
    const first = makeQuestionSet();
    const second = makeQuestionSet({ id: 'set-2' });
    saveQuestionSet(first);
    saveQuestionSet(second);
    const updated = { ...first, name: 'Updated', questions: [] };
    saveQuestionSet(updated);
    expect(getAllQuestionSets()).toEqual([updated, second]);
  });

  it('finds the matching ID and returns null for an unknown ID', () => {
    const set = makeQuestionSet();
    saveQuestionSet(makeQuestionSet({ id: 'other' }));
    saveQuestionSet(set);
    expect(getQuestionSet(set.id)).toEqual(set);
    expect(getQuestionSet('missing')).toBeNull();
  });

  it('deletes only the requested set and ignores unknown IDs', () => {
    const remaining = makeQuestionSet({ id: 'keep' });
    saveQuestionSet(makeQuestionSet());
    saveQuestionSet(remaining);
    deleteQuestionSet('set-1');
    expect(getAllQuestionSets()).toEqual([remaining]);
    deleteQuestionSet('missing');
    expect(getAllQuestionSets()).toEqual([remaining]);
    deleteQuestionSet('keep');
    expect(getAllQuestionSets()).toEqual([]);
  });

  it.each([generateQuestionSetId, generateQuestionId])('%s generates distinct IDs within the same millisecond', generate => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    // Controlled random values make this regression test reproducible.
    let value = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => ++value / 1000);
    const ids = Array.from({ length: 100 }, () => generate());
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
