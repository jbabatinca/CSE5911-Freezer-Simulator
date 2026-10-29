import type { QuestionSet, QuestionSetQuestion, QuestionTargetType } from '../models/QuestionSet.js';
import type { SavedLayout } from '../models/SavedLayout.js';
import { deleteQuestionSet, generateQuestionId, generateQuestionSetId, getAllQuestionSets, getQuestionSet, saveQuestionSet } from '../services/QuestionSetService.js';
import { getAllLayouts, getLayout } from '../services/StorageService.js';
import { getQuestionTargets as getTargets } from '../services/QuestionTargetService.js';

let draft: QuestionSet | null = null;
let editorError = '';
let expandedQuestionId: string | null = null;

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]!);
}

function getTargetTypeLabel(targetType: QuestionTargetType): string {
    return targetType === 'sample' ? 'Specimen' : targetType === 'rack' ? 'Rack' : 'Box';
}

export function startQuestionSetCreation(): void {
    const layouts = getAllLayouts();
    const now = new Date().toISOString();
    draft = {
        id: generateQuestionSetId(),
        name: '',
        description: '',
        layoutId: layouts[0]?.id ?? '',
        questions: [],
        createdAt: now,
        updatedAt: now
    };
    editorError = '';
    expandedQuestionId = null;
}

export function editQuestionSet(id: string): void {
    const questionSet = getQuestionSet(id);
    draft = questionSet ? JSON.parse(JSON.stringify(questionSet)) as QuestionSet : null;
    editorError = '';
    expandedQuestionId = draft?.questions[0]?.id ?? null;
}

export function cancelQuestionSetEditing(): void {
    draft = null;
    editorError = '';
    expandedQuestionId = null;
}

export function setQuestionSetName(name: string): void {
    if (draft) draft.name = name;
}

export function setQuestionSetDescription(description: string): void {
    if (draft) draft.description = description;
}

export function setQuestionSetLayout(layoutId: string): void {
    if (!draft) return;
    draft.layoutId = layoutId;
    const layout = getLayout(layoutId);
    if (!layout) return;
    draft.questions.forEach(question => {
        question.targetId = getTargets(layout, question.targetType)[0]?.id ?? '';
    });
}

export function addQuestionToSet(): void {
    if (!draft) return;
    const layout = getLayout(draft.layoutId);
    const firstRack = layout ? getTargets(layout, 'rack')[0] : undefined;
    const question: QuestionSetQuestion = {
        id: generateQuestionId(),
        targetType: 'rack',
        targetId: firstRack?.id ?? '',
        prompt: firstRack ? `Find ${firstRack.label.split(' / ').at(-1)}` : ''
    };
    draft.questions.push(question);
    expandedQuestionId = question.id;
    editorError = '';
}

export function toggleQuestionEditor(questionId: string): void {
    expandedQuestionId = expandedQuestionId === questionId ? null : questionId;
}

export function updateQuestionInSet(id: string, update: Partial<Pick<QuestionSetQuestion, 'prompt' | 'targetType' | 'targetId'>>): void {
    const question = draft?.questions.find(item => item.id === id);
    if (!question) return;
    if (update.targetType && update.targetType !== question.targetType) {
        question.targetType = update.targetType;
        const layout = getLayout(draft!.layoutId);
        question.targetId = layout ? getTargets(layout, update.targetType)[0]?.id ?? '' : '';
    }
    if (update.prompt !== undefined) question.prompt = update.prompt;
    if (update.targetId !== undefined) question.targetId = update.targetId;
    editorError = '';
}

export function removeQuestionFromSet(id: string): void {
    if (!draft) return;
    const removedIndex = draft.questions.findIndex(question => question.id === id);
    draft.questions = draft.questions.filter(question => question.id !== id);
    if (expandedQuestionId === id) {
        expandedQuestionId = draft.questions[Math.min(removedIndex, draft.questions.length - 1)]?.id ?? null;
    }
    editorError = '';
}

export function moveQuestionInSet(id: string, direction: -1 | 1): void {
    if (!draft) return;
    const index = draft.questions.findIndex(question => question.id === id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= draft.questions.length) return;
    [draft.questions[index], draft.questions[destination]] = [draft.questions[destination]!, draft.questions[index]!];
}

export function saveQuestionSetDraft(): boolean {
    if (!draft) return false;
    const layout = getLayout(draft.layoutId);
    if (!draft.name.trim()) {
        editorError = 'Enter a question set name.';
        return false;
    }
    if (!layout) {
        editorError = 'Choose a saved freezer layout.';
        return false;
    }
    if (draft.questions.length === 0) {
        editorError = 'Add at least one question.';
        return false;
    }

    const hasInvalidQuestion = draft.questions.some(question =>
        !question.prompt.trim() || !getTargets(layout, question.targetType).some(target => target.id === question.targetId)
    );
    if (hasInvalidQuestion) {
        editorError = 'Every question needs a prompt and a target from the selected layout.';
        return false;
    }

    draft.name = draft.name.trim();
    draft.description = draft.description.trim();
    draft.updatedAt = new Date().toISOString();
    saveQuestionSet(draft);
    draft = null;
    editorError = '';
    return true;
}

export function removeSavedQuestionSet(id: string): void {
    deleteQuestionSet(id);
}

function renderQuestionEditor(question: QuestionSetQuestion, index: number, layout: SavedLayout): string {
    const targets = getTargets(layout, question.targetType);
    const targetTypeOptions: QuestionTargetType[] = ['rack', 'box', 'sample'];
    const isExpanded = expandedQuestionId === question.id;
    const targetLabel = targets.find(target => target.id === question.targetId)?.label ?? 'Target unavailable';
    return `
        <article class="question-set-question${isExpanded ? ' is-expanded' : ''}">
            <header class="question-set-question-header">
                <button type="button" class="question-set-question-toggle" data-question-toggle="${question.id}" aria-expanded="${isExpanded}">
                    <span>Question ${index + 1}</span>
                    ${isExpanded ? '' : `<span class="question-set-question-summary">${escapeHtml(question.prompt || 'Untitled question')} · ${escapeHtml(getTargetTypeLabel(question.targetType))}: ${escapeHtml(targetLabel)}</span>`}
                </button>
                <div class="question-set-question-actions">
                    <button type="button" data-question-move="up" data-question-id="${question.id}" ${index === 0 ? 'disabled' : ''} aria-label="Move question ${index + 1} up">↑</button>
                    <button type="button" data-question-move="down" data-question-id="${question.id}" ${index === draft!.questions.length - 1 ? 'disabled' : ''} aria-label="Move question ${index + 1} down">↓</button>
                    <button type="button" data-question-remove="${question.id}" aria-label="Remove question ${index + 1}">Remove</button>
                </div>
            </header>
            ${isExpanded ? `
                <label class="question-set-field">
                    <span>Question type</span>
                    <select data-question-type="${question.id}">
                        ${targetTypeOptions.map(type => `<option value="${type}" ${question.targetType === type ? 'selected' : ''}>${getTargetTypeLabel(type)}</option>`).join('')}
                    </select>
                </label>
                <label class="question-set-field">
                    <span>Prompt</span>
                    <input type="text" maxlength="240" data-question-prompt="${question.id}" value="${escapeHtml(question.prompt)}" placeholder="Write the question prompt">
                </label>
                <label class="question-set-field">
                    <span>Layout target</span>
                    <select data-question-target="${question.id}" ${targets.length === 0 ? 'disabled' : ''}>
                        ${targets.length === 0 ? '<option value="">No targets of this type</option>' : targets.map(target => `<option value="${escapeHtml(target.id)}" ${target.id === question.targetId ? 'selected' : ''}>${escapeHtml(target.label)}</option>`).join('')}
                    </select>
                </label>
            ` : `<p class="question-set-question-collapsed-summary">${escapeHtml(question.prompt || 'Untitled question')}<span>${escapeHtml(getTargetTypeLabel(question.targetType))}: ${escapeHtml(targetLabel)}</span></p>`}
        </article>
    `;
}

function renderQuestionSetEditor(): string {
    const layouts = getAllLayouts();
    const selectedLayout = getLayout(draft!.layoutId);
    return `
        <section class="question-set-editor">
            <header class="question-set-editor-header">
                <div>
                    <p class="training-eyebrow">QUESTION SET CREATOR</p>
                    <h1>${draft!.name ? `Edit ${escapeHtml(draft!.name)}` : 'Create Question Set'}</h1>
                </div>
                <button type="button" id="btn-question-set-cancel">Back to question sets</button>
            </header>
            <div class="question-set-metadata">
                <label class="question-set-field">
                    <span>Set name</span>
                    <input id="question-set-name" type="text" maxlength="120" value="${escapeHtml(draft!.name)}" placeholder="e.g. Freezer Orientation">
                </label>
                <label class="question-set-field">
                    <span>Description / instructions</span>
                    <textarea id="question-set-description" rows="3" maxlength="1000" placeholder="Add instructions for this set">${escapeHtml(draft!.description)}</textarea>
                </label>
                <label class="question-set-field">
                    <span>Source layout</span>
                    <select id="question-set-layout" ${layouts.length === 0 ? 'disabled' : ''}>
                        ${layouts.length === 0 ? '<option value="">No saved layouts</option>' : layouts.map(layout => `<option value="${escapeHtml(layout.id)}" ${draft!.layoutId === layout.id ? 'selected' : ''}>${escapeHtml(layout.name)}</option>`).join('')}
                    </select>
                </label>
            </div>
            <div class="question-set-question-list">
                <header class="question-set-section-header">
                    <div><h2>Questions</h2><span>${draft!.questions.length} total</span></div>
                    <button type="button" id="btn-question-set-add" ${!selectedLayout ? 'disabled' : ''}>+ Add question</button>
                </header>
                ${draft!.questions.length === 0
                    ? '<p class="question-set-empty">Add a question and choose a target from the source layout.</p>'
                    : draft!.questions.map((question, index) => selectedLayout ? renderQuestionEditor(question, index, selectedLayout) : '').join('')}
            </div>
            ${editorError ? `<p class="question-set-error" role="alert">${escapeHtml(editorError)}</p>` : ''}
            <footer class="question-set-footer">
                <button type="button" id="btn-question-set-save" class="btn-save">Save question set</button>
            </footer>
        </section>
    `;
}

export function QuestionSetCreatorView(): string {
    if (draft) return renderQuestionSetEditor();

    const layouts = getAllLayouts();
    const questionSets = getAllQuestionSets();
    return `
        <section class="training-view question-set-creator">
            <header class="training-heading training-active-heading">
                <div>
                    <p class="training-eyebrow">ADMIN TRAINING</p>
                    <h1>Question Set Creator Mode</h1>
                    <p>Build reusable question sets from saved freezer layouts.</p>
                </div>
                <button type="button" id="btn-question-set-new" class="btn-save" ${layouts.length === 0 ? 'disabled' : ''}>Create question set</button>
            </header>
            ${layouts.length === 0 ? '<p class="training-empty">Create and save a freezer layout before building a question set.</p>' : ''}
            ${questionSets.length === 0
                ? '<p class="question-set-empty">No question sets yet.</p>'
                : `<div class="question-set-list">${questionSets.map(questionSet => `
                    <article class="question-set-card">
                        <div>
                            <h2>${escapeHtml(questionSet.name)}</h2>
                            <p>${escapeHtml(questionSet.description || 'No description')}</p>
                            <span>${escapeHtml(layouts.find(layout => layout.id === questionSet.layoutId)?.name ?? 'Layout unavailable')} · ${questionSet.questions.length} questions</span>
                        </div>
                        <div class="question-set-card-actions">
                            <button type="button" data-question-set-edit="${escapeHtml(questionSet.id)}">Edit</button>
                            <button type="button" data-question-set-delete="${escapeHtml(questionSet.id)}" class="btn-remove">Delete</button>
                        </div>
                    </article>
                `).join('')}</div>`}
        </section>
    `;
}

