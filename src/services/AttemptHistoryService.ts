/**
 * AttemptHistoryService.ts - persistence for Progress History.
 * Stores finished question-set attempts in the browser's localStorage under
 * the key "freezer-attempt-history". Data stays on this browser/device only.
 */
import type { AttemptRecord } from '../models/AttemptRecord.js';

// localStorage key holding the JSON array of AttemptRecords.
const KEY = 'freezer-attempt-history';
// Cap on stored attempts; the oldest are dropped first to keep localStorage small.
const MAX_ATTEMPTS = 100;

/** Returns all saved attempts, newest first. Returns [] if nothing is stored or the data is unreadable. */
export function getAttempts(): AttemptRecord[] {          // newest first
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) as AttemptRecord[] : [];
  } catch {
    return [];
  }
}

/** Adds `attempt` to the front of the history (trimmed to MAX_ATTEMPTS). Write failures are ignored. */
export function saveAttempt(attempt: AttemptRecord): void {
  const attempts = [attempt, ...getAttempts()].slice(0, MAX_ATTEMPTS);
  try {
    localStorage.setItem(KEY, JSON.stringify(attempts));
  } catch { /* storage full or blocked; skip silently */ }
}

/** Deletes the entire attempt history from localStorage. */
export function clearAttempts(): void {
  localStorage.removeItem(KEY);
}

/** Returns a new id like "attempt-<timestamp>-<random>"; unique enough for local use, not globally. */
export function generateAttemptId(): string {
  return `attempt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
