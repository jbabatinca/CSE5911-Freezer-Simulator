import type { QuestionSetQuestion, QuestionTargetType } from '../models/QuestionSet.js';
import type { SavedLayout } from '../models/SavedLayout.js';
import { getQuestionSet } from '../services/QuestionSetService.js';
import { getLayout } from '../services/StorageService.js';

let activeQuestionSetId: string | null = null;
let activeQuestionIndex = 0;
let runComplete = false;
let expandedRackId: string | null = null;
let expandedBoxId: string | null = null;

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
    expandedRackId = null;
    expandedBoxId = null;
}

export function submitQuestionSetAnswer(): void {
    if (runComplete || !getCurrentQuestion()) return;
    const questionSet = activeQuestionSetId ? getQuestionSet(activeQuestionSetId) : null;
    if (!questionSet) return;

    activeQuestionIndex++;
    runComplete = activeQuestionIndex >= questionSet.questions.length;
    expandedRackId = null;
    expandedBoxId = null;
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
        return '<section class="training-view"><p class="training-empty">This question set is no longer available.</p></section>';
    }

    if (questionSet.questions.length === 0) {
        return `
            <section class="training-view user-question-set-view">
                <p class="training-eyebrow">CUSTOM TRAINING SET</p>
                <h1>${escapeHtml(questionSet.name)}</h1>
                <p class="question-set-empty">This set does not contain any questions.</p>
            </section>
        `;
    }

    const layout = getLayout(questionSet.layoutId);
    if (!layout) {
        return `<section class="training-view"><h1>${escapeHtml(questionSet.name)}</h1><p class="training-empty">The source layout for this question set is no longer available.</p></section>`;
    }

    const question = getCurrentQuestion();
    if (runComplete || !question) {
        return `
            <section class="training-view tutorial-training user-question-set-view">
                <header class="training-heading training-active-heading">
                    <div>
                        <p class="training-eyebrow">CUSTOM TRAINING SET</p>
                        <h1>${escapeHtml(questionSet.name)}</h1>
                    </div>
                    <p class="tutorial-strikes">Set complete · ${questionSet.questions.length} questions</p>
                </header>
                <nav class="tutorial-levels question-set-progress" aria-label="Question progress">
                    ${questionSet.questions.map((item, index) => `<div class="tutorial-level is-complete" aria-current="false"><strong>Q${index + 1}</strong><span>${getQuestionTypeLabel(item.targetType)}</span></div>`).join('')}
                </nav>
                <section class="tutorial-completion">
                    <button type="button" id="btn-question-set-restart" class="btn-save">Run set again</button>
                </section>
            </section>
        `;
    }

    return `
        <section class="training-view tutorial-training user-question-set-view question-set-run-view">
            <header class="training-heading training-active-heading">
                <div>
                    <p class="training-eyebrow">CUSTOM TRAINING SET</p>
                    <h1>${escapeHtml(questionSet.name)}</h1>
                    <p>${escapeHtml(questionSet.description)}</p>
                </div>
                <p class="tutorial-strikes">Question ${activeQuestionIndex + 1} / ${questionSet.questions.length}</p>
            </header>
            <nav class="tutorial-levels question-set-progress" aria-label="Question progress">
                ${questionSet.questions.map((item, index) => {
                    const isCurrent = index === activeQuestionIndex;
                    const stateClass = isCurrent ? ' is-current' : index < activeQuestionIndex ? ' is-complete' : '';
                    return `<div class="tutorial-level${stateClass}" aria-current="${isCurrent ? 'step' : 'false'}"><strong>Q${index + 1}</strong><span>${getQuestionTypeLabel(item.targetType)}</span></div>`;
                }).join('')}
            </nav>
            <section class="training-question" aria-live="polite">
                <p class="training-prompt">QUESTION ${activeQuestionIndex + 1} · ${getQuestionTypeLabel(question.targetType).toUpperCase()}</p>
                <h2>${escapeHtml(question.prompt)}</h2>
            </section>
            <div class="tutorial-map-content">
                <h2>${escapeHtml(layout.name)}</h2>
                ${renderQuestionSetLayout(layout, question)}
            </div>
        </section>
    `;
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
                    ${shelf.racks.length === 0 ? '<p>No racks on this shelf.</p>' : `<ul class="tutorial-racks">${shelf.racks.map(rack => renderRack(layout, shelf.id, rack, question)).join('')}</ul>`}
                </section>
            `).join('')}
        </section>
    `;
}

function renderRack(layout: SavedLayout, shelfId: string, rack: SavedLayout['freezerData']['shelves'][number]['racks'][number], question: QuestionSetQuestion): string {
    const rackExpanded = expandedRackId === rack.id;
    const rackColor = isHexColor(rack.color) ? rack.color : '#FFFFFF';
    const contents = question.targetType !== 'rack' && rackExpanded
        ? `<div class="tutorial-boxes">${rack.boxSlots.map(slot => slot.box
            ? renderBox(layout, shelfId, rack, slot, question)
            : '').join('')}</div>`
        : '';

    return `
        <li class="tutorial-rack${rackExpanded ? ' is-expanded' : ''}" style="--tutorial-rack-color: ${rackColor}">
            ${question.targetType === 'rack'
                ? `<button type="button" class="tutorial-rack-target" data-question-set-answer="${escapeHtml(rack.id)}"><span class="tutorial-color-key" aria-hidden="true"></span><span>${escapeHtml(rack.name)}</span></button>`
                : `<button type="button" class="tutorial-rack-toggle" data-question-set-toggle-rack="${escapeHtml(rack.id)}" aria-expanded="${rackExpanded}"><span class="tutorial-color-key" aria-hidden="true"></span><span>${rackExpanded ? '▼' : '▶'} ${escapeHtml(rack.name)}</span></button>`}
            ${contents}
        </li>
    `;
}

function renderBox(layout: SavedLayout, shelfId: string, rack: SavedLayout['freezerData']['shelves'][number]['racks'][number], slot: SavedLayout['freezerData']['shelves'][number]['racks'][number]['boxSlots'][number], question: QuestionSetQuestion): string {
    const box = slot.box!;
    const rackId = rack.id;
    const rackColor = isHexColor(rack.color) ? rack.color : '#FFFFFF';
    const boxColor = isHexColor(box.color) ? box.color : '#FFFFFF';
    const boxForeground = getReadableTextColor(boxColor);
    if (question.targetType === 'box') {
        return `<button type="button" class="tutorial-box-target" style="--tutorial-box-color: ${boxColor}; --tutorial-box-foreground: ${boxForeground}" data-question-set-answer="${escapeHtml(box.id)}">${escapeHtml(box.name)}</button>`;
    }

    const boxExpanded = expandedBoxId === box.id;
    const boxDetails = question.targetType === 'sample' && boxExpanded
        ? renderSamplePositions(layout, box, boxColor, boxForeground)
        : '';
    return `
        <div class="tutorial-box${boxExpanded ? ' is-expanded' : ''}" style="--tutorial-box-color: ${boxColor}; --tutorial-box-foreground: ${boxForeground}">
            <button type="button" class="tutorial-box-toggle" data-question-set-toggle-box="${escapeHtml(box.id)}" aria-expanded="${boxExpanded}">${boxExpanded ? '▼' : '▶'} ${escapeHtml(box.name)}</button>
            ${boxDetails}
        </div>
    `;
}

function renderSamplePositions(layout: SavedLayout, box: NonNullable<SavedLayout['freezerData']['shelves'][number]['racks'][number]['boxSlots'][number]['box']>, boxColor: string, boxForeground: string): string {
    const samples = new Map((layout.freezerData.samples ?? []).map(sample => [sample.id, sample]));
    const positions = new Map(box.positions.map(position => [`${position.row}-${position.column}`, position]));
    let cells = '';

    for (let row = 1; row <= 9; row++) {
        for (let column = 1; column <= 9; column++) {
            const position = positions.get(`${row}-${column}`);
            if (!position) {
                cells += '<div class="tutorial-sample-empty" aria-hidden="true"></div>';
                continue;
            }

            const sampleName = position.sampleId ? samples.get(position.sampleId)?.name ?? position.sampleId : position.label;
            if (position.sampleId) {
                cells += `<button type="button" class="tutorial-sample-target" data-question-set-answer="${escapeHtml(position.id)}" title="${escapeHtml(sampleName)}" aria-label="Select ${escapeHtml(sampleName)}, position ${escapeHtml(position.label)}">${escapeHtml(position.label)}</button>`;
            } else {
                cells += '<div class="tutorial-sample-empty" aria-hidden="true"></div>';
            }
        }
    }

    return `<div class="tutorial-sample-grid" style="--tutorial-box-color: ${boxColor}; --tutorial-box-foreground: ${boxForeground}">${cells}</div>`;
}

function isHexColor(value: string | undefined): value is string {
    return value !== undefined && /^#[0-9a-fA-F]{6}$/.test(value);
}

function getReadableTextColor(hexColor: string): string {
    const red = parseInt(hexColor.slice(1, 3), 16);
    const green = parseInt(hexColor.slice(3, 5), 16);
    const blue = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
    return brightness > 150 ? '#18334d' : '#ffffff';
}
