import type { AttemptRecord } from '../models/AttemptRecord.js';

const KEY = 'freezer-attempt-history';
const MAX_ATTEMPTS = 100;

export function getAttempts(): AttemptRecord[] {          // newest first
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) as AttemptRecord[] : [];
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: AttemptRecord): void {
  const attempts = [attempt, ...getAttempts()].slice(0, MAX_ATTEMPTS);
  try {
    localStorage.setItem(KEY, JSON.stringify(attempts));
  } catch { /* storage full or blocked; skip silently */ }
}

export function clearAttempts(): void {
  localStorage.removeItem(KEY);
}

export function generateAttemptId(): string {
  return `attempt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
