/** UserModeHomeView.ts - renders user navigation and the saved question-set launcher. */
import { getAllQuestionSets } from '../services/QuestionSetService.js';

/** Escapes a supplied string for HTML text or quoted attributes and returns the safe markup value. */
function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]!);
}

/** Takes no arguments and returns user-home HTML populated with saved question sets and an initially disabled Open button. */
export function UserModeHomeView(): string {
    // App.ts enables launching after a set is selected and handles navigation by element id.
    const questionSets = getAllQuestionSets();
    return `
    <div class="mode-home-view">
        <h2>Student Worker</h2>
        <p>Explore the freezer layout, follow a guided tutorial, or practice finding sample locations with a training question set. View your results in Progress History.</p>

        <div class="mode-buttons">
            <button id="btn-freezer-layouts" class="mode-button">
                Layout View
            </button>
            <button id="btn-user-training" class="mode-button">
                Tutorial Mode
            </button>
            <button id="btn-user-history" class="mode-button">Progress History</button>
        </div>
        <section class="user-question-set-launcher" aria-labelledby="custom-training-title">
            <h3 id="custom-training-title">Training Mode</h3>
            <p>Choose a question set to practice finding racks, boxes, and samples. Your score is shown at the end.</p>
            <label for="user-question-set-select">Question set</label>
            <div class="user-question-set-controls">
                <select id="user-question-set-select" ${questionSets.length === 0 ? 'disabled' : ''}>
                    <option value="" selected>Choose a question set</option>
                    ${questionSets.map(questionSet => `<option value="${escapeHtml(questionSet.id)}">${escapeHtml(questionSet.name)}</option>`).join('')}
                </select>
                <button id="btn-open-question-set" disabled>Open set</button>
            </div>
            ${questionSets.length === 0 ? '<p>No question sets are available yet.</p>' : ''}
        </section>
    </div>
    `;
}
