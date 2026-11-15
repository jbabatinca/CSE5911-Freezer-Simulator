import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAttempts, generateAttemptId, getAttempts, saveAttempt,
} from '../../src/services/AttemptHistoryService.js';
import type { AttemptRecord } from '../../src/models/AttemptRecord.js';

function makeAttempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id: 'attempt-1',
    questionSetId: 'set-1',
    questionSetName: 'Orientation',
    startedAt: '2026-01-01T00:00:00.000Z',
    outcome: 'completed',
    score: 3,
    totalQuestions: 3,
    totalTimeMs: 45_000,
    questions: [],
    ...overrides,
  };
}

describe('AttemptHistoryService', () => {
  beforeEach(() => localStorage.clear());

  it('returns an empty list when nothing is stored', () => {
    expect(getAttempts()).toEqual([]);
  });

  it('returns the newest attempt first', () => {
    saveAttempt(makeAttempt({ id: 'old' }));
    saveAttempt(makeAttempt({ id: 'new' }));
    expect(getAttempts().map(a => a.id)).toEqual(['new', 'old']);
  });

  it('keeps only the 100 most recent attempts', () => {
    for (let i = 0; i < 105; i++) saveAttempt(makeAttempt({ id: `attempt-${i}` }));
    const attempts = getAttempts();
    expect(attempts).toHaveLength(100);
    expect(attempts[0]?.id).toBe('attempt-104');
    expect(attempts[99]?.id).toBe('attempt-5');

  });

  it('returns an empty list instead of throwing on corrupt data', () => {
    localStorage.setItem('freezer-attempt-history', '{not valid json');
    expect(getAttempts()).toEqual([]);
  });

  it('clears all attempts', () => {
    saveAttempt(makeAttempt());
    clearAttempts();
    expect(getAttempts()).toEqual([]);
  });

  it('generates distinct IDs', () => {
    expect(generateAttemptId()).not.toBe(generateAttemptId());
  });
});
