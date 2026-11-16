/**
 * QuestionSetService.ts - reads and writes custom question sets in browser localStorage.
 * Question sets are stored together as a JSON array under one key.
 */
import type { QuestionSet } from '../models/QuestionSet.js';

// Keep this key stable so saved sets remain available across app sessions.
const QUESTION_SET_STORAGE_KEY = 'freezer-question-sets';

/** Takes no arguments; returns all saved question sets, or an empty array when none are stored. */
export function getAllQuestionSets(): QuestionSet[] {
    const stored = localStorage.getItem(QUESTION_SET_STORAGE_KEY);
    return stored ? JSON.parse(stored) as QuestionSet[] : [];
}

/** Takes set id `id`; returns the matching saved set or null. */
export function getQuestionSet(id: string): QuestionSet | null {
    return getAllQuestionSets().find(questionSet => questionSet.id === id) ?? null;
}

/** Takes `questionSet`, inserts or replaces it in localStorage, and returns nothing. */
export function saveQuestionSet(questionSet: QuestionSet): void {
    const questionSets = getAllQuestionSets();
    const existingIndex = questionSets.findIndex(existing => existing.id === questionSet.id);
    if (existingIndex >= 0) questionSets[existingIndex] = questionSet;
    else questionSets.push(questionSet);
    localStorage.setItem(QUESTION_SET_STORAGE_KEY, JSON.stringify(questionSets));
}

/** Takes set id `id`, removes it from localStorage, and returns nothing. */
export function deleteQuestionSet(id: string): void {
    const questionSets = getAllQuestionSets().filter(questionSet => questionSet.id !== id);
    localStorage.setItem(QUESTION_SET_STORAGE_KEY, JSON.stringify(questionSets));
}

/** Takes no arguments; returns a timestamp-and-random-suffix question-set id. */
export function generateQuestionSetId(): string {
    return `question-set-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/** Takes no arguments; returns a timestamp-and-random-suffix question id. */
export function generateQuestionId(): string {
    return `question-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}