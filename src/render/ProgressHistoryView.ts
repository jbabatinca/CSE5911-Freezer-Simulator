/**
 * ProgressHistoryView.ts - the Progress History screen.
 * Shows a summary and per-attempt details for question-set runs saved in
 * localStorage (see services/AttemptHistoryService.ts).
 */
import { getAttempts } from '../services/AttemptHistoryService.js';
import type { AttemptOutcome } from '../models/AttemptRecord.js';

// Escapes text before inserting it into HTML (question set names are user-typed), to prevent HTML injection.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// Display text for each AttemptOutcome. "3 misses" is the miss limit that fails a run.
const OUTCOME_LABEL: Record<AttemptOutcome, string> = {
  'completed': 'Completed',
  'failed-misses': 'Failed · 3 misses',
  'failed-time': 'Failed · out of time'
};

// Formats milliseconds as seconds with one decimal, e.g. 12345 -> "12.3s".
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/**
 * Renders the saved attempt history: a summary (attempt count, completion rate,
 * best time per question set) and an expandable list of attempts, newest first.
 * Takes no arguments (reads from AttemptHistoryService) and returns an HTML string.
 * The "Clear history" button (#btn-clear-history) is wired up in App.ts.
 */
export function ProgressHistoryView(): string {
  const attempts = getAttempts();
  if (attempts.length === 0) {
    return `<div class="mode-home-view"><h2>Progress History</h2><p>No attempts yet. Finish a training set and it will show up here.</p></div>`;
  }

  // Completion rate = completed attempts / all attempts, as a whole percent.
  const completed = attempts.filter(a => a.outcome === 'completed');
  const rate = Math.round(completed.length / attempts.length * 100);
  const bestTimes = new Map<string, number>();
  for (const a of completed) {
    const best = bestTimes.get(a.questionSetName);
    if (best === undefined || a.totalTimeMs < best) bestTimes.set(a.questionSetName, a.totalTimeMs);
  }

  return `
  <div class="mode-home-view progress-history">
    <h2>Progress History</h2>
    <section class="history-summary">
      <p><strong>${attempts.length}</strong> attempts · <strong>${rate}%</strong> completed</p>
      ${[...bestTimes].map(([name, ms]) => `<p>Best on ${escapeHtml(name)}: ${seconds(ms)}</p>`).join('')}
    </section>
    <ul class="history-list">
      ${attempts.map(a => `
        <li class="${a.outcome === 'completed' ? 'is-completed' : 'is-failed'}">
          <details>
            <summary>
              ${new Date(a.startedAt).toLocaleString()} · ${escapeHtml(a.questionSetName)} ·
              ${OUTCOME_LABEL[a.outcome]} · ${a.score}/${a.totalQuestions} · ${seconds(a.totalTimeMs)}
            </summary>
            <ol>
              ${a.questions.map(q => `<li>${q.targetType} · ${q.misses} miss(es) · ${seconds(q.timeMs)}</li>`).join('')}
            </ol>
          </details>
        </li>`).join('')}
    </ul>
    <button id="btn-clear-history">Clear history</button>
  </div>`;
}
