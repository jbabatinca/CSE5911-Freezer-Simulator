/**
 * QuestionSet.ts - data shapes for saved custom training questions and run results.
 * Question sets refer to freezer-layout targets by id; sample targets use position ids.
 */

/** Freezer item kind a training question asks the user to locate. */
export type QuestionTargetType = 'rack' | 'box' | 'sample';

/** One question: its prompt and the rack, box, or sample-position id that is the answer. */
export interface QuestionSetQuestion {
  id: string;
  targetType: QuestionTargetType;
  targetId: string;
  prompt: string;
}

/** Saved training set, including its source layout id and ordered questions. */
export interface QuestionSet {
  id: string;
  name: string;
  description: string;
  layoutId: string;
  questions: QuestionSetQuestion[];
  createdAt: string;
  updatedAt: string;
}

/** Current location and display label of a target in its source layout; sample ids are position ids. */
export interface ResolvedQuestionTarget {
  id: string;
  targetType: QuestionTargetType;
  label: string;
  shelfId: string;
  rackId: string;
  boxId: string | null;
}

/** Correctly answered question result; time is measured in milliseconds. */
export interface QuestionSetResult {
  questionId: string;
  outcome: 'correct';
  misses: number;
  /** Milliseconds from the question being shown until it was answered correctly. */
  timeMs: number;
}
