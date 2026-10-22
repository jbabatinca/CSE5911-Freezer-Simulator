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