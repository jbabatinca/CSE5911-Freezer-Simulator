export type QuestionTargetType = 'rack' | 'box' | 'sample';

export interface QuestionSetQuestion {
  id: string;
  targetType: QuestionTargetType;
  targetId: string;
  prompt: string;
}

export interface QuestionSet {
  id: string;
  name: string;
  description: string;
  layoutId: string;
  questions: QuestionSetQuestion[];
  createdAt: string;
  updatedAt: string;
}

/** A target's current location in its source layout. Sample targets use position IDs. */
export interface ResolvedQuestionTarget {
  id: string;
  targetType: QuestionTargetType;
  label: string;
  shelfId: string;
  rackId: string;
  boxId: string | null;
}

export interface QuestionSetResult {
  questionId: string;
  outcome: 'correct';
  misses: number;
  /** Milliseconds from the question being shown until it was answered correctly. */
  timeMs: number;
}
