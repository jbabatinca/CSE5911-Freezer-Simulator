import type { QuestionSetResult, QuestionTargetType } from './QuestionSet.js';

export type AttemptOutcome = 'completed' | 'failed-misses' | 'failed-time';

export interface AttemptQuestionResult extends QuestionSetResult {
  targetType: QuestionTargetType;
}

export interface AttemptRecord {
  id: string;
  questionSetId: string;
  questionSetName: string;   // snapshot, so renames or deletes don't break old entries
  startedAt: string;         // ISO date
  outcome: AttemptOutcome;
  score: number;
  totalQuestions: number;
  totalTimeMs: number;
  questions: AttemptQuestionResult[];
}
