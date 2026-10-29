import type { QuestionSetQuestion, QuestionSetResult, QuestionTargetType } from '../models/QuestionSet.js';
import type { SavedLayout } from '../models/SavedLayout.js';
import type { FreezerBox, FreezerBoxSlot, FreezerRack } from '../models/freezerLayout.js';
import { getQuestionSet } from '../services/QuestionSetService.js';
import { getLayout } from '../services/StorageService.js';
import { resolveQuestionTarget } from '../services/QuestionTargetService.js';
import { FREEZER_LAYOUT_LIMITS, isHexColor } from '../models/freezerLayout.js';

let activeQuestionSetId: string | null = null;
let activeQuestionIndex = 0;
let runComplete = false;
let expandedRackId: string | null = null;
let expandedBoxId: string | null = null;
let misses = 0;
let outcome: QuestionSetResult['outcome'] | null = null;
let selectedTargetId: string | null = null;
let results: QuestionSetResult[] = [];
let restartReason: 'misses' | 'time' | null = null;

const SET_TIME_LIMIT_MS = 120_000;
const LOW_TIME_MS = 20_000;
let setStartedAt = 0;
let questionStartedAt = 0;
let lastAnswerMs: number | null = null;
// Set once the final question is answered correctly so the countdown stops.
let frozenRemainingMs: number | null = null;

function resetQuestion(): void {
    misses = 0;
    outcome = null;
    selectedTargetId = null;
    expandedRackId = null;
    expandedBoxId = null;
    questionStartedAt = Date.now();
    lastAnswerMs = null;
}

export function getQuestionSetRemainingMs(): number {
    if (frozenRemainingMs !== null) return frozenRemainingMs;
    return Math.max(0, SET_TIME_LIMIT_MS - (Date.now() - setStartedAt));
}

export function formatQuestionSetTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
    return `${(ms / 1000).toFixed(1)}s`;
}

/** Restarts the run from question 1 when the countdown has expired. Returns true if it restarted. */
export function enforceQuestionSetTimeLimit(): boolean {
    if (!activeQuestionSetId || runComplete || frozenRemainingMs !== null || getQuestionSetRemainingMs() > 0) return false;
    startQuestionSetRun(activeQuestionSetId);
    restartReason = 'time';
    return true;
}

/** Updates the visible countdown in place. Returns true when the set restarted and needs a full re-render. */
export function refreshQuestionSetTimer(): boolean {
    if (enforceQuestionSetTimeLimit()) return true;
    const timer = document.getElementById('question-set-timer');
    if (!timer) return false;
    const remaining = getQuestionSetRemainingMs();
    const label = timer.querySelector('strong');
    if (label) label.textContent = formatQuestionSetTime(remaining);
    timer.classList.toggle('is-low', remaining <= LOW_TIME_MS);
    return false;
}

function getScore(): number {
    return results.filter(result => result.outcome === 'correct').length;
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]!);
}

function getCurrentQuestion(): QuestionSetQuestion | null {
    if (!activeQuestionSetId) return null;
    const questionSet = getQuestionSet(activeQuestionSetId);
    return questionSet?.questions[activeQuestionIndex] ?? null;
}

export function startQuestionSetRun(questionSetId: string): void {
    activeQuestionSetId = questionSetId;
    activeQuestionIndex = 0;
    runComplete = false;
    results = [];
    restartReason = null;
    setStartedAt = Date.now();
    frozenRemainingMs = null;
    resetQuestion();
}

export function submitQuestionSetAnswer(targetId: string): void {
    if (enforceQuestionSetTimeLimit()) return;
    if (runComplete || outcome) return;
    const question = getCurrentQuestion();
    const questionSet = activeQuestionSetId ? getQuestionSet(activeQuestionSetId) : null;
    const layout = questionSet ? getLayout(questionSet.layoutId) : null;
    if (!question || !layout) return;
    const target = resolveQuestionTarget(layout, question);
    const selection = resolveQuestionTarget(layout, { targetType: question.targetType, targetId });
    if (!target || !selection) return;

    restartReason = null;
    selectedTargetId = targetId;
    lastAnswerMs = Date.now() - questionStartedAt;
    if (targetId === target.id) outcome = 'correct';
    else {
        misses++;
        if (misses >= 3) {
            const questionSetId = activeQuestionSetId;
            if (questionSetId) {
                startQuestionSetRun(questionSetId);
                restartReason = 'misses';
            }
            return;
        }
    }
    if (outcome) {
        results.push({ questionId: question.id, outcome, misses, timeMs: lastAnswerMs ?? 0 });
        if (questionSet && activeQuestionIndex === questionSet.questions.length - 1) frozenRemainingMs = getQuestionSetRemainingMs();
        // Reveal nested answers even if the user was searching a different rack or box.
        expandedRackId = target.rackId;
        expandedBoxId = target.boxId;
    }
}

export function advanceQuestionSetRun(): void {
    if (enforceQuestionSetTimeLimit()) return;
    if (runComplete || !outcome) return;
    const questionSet = activeQuestionSetId ? getQuestionSet(activeQuestionSetId) : null;
    if (!questionSet) return;
    activeQuestionIndex++;
    runComplete = activeQuestionIndex >= questionSet.questions.length;
    resetQuestion();
}

export function toggleUserQuestionSetRack(rackId: string): void {
    expandedRackId = expandedRackId === rackId ? null : rackId;
    expandedBoxId = null;
}

export function toggleUserQuestionSetBox(boxId: string): void {
    expandedBoxId = expandedBoxId === boxId ? null : boxId;
}

export function renderUserQuestionSetView(questionSetId: string): string {
    const questionSet = getQuestionSet(questionSetId);
    if (!questionSet) {
        return renderRunError('This question set is no longer available.');
    }

    if (questionSet.questions.length === 0) {
        return `
            <section class="training-view user-question-set-view">
                <p class="training-eyebrow">CUSTOM TRAINING SET</p>
                <h1>${escapeHtml(questionSet.name)}</h1>
                <p class="question-set-empty">This set does not contain any questions.</p>
                ${renderChangeSetButton()}
            </section>
        `;
    }

    const layout = getLayout(questionSet.layoutId);
    if (!layout) {
        return renderRunError('The source layout for this question set is no longer available.', questionSet.name);
    }

    if (activeQuestionSetId !== questionSetId) {
        return renderRunError('Choose this question set in Training Mode to start a run.', questionSet.name);
    }
    enforceQuestionSetTimeLimit();
    const question = getCurrentQuestion();
    if (runComplete) {
        const totalMisses = results.reduce((total, result) => total + result.misses, 0);
        return `
            <section class="training-view tutorial-training user-question-set-view">
                <header class="training-heading training-active-heading">
                    <div>
                        <p class="training-eyebrow">CUSTOM TRAINING SET</p>
                        <h1>${escapeHtml(questionSet.name)}</h1>
                    </div>
                    <p class="tutorial-strikes">Set complete · ${questionSet.questions.length} questions · ${formatQuestionSetTime(getQuestionSetRemainingMs())} left</p>
                </header>
                <nav class="tutorial-levels question-set-progress" aria-label="Question progress">
                    ${questionSet.questions.map((item, index) => `<div class="tutorial-level is-complete" aria-current="false"><strong>Q${index + 1}</strong><span>${getQuestionTypeLabel(item.targetType)} · Correct</span></div>`).join('')}
                </nav>
                <section class="tutorial-completion" id="question-set-completion" tabindex="-1">
                    <h2>Training complete</h2>
                    <p class="question-set-score">Score: ${getScore()} / ${questionSet.questions.length} (${Math.round(getScore() / questionSet.questions.length * 100)}%)</p>
                    <p>${totalMisses} ${totalMisses === 1 ? 'miss' : 'misses'}</p>
                    <button type="button" id="btn-question-set-restart" class="btn-save">Run set again</button>
                    ${renderChangeSetButton()}
                </section>
            </section>
        `;
    }

    const target = question ? resolveQuestionTarget(layout, question) : null;
    if (!question || !target) {
        return renderRunError('A question target is no longer available in the source layout. Choose another set or ask an admin to update this set.', questionSet.name);
    }

    const remainingMs = getQuestionSetRemainingMs();
    return `
        <section class="training-view tutorial-training user-question-set-view question-set-run-view">
            <header class="training-heading training-active-heading">
                <div>
                    <p class="training-eyebrow">CUSTOM TRAINING SET</p>
                    <h1>${escapeHtml(questionSet.name)}</h1>
                    <p>${escapeHtml(questionSet.description)}</p>
                    ${renderChangeSetButton()}
                </div>
                <div class="question-set-status">
                    <p class="question-set-timer${remainingMs <= LOW_TIME_MS ? ' is-low' : ''}" id="question-set-timer" role="timer" aria-live="off"><span>Time left</span> <strong>${formatQuestionSetTime(remainingMs)}</strong></p>
                    <p class="tutorial-strikes">Question ${activeQuestionIndex + 1} / ${questionSet.questions.length}</p>
                </div>
            </header>
            <nav class="tutorial-levels question-set-progress" aria-label="Question progress">
                ${questionSet.questions.map((item, index) => {
                    const isCurrent = index === activeQuestionIndex;
                    const result = results[index];
                    const stateClass = isCurrent ? ' is-current' : index < activeQuestionIndex ? ' is-complete' : '';
                    return `<div class="tutorial-level${stateClass}" aria-current="${isCurrent ? 'step' : 'false'}"><strong>Q${index + 1}</strong><span>${getQuestionTypeLabel(item.targetType)}${result ? ' · Correct' : ''}</span></div>`;
                }).join('')}
            </nav>
            <section class="training-question" id="question-set-question-panel" tabindex="-1">
                <p class="training-prompt">QUESTION ${activeQuestionIndex + 1} · ${getQuestionTypeLabel(question.targetType).toUpperCase()}</p>
                <h2>${escapeHtml(question.prompt)}</h2>
                <p class="question-set-score">Score: ${getScore()} / ${questionSet.questions.length} · Misses: ${misses} / 3</p>
                <p class="question-set-rules">Earn one point by finding the target. You cannot continue until you answer correctly. Three incorrect attempts restart the entire question set.</p>
                <p id="question-set-feedback" tabindex="-1" class="training-feedback ${outcome === 'correct' ? 'is-correct' : selectedTargetId ? 'is-incorrect' : ''}" role="status">${outcome === 'correct'
                    ? `Correct! One point earned. ${renderElapsed('Time on this question')} Continue when you are ready.`
                    : restartReason === 'misses'
                        ? 'Three incorrect attempts. Restart from the beginning.'
                        : restartReason === 'time'
                            ? 'Time expired. Restart from the beginning.'
                            : selectedTargetId ? `Incorrect. Try again. ${misses} of 3 misses. ${renderElapsed('Time so far on this question')}` : 'Select the matching target in the freezer layout.'}</p>
                ${outcome ? `<button type="button" id="btn-question-set-next" class="btn-save">${activeQuestionIndex === questionSet.questions.length - 1 ? 'See results' : 'Next question'}</button>` : ''}
            </section>
            <div class="tutorial-map-content">
                <h2>${escapeHtml(layout.name)}</h2>
                ${renderQuestionSetLayout(layout, question)}
            </div>
        </section>
    `;
}

function renderElapsed(label: string): string {
    return lastAnswerMs === null ? '' : `<span class="question-set-time">${label}: ${formatDuration(lastAnswerMs)}.</span>`;
}

function renderChangeSetButton(): string {
    return '<button type="button" id="btn-question-set-change">Change set</button>';
}

function renderRunError(message: string, name = 'Training Mode'): string {
    return `<section class="training-view user-question-set-view"><h1>${escapeHtml(name)}</h1><p class="training-empty" role="alert">${escapeHtml(message)}</p>${renderChangeSetButton()}</section>`;
}

function answerAttributes(baseClass: string, targetId: string, question: QuestionSetQuestion): string {
    const correct = outcome !== null && targetId === question.targetId;
    const incorrect = targetId === selectedTargetId && targetId !== question.targetId;
    return `class="${baseClass}${correct ? ' is-correct' : incorrect ? ' is-incorrect' : ''}" data-question-set-answer="${escapeHtml(targetId)}" ${outcome ? 'disabled' : ''}`;
}

function getQuestionTypeLabel(targetType: QuestionTargetType): string {
    return targetType === 'sample' ? 'SPECIMEN' : targetType.toUpperCase();
}

function renderQuestionSetLayout(layout: SavedLayout, question: QuestionSetQuestion): string {
    return `
        <section class="tutorial-freezer" aria-label="Question set freezer layout">
            ${layout.freezerData.shelves.map(shelf => `
                <section class="tutorial-shelf" aria-label="${escapeHtml(shelf.name)}">
                    <header class="tutorial-shelf-header">
                        <span class="tutorial-shelf-label">SHELF</span>
                        <h2>${escapeHtml(shelf.name)}</h2>
                    </header>
                    ${shelf.racks.length === 0 ? '<p>No racks on this shelf.</p>' : `<ul class="tutorial-racks">${shelf.racks.map(rack => renderRack(layout, rack, question)).join('')}</ul>`}
                </section>
            `).join('')}
        </section>
    `;
}

function renderRack(layout: SavedLayout, rack: FreezerRack, question: QuestionSetQuestion): string {
    const rackExpanded = expandedRackId === rack.id;
    const rackColor = isHexColor(rack.color) ? rack.color : '#FFFFFF';
    const contents = question.targetType !== 'rack' && rackExpanded
        ? `<div class="tutorial-boxes">${rack.boxSlots.map(slot => slot.box
            ? renderBox(layout, slot, question)
            : '').join('')}</div>`
        : '';

    return `
        <li class="tutorial-rack${rackExpanded ? ' is-expanded' : ''}" style="--tutorial-rack-color: ${rackColor}">
            ${question.targetType === 'rack'
                ? `<button type="button" ${answerAttributes('tutorial-rack-target', rack.id, question)}><span class="tutorial-color-key" aria-hidden="true"></span><span>${escapeHtml(rack.name)}</span></button>`
                : `<button type="button" class="tutorial-rack-toggle" data-question-set-toggle-rack="${escapeHtml(rack.id)}" aria-expanded="${rackExpanded}"><span class="tutorial-color-key" aria-hidden="true"></span><span>${rackExpanded ? '▼' : '▶'} ${escapeHtml(rack.name)}</span></button>`}
            ${contents}
        </li>
    `;
}

function renderBox(layout: SavedLayout, slot: FreezerBoxSlot, question: QuestionSetQuestion): string {
    const box = slot.box!;
    const boxColor = isHexColor(box.color) ? box.color : '#FFFFFF';
    const boxForeground = getReadableTextColor(boxColor);
    if (question.targetType === 'box') {
        return `<button type="button" style="--tutorial-box-color: ${boxColor}; --tutorial-box-foreground: ${boxForeground}" ${answerAttributes('tutorial-box-target', box.id, question)}>${escapeHtml(box.name)}</button>`;
    }

    const boxExpanded = expandedBoxId === box.id;
    const boxDetails = question.targetType === 'sample' && boxExpanded
        ? renderSamplePositions(layout, box, boxColor, boxForeground, question)
        : '';
    return `
        <div class="tutorial-box${boxExpanded ? ' is-expanded' : ''}" style="--tutorial-box-color: ${boxColor}; --tutorial-box-foreground: ${boxForeground}">
            <button type="button" class="tutorial-box-toggle" data-question-set-toggle-box="${escapeHtml(box.id)}" aria-expanded="${boxExpanded}">${boxExpanded ? '▼' : '▶'} ${escapeHtml(box.name)}</button>
            ${boxDetails}
        </div>
    `;
}

function renderSamplePositions(layout: SavedLayout, box: FreezerBox, boxColor: string, boxForeground: string, question: QuestionSetQuestion): string {
    const samples = new Map((layout.freezerData.samples ?? []).map(sample => [sample.id, sample]));
    const positions = new Map(box.positions.map(position => [`${position.row}-${position.column}`, position]));
    let cells = '';

    for (let row = 1; row <= FREEZER_LAYOUT_LIMITS.boxRows; row++) {
        for (let column = 1; column <= FREEZER_LAYOUT_LIMITS.boxColumns; column++) {
            const position = positions.get(`${row}-${column}`);
            if (!position) {
                cells += '<div class="tutorial-sample-empty" aria-hidden="true"></div>';
                continue;
            }

            const sampleName = position.sampleId ? samples.get(position.sampleId)?.name ?? position.sampleId : position.label;
            if (position.sampleId) {
                cells += `<button type="button" title="${escapeHtml(sampleName)}" aria-label="Select ${escapeHtml(sampleName)}, position ${escapeHtml(position.label)}" ${answerAttributes('tutorial-sample-target', position.id, question)}>${escapeHtml(position.label)}</button>`;
            } else {
                cells += '<div class="tutorial-sample-empty" aria-hidden="true"></div>';
            }
        }
    }

    return `<div class="tutorial-sample-grid" style="--tutorial-box-color: ${boxColor}; --tutorial-box-foreground: ${boxForeground}">${cells}</div>`;
}

function getReadableTextColor(hexColor: string): string {
    const red = parseInt(hexColor.slice(1, 3), 16);
    const green = parseInt(hexColor.slice(3, 5), 16);
    const blue = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
    return brightness > 150 ? '#18334d' : '#ffffff';
}
