import { getAttempts } from '../services/AttemptHistoryService.js';
import type { AttemptOutcome } from '../models/AttemptRecord.js';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const OUTCOME_LABEL: Record<AttemptOutcome, string> = {
  'completed': 'Completed',
  'failed-misses': 'Failed · 3 misses',
  'failed-time': 'Failed · out of time'
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export function ProgressHistoryView(): string {
  const attempts = getAttempts();
  if (attempts.length === 0) {
    return `<div class="mode-home-view"><h2>Progress History</h2><p>No attempts yet. Finish a training set and it will show up here.</p></div>`;
  }

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
