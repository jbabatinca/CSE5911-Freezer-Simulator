import { getAllQuestionSets } from '../services/QuestionSetService.js';

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]!);
}

export function UserModeHomeView(): string {
    const questionSets = getAllQuestionSets();
    return `
    <div class="mode-home-view">
        <h2>User Mode</h2>
        <p>Practice freezer navigation with a guided tutorial.</p>

        <div class="mode-buttons">
            <button id="btn-freezer-layouts" class="mode-button">
                Layout View
            </button>
            <button id="btn-user-training" class="mode-button">
                Tutorial Mode
            </button>
        </div>
        <section class="user-question-set-launcher" aria-labelledby="custom-training-title">
            <h3 id="custom-training-title">Training Mode</h3>
            <p>Choose a question set to practice finding racks, boxes, and specimens. Your score is shown at the end.</p>
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
