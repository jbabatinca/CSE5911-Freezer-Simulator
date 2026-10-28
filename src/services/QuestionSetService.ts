import type { QuestionSet } from '../models/QuestionSet.js';

const QUESTION_SET_STORAGE_KEY = 'freezer-question-sets';

export function getAllQuestionSets(): QuestionSet[] {
    const stored = localStorage.getItem(QUESTION_SET_STORAGE_KEY);
    return stored ? JSON.parse(stored) as QuestionSet[] : [];
}

export function getQuestionSet(id: string): QuestionSet | null {
    return getAllQuestionSets().find(questionSet => questionSet.id === id) ?? null;
}

export function saveQuestionSet(questionSet: QuestionSet): void {
    const questionSets = getAllQuestionSets();
    const existingIndex = questionSets.findIndex(existing => existing.id === questionSet.id);
    if (existingIndex >= 0) questionSets[existingIndex] = questionSet;
    else questionSets.push(questionSet);
    localStorage.setItem(QUESTION_SET_STORAGE_KEY, JSON.stringify(questionSets));
}

export function deleteQuestionSet(id: string): void {
    const questionSets = getAllQuestionSets().filter(questionSet => questionSet.id !== id);
    localStorage.setItem(QUESTION_SET_STORAGE_KEY, JSON.stringify(questionSets));
}

export function generateQuestionSetId(): string {
    return `question-set-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function generateQuestionId(): string {
    return `question-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}