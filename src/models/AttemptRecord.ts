/**
 * AttemptRecord.ts - data shape for the Progress History feature.
 * Describes a single finished question-set attempt. Records are persisted in
 * localStorage by services/AttemptHistoryService.ts and displayed by
 * render/ProgressHistoryView.ts.
 */
import type { QuestionSetResult, QuestionTargetType } from './QuestionSet.js';

/** How an attempt ended: finished, too many misses, or timer expired. */
export type AttemptOutcome = 'completed' | 'failed-misses' | 'failed-time';

/** Per-question result within an attempt: a QuestionSetResult plus the kind of target asked about. */
export interface AttemptQuestionResult extends QuestionSetResult {
  targetType: QuestionTargetType;
}

/**
 * One finished question-set run, as stored by AttemptHistoryService.
 * Name and timing are copied in at save time so history stays readable even
 * if the question set is later edited or deleted.
 */
export interface AttemptRecord {
  id: string;                // unique id from generateAttemptId()
  questionSetId: string;
  questionSetName: string;   // snapshot, so renames or deletes don't break old entries
  startedAt: string;         // ISO date
  outcome: AttemptOutcome;
  score: number;             // number of questions answered correctly
  totalQuestions: number;
  totalTimeMs: number;       // whole-run duration in milliseconds
  questions: AttemptQuestionResult[];
}
