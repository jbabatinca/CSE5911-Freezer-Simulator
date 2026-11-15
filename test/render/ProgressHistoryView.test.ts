import { beforeEach, describe, expect, it } from 'vitest';
import { ProgressHistoryView } from '../../src/render/ProgressHistoryView.js';
import { saveAttempt } from '../../src/services/AttemptHistoryService.js';
import type { AttemptRecord } from '../../src/models/AttemptRecord.js';
import { parseView } from '../helpers/questionSets.js';

function makeAttempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    id: 'a1', questionSetId: 's', questionSetName: 'Orientation',
    startedAt: '2026-01-01T00:00:00.000Z', outcome: 'completed',
    score: 3, totalQuestions: 3, totalTimeMs: 45_000, questions: [],
    ...overrides,
  };
}

describe('ProgressHistoryView', () => {
  beforeEach(() => localStorage.clear());

  it('shows an empty message when there are no attempts', () => {
    expect(parseView(ProgressHistoryView()).textContent).toContain('No attempts yet');
  });

  it('lists one row per attempt', () => {
    saveAttempt(makeAttempt({ id: 'a1' }));
    saveAttempt(makeAttempt({ id: 'a2' }));
    expect(parseView(ProgressHistoryView()).querySelectorAll('.history-list > li')).toHaveLength(2);
  });

  it('escapes the question set name', () => {
    saveAttempt(makeAttempt({ questionSetName: '<b>Set</b>' }));
    const root = parseView(ProgressHistoryView());
    expect(root.querySelector('.history-list b')).toBeNull();   // HTML was escaped, not injected
    expect(root.textContent).toContain('<b>Set</b>');
  });

  it('marks completed attempts green and failed attempts red', () => {
    saveAttempt(makeAttempt({ id: 'ok', outcome: 'completed' }));
    saveAttempt(makeAttempt({ id: 'miss', outcome: 'failed-misses' }));
    saveAttempt(makeAttempt({ id: 'time', outcome: 'failed-time' }));
    const rows = [...parseView(ProgressHistoryView()).querySelectorAll('.history-list > li')];
    // Newest first: time, miss, ok
    expect(rows.map(r => r.className)).toEqual(['is-failed', 'is-failed', 'is-completed']);
  });

  it('shows the per-question breakdown inside each attempt', () => {
    saveAttempt(makeAttempt({
      questions: [{ questionId: 'q1', outcome: 'correct', misses: 1, timeMs: 4_500, targetType: 'rack' }],
    }));
    expect(parseView(ProgressHistoryView()).textContent).toContain('rack · 1 miss(es) · 4.5s');
  });
});
