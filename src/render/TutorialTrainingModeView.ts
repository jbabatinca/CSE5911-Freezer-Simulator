/** TutorialTrainingModeView.ts - runs and renders a ten-level (L1-L10) tutorial that asks one randomly drawn question per level, using a fixed practice freezer. */
import { FREEZER_LAYOUT_LIMITS } from '../models/freezerLayout.js';

/** Identifies which kind of freezer item a tutorial question asks the user to find. */
type TutorialTargetType = 'rack' | 'box' | 'sample';
/** Restricts feedback to the supported answer, progress, and completion display states. */
type FeedbackKind = 'correct' | 'incorrect' | 'progress' | 'complete';

/** Describes a practice sample with its id, name, and one-based position within a box. */
interface TutorialSample {
    id: string;
    name: string;
    row: number;
    column: number;
}

/** Describes a colored practice box, its one-based rack position, and its sample contents. */
interface TutorialBox {
    id: string;
    name: string;
    row: number;
    column: number;
    color: string;
    samples: TutorialSample[];
}

/** Describes a colored practice rack and the boxes it contains. */
interface TutorialRack {
    id: string;
    name: string;
    color: string;
    boxes: TutorialBox[];
}

/** Names one stored question by the kind and id of the practice target it asks for. */
export interface TutorialQuestionDefinition {
    type: TutorialTargetType;
    targetId: string;
}

/** Holds a target type and id, prompt, selection instructions, and readable answer address for a question. */
interface TutorialQuestion {
    type: TutorialTargetType;
    targetId: string;
    prompt: string;
    detail: string;
    address: string;
}

// Practice data is independent of saved layouts; tutorial progress stays in memory for this page session.
const tutorialShelf = {
    id: 'tutorial-shelf-1',
    name: 'Shelf 1',
    racks: [
        {
            id: 'tutorial-rack-1',
            name: 'Project 1',
            color: '#2878b8',
            boxes: [
                {
                    id: 'tutorial-box-1',
                    name: 'P1B1',
                    row: 1,
                    column: 1,
                    color: '#42a889',
                    samples: [
                        { id: 'tutorial-sample-1001', name: 'Sample 1001', row: 1, column: 1 },
                        { id: 'tutorial-sample-1002', name: 'Sample 1002', row: 3, column: 2 },
                        { id: 'tutorial-sample-1003', name: 'Sample 1003', row: 4, column: 4 }
                    ]
                },
                {
                    id: 'tutorial-box-2',
                    name: 'P1B2',
                    row: 1,
                    column: 2,
                    color: '#d2a82b',
                    samples: [
                        { id: 'tutorial-sample-1004', name: 'Sample 1004', row: 2, column: 3 },
                        { id: 'tutorial-sample-1005', name: 'Sample 1005', row: 5, column: 5 },
                        { id: 'tutorial-sample-1006', name: 'Sample 1006', row: 8, column: 7 }
                    ]
                }
            ]
        },
        {
            id: 'tutorial-rack-2',
            name: 'Project 2',
            color: '#bd692f',
            boxes: [
                {
                    id: 'tutorial-box-3',
                    name: 'P2B1',
                    row: 1,
                    column: 1,
                    color: '#8c73b5',
                    samples: [
                        { id: 'tutorial-sample-2001', name: 'Sample 2001', row: 2, column: 1 },
                        { id: 'tutorial-sample-2002', name: 'Sample 2002', row: 4, column: 6 },
                        { id: 'tutorial-sample-2003', name: 'Sample 2003', row: 6, column: 8 }
                    ]
                },
                {
                    id: 'tutorial-box-4',
                    name: 'P2B2',
                    row: 1,
                    column: 2,
                    color: '#d97945',
                    samples: [
                        { id: 'tutorial-sample-2004', name: 'Sample 2004', row: 1, column: 9 },
                        { id: 'tutorial-sample-2005', name: 'Sample 2005', row: 5, column: 1 },
                        { id: 'tutorial-sample-2006', name: 'Sample 2006', row: 9, column: 9 }
                    ]
                }
            ]
        },
        {
            id: 'tutorial-rack-3',
            name: 'Project 3',
            color: '#318272',
            boxes: [
                {
                    id: 'tutorial-box-5',
                    name: 'P3B1',
                    row: 1,
                    column: 1,
                    color: '#5997bf',
                    samples: [
                        { id: 'tutorial-sample-3001', name: 'Sample 3001', row: 1, column: 2 },
                        { id: 'tutorial-sample-3002', name: 'Sample 3002', row: 3, column: 4 },
                        { id: 'tutorial-sample-3003', name: 'Sample 3003', row: 7, column: 5 }
                    ]
                },
                {
                    id: 'tutorial-box-6',
                    name: 'P3B2',
                    row: 1,
                    column: 2,
                    color: '#c77b8f',
                    samples: [
                        { id: 'tutorial-sample-3004', name: 'Sample 3004', row: 2, column: 2 },
                        { id: 'tutorial-sample-3005', name: 'Sample 3005', row: 5, column: 6 },
                        { id: 'tutorial-sample-3006', name: 'Sample 3006', row: 9, column: 8 }
                    ]
                }
            ]
        }
    ] satisfies TutorialRack[]
};

/** Number of levels (L1-L10) in one tutorial run; each level shows exactly one question. */
export const TUTORIAL_LEVEL_COUNT = 10;

const rackQuestion = (targetId: string): TutorialQuestionDefinition => ({ type: 'rack', targetId });
const boxQuestion = (targetId: string): TutorialQuestionDefinition => ({ type: 'box', targetId });
const sampleQuestion = (targetId: string): TutorialQuestionDefinition => ({ type: 'sample', targetId });

// L1-L2 ask for racks, L3-L5 for boxes, and L6-L10 for samples; targets repeat across levels because the practice freezer is small.
/** Stores the three candidate questions for each level, indexed by level number minus one; one is drawn per level each run. */
export const TUTORIAL_QUESTION_BANK: readonly (readonly TutorialQuestionDefinition[])[] = [
    [rackQuestion('tutorial-rack-1'), rackQuestion('tutorial-rack-2'), rackQuestion('tutorial-rack-3')],
    [rackQuestion('tutorial-rack-2'), rackQuestion('tutorial-rack-3'), rackQuestion('tutorial-rack-1')],
    [boxQuestion('tutorial-box-1'), boxQuestion('tutorial-box-3'), boxQuestion('tutorial-box-5')],
    [boxQuestion('tutorial-box-2'), boxQuestion('tutorial-box-4'), boxQuestion('tutorial-box-6')],
    [boxQuestion('tutorial-box-3'), boxQuestion('tutorial-box-5'), boxQuestion('tutorial-box-2')],
    [sampleQuestion('tutorial-sample-1001'), sampleQuestion('tutorial-sample-2002'), sampleQuestion('tutorial-sample-3003')],
    [sampleQuestion('tutorial-sample-1004'), sampleQuestion('tutorial-sample-2005'), sampleQuestion('tutorial-sample-3006')],
    [sampleQuestion('tutorial-sample-1002'), sampleQuestion('tutorial-sample-2003'), sampleQuestion('tutorial-sample-3004')],
    [sampleQuestion('tutorial-sample-1005'), sampleQuestion('tutorial-sample-2006'), sampleQuestion('tutorial-sample-3001')],
    [sampleQuestion('tutorial-sample-1003'), sampleQuestion('tutorial-sample-2004'), sampleQuestion('tutorial-sample-3005')]
];

const LEVEL_TITLES: Record<TutorialTargetType, string> = {
    rack: 'Find the rack',
    box: 'Find the box',
    sample: 'Find the sample'
};

// One-based level number; questions are drawn once per run, not per level.
let currentLevel = 1;
let sessionQuestions: TutorialQuestion[] = [];
let wrongAnswersThisLevel = 0;
let currentQuestion: TutorialQuestion | null = null;
let selectedTargetId: string | null = null;
let questionStartedAt = 0;
let tutorialStartedAt = 0;
let feedbackMessage = '';
let feedbackKind: FeedbackKind = 'progress';
let tutorialComplete = false;
let expandedRackId: string | null = null;
let expandedBoxId: string | null = null;

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

/** Takes a nonempty array and returns one randomly selected item. */
function choose<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)]!;
}

/** Takes no arguments and returns all practice boxes paired with their containing racks. */
function getBoxes(): { rack: TutorialRack; box: TutorialBox }[] {
    return tutorialShelf.racks.flatMap(rack => rack.boxes.map(box => ({ rack, box })));
}

/** Takes no arguments and returns all practice samples paired with their containing racks and boxes. */
function getSamples(): { rack: TutorialRack; box: TutorialBox; sample: TutorialSample }[] {
    return getBoxes().flatMap(({ rack, box }) => box.samples.map(sample => ({ rack, box, sample })));
}

/** Converts a sample's one-based row and column into a position label such as A1 and returns it. */
function samplePosition(sample: TutorialSample): string {
    return `${String.fromCharCode(64 + sample.row)}${sample.column}`;
}

/** Takes a stored question definition and returns the prompt, instructions, and answer address built from the practice freezer. */
function buildQuestion(definition: TutorialQuestionDefinition): TutorialQuestion {
    const { type, targetId } = definition;
    if (type === 'rack') {
        const rack = tutorialShelf.racks.find(item => item.id === targetId)!;
        return {
            type,
            targetId,
            prompt: `Find ${rack.name}`,
            detail: 'Select the matching rack.',
            address: `${tutorialShelf.name} / ${rack.name}`
        };
    }
    if (type === 'box') {
        const { rack, box } = getBoxes().find(item => item.box.id === targetId)!;
        return {
            type,
            targetId,
            prompt: `Find ${box.name}`,
            detail: 'Select the matching box.',
            address: `${tutorialShelf.name} / ${rack.name} / ${box.name}`
        };
    }
    const { rack, box, sample } = getSamples().find(item => item.sample.id === targetId)!;
    return {
        type,
        targetId,
        prompt: `Find ${sample.name}`,
        detail: 'Select the matching sample position.',
        address: `${tutorialShelf.name} / ${rack.name} / ${box.name} / Position ${samplePosition(sample)}`
    };
}

/** Takes no arguments and returns one randomly drawn question for each level, in level order. */
function pickSessionQuestions(): TutorialQuestion[] {
    return TUTORIAL_QUESTION_BANK.map(candidates => buildQuestion(choose([...candidates])));
}

/** Takes no arguments, shows the session's question for the current level and resets question timing and selection, and returns nothing. */
function startQuestion(): void {
    currentQuestion = sessionQuestions[currentLevel - 1]!;
    questionStartedAt = Date.now();
    selectedTargetId = null;
    expandedRackId = null;
    expandedBoxId = null;
}

/** Takes no arguments, draws a fresh question for every level, resets progress and total timing, and starts level one; returns nothing. */
export function startTrainingTutorial(): void {
    currentLevel = 1;
    sessionQuestions = pickSessionQuestions();
    wrongAnswersThisLevel = 0;
    tutorialStartedAt = Date.now();
    feedbackMessage = '';
    feedbackKind = 'progress';
    tutorialComplete = false;
    startQuestion();
}

/** Checks the supplied target id, updates feedback and level progress when the tutorial is active, and returns nothing. */
export function answerTrainingTarget(targetId: string): void {
    if (!currentQuestion || tutorialComplete) return;
    selectedTargetId = targetId;
    const elapsed = ((Date.now() - questionStartedAt) / 1000).toFixed(1);

    if (targetId === currentQuestion.targetId) {
        wrongAnswersThisLevel = 0;
        if (currentLevel === TUTORIAL_LEVEL_COUNT) {
            tutorialComplete = true;
            feedbackKind = 'complete';
            const totalElapsed = ((Date.now() - tutorialStartedAt) / 1000).toFixed(1);
            feedbackMessage = `Correct. ${currentQuestion.address}. Tutorial completed in ${totalElapsed} seconds.`;
            return;
        }

        currentLevel++;
        feedbackKind = 'correct';
        feedbackMessage = `Correct. ${currentQuestion.address}. Answered in ${elapsed} seconds. Advancing to L${currentLevel}.`;
        startQuestion();
        return;
    }

    // Three misses within one level restart at L1 with newly drawn questions so the revealed answer is not replayed; the overall timer keeps running.
    wrongAnswersThisLevel++;
    if (wrongAnswersThisLevel === 3) {
        feedbackKind = 'progress';
        feedbackMessage = `Three incorrect answers. Returning to L1. The answer was ${currentQuestion.address}.`;
        currentLevel = 1;
        sessionQuestions = pickSessionQuestions();
        wrongAnswersThisLevel = 0;
        startQuestion();
        return;
    }

    feedbackKind = 'incorrect';
    feedbackMessage = `Not quite. ${wrongAnswersThisLevel} of 3 misses at this level. Try again.`;
}

/** Toggles expansion of the supplied rack id and closes any expanded box; returns nothing. */
export function toggleTrainingRack(rackId: string): void {
    expandedRackId = expandedRackId === rackId ? null : rackId;
    expandedBoxId = null;
}

/** Toggles expansion of the supplied box id; returns nothing. */
export function toggleTrainingBox(boxId: string): void {
    expandedBoxId = expandedBoxId === boxId ? null : boxId;
}

/** Returns the feedback CSS suffix for the supplied target id, or an empty string outside incorrect-answer feedback. */
function targetClass(targetId: string): string {
    if (feedbackKind !== 'incorrect' || !selectedTargetId) return '';
    if (selectedTargetId === targetId) return ' is-incorrect';
    return currentQuestion?.targetId === targetId ? ' is-correct' : '';
}

/** Takes a practice box and its rack and returns sample-grid HTML with selectable occupied positions. */
function renderSampleGrid(box: TutorialBox, rack: TutorialRack): string {
    // Use the shared model's box dimensions so empty cells preserve the real freezer's position grid.
    const samplesByPosition = new Map(box.samples.map(sample => [`${sample.row}-${sample.column}`, sample]));
    const boxColor = getBoxColor(box, rack);
    let cells = '';
    for (let row = 1; row <= FREEZER_LAYOUT_LIMITS.boxRows; row++) {
        for (let column = 1; column <= FREEZER_LAYOUT_LIMITS.boxColumns; column++) {
            const sample = samplesByPosition.get(`${row}-${column}`);
            if (!sample) {
                cells += '<div class="tutorial-sample-empty" aria-hidden="true"></div>';
                continue;
            }
            const label = samplePosition(sample);
            cells += `<button type="button" class="tutorial-sample-target${targetClass(sample.id)}" data-training-target="${escapeHtml(sample.id)}" aria-label="${escapeHtml(sample.name)}, position ${label}" title="${escapeHtml(sample.name)}">${label}</button>`;
        }
    }
    return `<div class="tutorial-sample-grid" style="--tutorial-box-color: ${boxColor}; --tutorial-box-foreground: ${getReadableTextColor(boxColor)}">${cells}</div>`;
}

/** Takes a box and its rack and returns a valid box color, falling back to the rack color and then white. */
function getBoxColor(box: TutorialBox, rack: TutorialRack): string {
    if (isHexColor(box.color)) return box.color;
    return isHexColor(rack.color) ? rack.color : '#FFFFFF';
}

/** Takes a box and its rack and returns an answer button for box questions or an expansion button for sample questions. */
function renderBox(box: TutorialBox, rack: TutorialRack): string {
    const boxColor = getBoxColor(box, rack);
    const boxForeground = getReadableTextColor(boxColor);
    if (currentQuestion?.type === 'box') {
        return `<button type="button" class="tutorial-box-target${targetClass(box.id)}" style="--tutorial-box-color: ${boxColor}; --tutorial-box-foreground: ${boxForeground}" data-training-target="${escapeHtml(box.id)}">${escapeHtml(box.name)}</button>`;
    }

    const isExpanded = expandedBoxId === box.id;
    return `<button type="button" class="tutorial-box-toggle${isExpanded ? ' is-expanded' : ''}" style="--tutorial-box-color: ${boxColor}; --tutorial-box-foreground: ${boxForeground}" data-training-toggle-box="${escapeHtml(box.id)}" aria-expanded="${isExpanded}">${isExpanded ? '▼' : '▶'} ${escapeHtml(box.name)}</button>`;
}

/** Takes a practice rack and returns its answer-button or expandable contents HTML for the current level. */
function renderRack(rack: TutorialRack): string {
    const isExpanded = expandedRackId === rack.id;
    const isRackQuestion = currentQuestion?.type === 'rack';
    const contents = !isRackQuestion && isExpanded
        ? renderBoxGrid(rack)
        : '';

    if (isRackQuestion) {
        return `
            <li class="tutorial-rack" style="--tutorial-rack-color: ${isHexColor(rack.color) ? rack.color : '#FFFFFF'}">
                <button type="button" class="tutorial-rack-target${targetClass(rack.id)}" data-training-target="${escapeHtml(rack.id)}">
                    <span class="tutorial-color-key" aria-hidden="true"></span>
                    <span>${escapeHtml(rack.name)}</span>
                </button>
                <p class="question-set-rack-capacity">${rack.boxes.length} / ${FREEZER_LAYOUT_LIMITS.maxBoxSlotsPerRack} boxes filled</p>
            </li>
        `;
    }

    return `
        <li class="tutorial-rack${isExpanded ? ' is-expanded' : ''}" style="--tutorial-rack-color: ${isHexColor(rack.color) ? rack.color : '#FFFFFF'}">
            <button type="button" class="tutorial-rack-toggle" data-training-toggle-rack="${escapeHtml(rack.id)}" aria-expanded="${isExpanded}">
                <span class="tutorial-color-key" aria-hidden="true"></span>
                <span>${isExpanded ? '▼' : '▶'} ${escapeHtml(rack.name)}</span>
            </button>
            <p class="question-set-rack-capacity">${rack.boxes.length} / ${FREEZER_LAYOUT_LIMITS.maxBoxSlotsPerRack} boxes filled</p>
            ${contents}
        </li>
    `;
}

/** Takes a practice rack and returns its box-slot grid HTML plus any expanded sample details. */
function renderBoxGrid(rack: TutorialRack): string {
    // Render every shared rack-grid slot, including empty ones, to retain physical box positions.
    const boxesByPosition = new Map(rack.boxes.map(box => [`${box.row}-${box.column}`, box]));
    let cells = '';
    for (let row = 1; row <= FREEZER_LAYOUT_LIMITS.rackRows; row++) {
        for (let column = 1; column <= FREEZER_LAYOUT_LIMITS.rackColumns; column++) {
            const box = boxesByPosition.get(`${row}-${column}`);
            cells += box
                ? renderBox(box, rack)
                : `<div class="question-set-box-slot" role="img" aria-label="Empty box slot, row ${row}, column ${column}"></div>`;
        }
    }

    const expandedBox = currentQuestion?.type === 'sample' ? rack.boxes.find(box => box.id === expandedBoxId) : undefined;
    const details = expandedBox
        ? `<section class="question-set-box-details" aria-label="Box positions"><h3>${escapeHtml(expandedBox.name)} — positions</h3>${renderSampleGrid(expandedBox, rack)}</section>`
        : '';

    return `<div class="tutorial-boxes">${cells}</div>${details}`;
}

/** Checks an optional color string and returns whether it is a six-digit hexadecimal color. */
function isHexColor(value: string | undefined): value is string {
    return value !== undefined && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Takes a valid six-digit hex color and returns dark or white text using a weighted brightness threshold of 150. */
function getReadableTextColor(hexColor: string): string {
    const red = parseInt(hexColor.slice(1, 3), 16);
    const green = parseInt(hexColor.slice(3, 5), 16);
    const blue = parseInt(hexColor.slice(5, 7), 16);
    return (red * 299 + green * 587 + blue * 114) / 1000 > 150 ? '#18334d' : '#ffffff';
}

/** Takes no arguments and returns the practice freezer HTML with racks and their expanded contents. */
function renderTutorialLayout(): string {
    return `
        <section class="tutorial-freezer" aria-label="Tutorial freezer">
            <section class="tutorial-shelf" aria-label="${tutorialShelf.name}">
                <header class="tutorial-shelf-header">
                    <span class="tutorial-shelf-label">SHELF</span>
                    <h2>${tutorialShelf.name}</h2>
                </header>
                <ul class="tutorial-racks">${tutorialShelf.racks.map(renderRack).join('')}</ul>
            </section>
        </section>
    `;
}

/** Takes no arguments and returns the ten L1-L10 level indicators reflecting the current stage and completion state. */
function renderLevelProgress(): string {
    return sessionQuestions.map((question, index) => {
        const level = index + 1;
        const title = LEVEL_TITLES[question.type];
        const stateClass = level === currentLevel ? ' is-current' : level < currentLevel || tutorialComplete ? ' is-complete' : '';
        const current = level === currentLevel && !tutorialComplete;
        return `<div class="tutorial-level${stateClass}" aria-current="${current ? 'step' : 'false'}"><strong>L${level}</strong><span>${title}</span></div>`;
    }).join('');
}

/** Takes no arguments and returns tutorial HTML, starting a question if needed and showing completion when finished. */
export function TutorialTrainingModeView(): string {
    if (!currentQuestion) startTrainingTutorial();

    return `
        <section class="training-view tutorial-training physical-freezer-layout">
            <header class="training-heading training-active-heading">
                <div>
                    <p class="training-eyebrow">STATIC TUTORIAL</p>
                    <h1>${tutorialComplete ? 'Tutorial complete' : 'Freezer location tutorial'}</h1>
                </div>
                ${!tutorialComplete ? `<p class="tutorial-strikes"><strong>${wrongAnswersThisLevel}</strong> / 3 misses at L${currentLevel}</p>` : ''}
            </header>
            <nav class="tutorial-levels tutorial-levels-compact" aria-label="Tutorial levels">${renderLevelProgress()}</nav>
            ${tutorialComplete ? `
                <section id="training-question-panel" class="tutorial-completion" tabindex="-1" aria-live="polite">
                    <p class="training-feedback is-correct" role="status">${escapeHtml(feedbackMessage)}</p>
                    <button id="btn-tutorial-restart" class="btn-save">Restart tutorial</button>
                </section>
            ` : `
                <section id="training-question-panel" class="training-question" tabindex="-1" aria-live="polite">
                    <p class="training-prompt">LEVEL L${currentLevel} · ${LEVEL_TITLES[currentQuestion!.type].toUpperCase()}</p>
                    <p class="training-prompt-detail">Question ${currentLevel} of ${TUTORIAL_LEVEL_COUNT}</p>
                    <h2>${escapeHtml(currentQuestion!.prompt)}</h2>
                    <p class="training-prompt-detail">${escapeHtml(currentQuestion!.detail)}</p>
                    ${feedbackMessage ? `<p class="training-feedback ${feedbackKind === 'incorrect' ? 'is-incorrect' : 'is-correct'}" role="status">${escapeHtml(feedbackMessage)}</p>` : ''}
                </section>
                <div class="editor-content tutorial-map-content">
                    <h2>Practice layout</h2>
                    ${renderTutorialLayout()}
                </div>
            `}
        </section>
    `;
}
