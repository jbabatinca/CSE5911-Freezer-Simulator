/** QuestionSetCreatorView.ts - manages an unsaved question-set draft and renders the admin list/editor HTML. */
import type { QuestionSet, QuestionSetQuestion, QuestionTargetType } from '../models/QuestionSet.js';
import { DEFAULT_QUESTION_SET_TIME_LIMIT_SECONDS } from '../models/QuestionSet.js';
import type { SavedLayout } from '../models/SavedLayout.js';
import { deleteQuestionSet, generateQuestionId, generateQuestionSetId, getAllQuestionSets, getQuestionSet, getQuestionSetTimeLimitSeconds, saveQuestionSet } from '../services/QuestionSetService.js';
import { getAllLayouts, getLayout } from '../services/StorageService.js';
import { getQuestionTargets as getTargets } from '../services/QuestionTargetService.js';

// Draft edits stay in memory until save; App.ts wires actions using the rendered ids and data attributes.
let draft: QuestionSet | null = null;
let editorError = '';
let expandedQuestionId: string | null = null;
let timeLimitMinutes = String(Math.floor(DEFAULT_QUESTION_SET_TIME_LIMIT_SECONDS / 60));
let timeLimitSecondsInput = String(DEFAULT_QUESTION_SET_TIME_LIMIT_SECONDS % 60);

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

/** Returns the display label for a target type, using 'Sample' for the model's 'sample' type. */
function getTargetTypeLabel(targetType: QuestionTargetType): string {
    return targetType === 'sample' ? 'Sample' : targetType === 'rack' ? 'Rack' : 'Box';
}

/** Takes no arguments, starts a blank draft using the first saved layout when available, and returns nothing. */
export function startQuestionSetCreation(): void {
    const layouts = getAllLayouts();
    const now = new Date().toISOString();
    draft = {
        id: generateQuestionSetId(),
        name: '',
        description: '',
        layoutId: layouts[0]?.id ?? '',
        questions: [],
        timeLimitSeconds: DEFAULT_QUESTION_SET_TIME_LIMIT_SECONDS,
        createdAt: now,
        updatedAt: now
    };
    editorError = '';
    expandedQuestionId = null;
    timeLimitMinutes = String(Math.floor(DEFAULT_QUESTION_SET_TIME_LIMIT_SECONDS / 60));
    timeLimitSecondsInput = String(DEFAULT_QUESTION_SET_TIME_LIMIT_SECONDS % 60);
}

/** Loads the set with the supplied id into an editable draft, or clears it if missing; returns nothing. */
export function editQuestionSet(id: string): void {
    const questionSet = getQuestionSet(id);
    // Deep-copy nested questions so cancelling cannot alter the saved set.
    draft = questionSet ? JSON.parse(JSON.stringify(questionSet)) as QuestionSet : null;
    editorError = '';
    expandedQuestionId = draft?.questions[0]?.id ?? null;
    const timeLimit = getQuestionSetTimeLimitSeconds(draft);
    timeLimitMinutes = String(Math.floor(timeLimit / 60));
    timeLimitSecondsInput = String(timeLimit % 60);
}

/** Takes no arguments, discards the current draft and editor feedback, and returns nothing. */
export function cancelQuestionSetEditing(): void {
    draft = null;
    editorError = '';
    expandedQuestionId = null;
}

/** Assigns the supplied name to the draft when one exists; returns nothing. */
export function setQuestionSetName(name: string): void {
    if (draft) draft.name = name;
}

/** Assigns the supplied description to the draft when one exists; returns nothing. */
export function setQuestionSetDescription(description: string): void {
    if (draft) draft.description = description;
}

/** Updates the time-limit draft from the supplied minutes or seconds input. */
export function setQuestionSetTimeLimit(unit: 'minutes' | 'seconds', value: string): void {
    if (!draft) return;
    if (unit === 'minutes') timeLimitMinutes = value;
    else timeLimitSecondsInput = value;
}

/** Formats valid seconds with two digits, leaving incomplete or invalid input unchanged. */
export function formatTimeLimitSeconds(value: string): string {
    return /^\d+$/.test(value) && Number(value) <= 59 ? String(Number(value)).padStart(2, '0') : value;
}

/** Selects the supplied layout id and resets question targets if that layout exists; returns nothing. */
export function setQuestionSetLayout(layoutId: string): void {
    if (!draft) return;
    draft.layoutId = layoutId;
    const layout = getLayout(layoutId);
    if (!layout) return;
    // Targets belong to a layout; preserve prompts but replace ids with the first matching type, or ''.
    draft.questions.forEach(question => {
        question.targetId = getTargets(layout, question.targetType)[0]?.id ?? '';
    });
}

/** Takes no arguments, appends and expands a rack question in the current draft when present, and returns nothing. */
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

/** Expands the supplied question id, or collapses it if already open; returns nothing. */
export function toggleQuestionEditor(questionId: string): void {
    expandedQuestionId = expandedQuestionId === questionId ? null : questionId;
}

/** Applies the supplied prompt/type/target changes to the draft question with the given id; returns nothing. */
export function updateQuestionInSet(id: string, update: Partial<Pick<QuestionSetQuestion, 'prompt' | 'targetType' | 'targetId'>>): void {
    const question = draft?.questions.find(item => item.id === id);
    if (!question) return;
    // Changing type first chooses a compatible target; an explicit targetId in the update overrides it below.
    if (update.targetType && update.targetType !== question.targetType) {
        question.targetType = update.targetType;
        const layout = getLayout(draft!.layoutId);
        question.targetId = layout ? getTargets(layout, update.targetType)[0]?.id ?? '' : '';
    }
    if (update.prompt !== undefined) question.prompt = update.prompt;
    if (update.targetId !== undefined) question.targetId = update.targetId;
    editorError = '';
}

/** Removes the draft question with the supplied id and adjusts the expanded editor if needed; returns nothing. */
export function removeQuestionFromSet(id: string): void {
    if (!draft) return;
    const removedIndex = draft.questions.findIndex(question => question.id === id);
    draft.questions = draft.questions.filter(question => question.id !== id);
    if (expandedQuestionId === id) {
        expandedQuestionId = draft.questions[Math.min(removedIndex, draft.questions.length - 1)]?.id ?? null;
    }
    editorError = '';
}

/** Moves the draft question with the supplied id by -1 (up) or 1 (down), within list bounds; returns nothing. */
export function moveQuestionInSet(id: string, direction: -1 | 1): void {
    if (!draft) return;
    const index = draft.questions.findIndex(question => question.id === id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= draft.questions.length) return;
    [draft.questions[index], draft.questions[destination]] = [draft.questions[destination]!, draft.questions[index]!];
}

/** Takes no arguments and returns true after validating and saving the draft, or false if absent or invalid (with validation feedback). */
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
    const minutes = Number(timeLimitMinutes);
    const seconds = Number(timeLimitSecondsInput);
    // Store one total-seconds value so existing saved sets remain compatible.
    const timeLimitSeconds = minutes * 60 + seconds;
    if (!/^\d+$/.test(timeLimitMinutes) || !/^\d+$/.test(timeLimitSecondsInput) ||
        seconds > 59 || timeLimitSeconds <= 0 || !Number.isSafeInteger(timeLimitSeconds * 1000)) {
        editorError = 'Enter whole minutes and seconds from 0 to 59, with a time limit greater than zero.';
        return false;
    }
    if (draft.questions.length === 0) {
        editorError = 'Add at least one question.';
        return false;
    }

    // Require at least one question, nonblank prompts, and targets still present in the chosen layout.
    const hasInvalidQuestion = draft.questions.some(question =>
        !question.prompt.trim() || !getTargets(layout, question.targetType).some(target => target.id === question.targetId)
    );
    if (hasInvalidQuestion) {
        editorError = 'Every question needs a prompt and a target from the selected layout.';
        return false;
    }

    draft.name = draft.name.trim();
    draft.description = draft.description.trim();
    draft.timeLimitSeconds = timeLimitSeconds;
    draft.updatedAt = new Date().toISOString();
    saveQuestionSet(draft);
    draft = null;
    editorError = '';
    return true;
}

/** Deletes the saved question set with the supplied id from storage; returns nothing. */
export function removeSavedQuestionSet(id: string): void {
    deleteQuestionSet(id);
}

/** Takes a draft question, zero-based index, and source layout and returns its expanded or collapsed editor HTML. */
function renderQuestionEditor(question: QuestionSetQuestion, index: number, layout: SavedLayout): string {
    // The prompt input limits typing to 240 characters; programmatic updates are not length-checked here.
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

/** Takes no arguments and returns editor HTML for the active draft, including metadata, questions, and feedback. */
function renderQuestionSetEditor(): string {
    // Form fields cap name/description entry at 120/1000 characters; saving separately validates required values.
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
                <div class="question-set-field">
                    <span>Time limit</span>
                    <div class="question-set-time-controls">
                        <label class="question-set-field">
                            <span>Minutes</span>
                            <input id="question-set-time-minutes" type="number" min="0" step="1" required value="${escapeHtml(timeLimitMinutes)}">
                        </label>
                        <span class="question-set-time-separator" aria-hidden="true">:</span>
                        <label class="question-set-field">
                            <span>Seconds</span>
                            <input id="question-set-time-seconds" type="number" min="0" max="59" step="1" required value="${escapeHtml(formatTimeLimitSeconds(timeLimitSecondsInput))}">
                        </label>
                    </div>
                </div>
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

/** Takes no arguments and returns the active draft editor HTML, or the saved question-set list when no draft exists. */
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

