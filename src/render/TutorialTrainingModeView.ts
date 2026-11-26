/** TutorialTrainingModeView.ts - runs and renders a ten-level (L1-L10) tutorial that asks one randomly drawn question per level, using a fixed practice freezer. */
import { FREEZER_LAYOUT_LIMITS } from '../models/freezerLayout.js';

/** Identifies which kind of freezer item a tutorial question asks the user to find. */
type TutorialTargetType = 'rack' | 'box' | 'sample';
/** Restricts feedback to the supported answer, progress, and completion display states. */
type FeedbackKind = 'correct' | 'incorrect' | 'progress' | 'complete';

/** Describes a practice sample by its id and one-based position within a box. */
interface TutorialSample {
    id: string;
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

// IDs include the shelf because project names recur throughout the freezer.
const rackId = (shelf: number, rack: number): string => `tutorial-rack-${shelf}-${rack}`;
const boxId = (shelf: number, rack: number, box: number): string => `tutorial-box-${shelf}-${rack}-${box}`;
const sampleId = (shelf: number, rack: number, box: number, position: number): string => `tutorial-sample-${shelf}-${rack}-${box}-${position}`;

const projectColors: Record<string, string> = {
    INSPIR: '#2878b8', PROMIS: '#bd692f', EPIC: '#8c73b5', MOMI: '#d2a82b',
    'Project 1': '#318272', 'Project 2': '#c77b8f', 'Project 3': '#42a889'
};

const shelfProjects = [
    ['INSPIR', 'PROMIS'],
    ['Project 1', 'EPIC', 'MOMI'],
    ['MOMI', 'EPIC', 'INSPIR', 'PROMIS'],
    ['PROMIS', 'Project 2', 'INSPIR', 'EPIC', 'Project 3', 'MOMI']
];

// Shelves grow denser from top to bottom; even the fullest sample grid retains empty positions.
const tutorialShelves = shelfProjects.map((projects, shelfIndex) => {
    const shelfNumber = shelfIndex + 1;
    const boxCount = 2 ** shelfNumber;
    return {
        id: `tutorial-shelf-${shelfNumber}`,
        name: `Shelf ${shelfNumber}`,
        racks: projects.map((name, rackIndex): TutorialRack => {
            const rackNumber = rackIndex + 1;
            const color = projectColors[name]!;
            const sampleCount = [3, 10, 20, 36][shelfIndex]! + rackIndex;
            return {
                id: rackId(shelfNumber, rackNumber),
                name,
                color,
                boxes: Array.from({ length: boxCount }, (_, boxIndex): TutorialBox => {
                    const boxNumber = boxIndex + 1;
                    const positions = Array.from({ length: FREEZER_LAYOUT_LIMITS.maxPositionsPerBox }, (_, index) => index);
                    // Draw without replacement once per page load so coordinates stay stable during a run.
                    for (let index = 0; index < sampleCount; index++) {
                        const selected = index + Math.floor(Math.random() * (positions.length - index));
                        [positions[index], positions[selected]] = [positions[selected]!, positions[index]!];
                    }
                    return {
                        id: boxId(shelfNumber, rackNumber, boxNumber),
                        name: `Box ${boxNumber}`,
                        row: Math.floor(boxIndex / FREEZER_LAYOUT_LIMITS.rackColumns) + 1,
                        column: boxIndex % FREEZER_LAYOUT_LIMITS.rackColumns + 1,
                        color,
                        samples: Array.from({ length: sampleCount }, (_, sampleIndex): TutorialSample => ({
                            id: sampleId(shelfNumber, rackNumber, boxNumber, sampleIndex + 1),
                            row: Math.floor(positions[sampleIndex]! / FREEZER_LAYOUT_LIMITS.boxColumns) + 1,
                            column: positions[sampleIndex]! % FREEZER_LAYOUT_LIMITS.boxColumns + 1
                        }))
                    };
                })
            };
        })
    };
});

/** Number of levels (L1-L10) in one tutorial run; each level shows exactly one question. */
export const TUTORIAL_LEVEL_COUNT = 10;

const rackQuestion = (targetId: string): TutorialQuestionDefinition => ({ type: 'rack', targetId });
const boxQuestion = (targetId: string): TutorialQuestionDefinition => ({ type: 'box', targetId });
const sampleQuestion = (targetId: string): TutorialQuestionDefinition => ({ type: 'sample', targetId });

/** Stores the three candidate questions for each level, indexed by level number minus one; one is drawn per level each run. */
export const TUTORIAL_QUESTION_BANK: readonly (readonly TutorialQuestionDefinition[])[] = [
    [rackQuestion(rackId(1, 1)), rackQuestion(rackId(1, 2)), rackQuestion(rackId(2, 1))],
    [rackQuestion(rackId(2, 2)), rackQuestion(rackId(3, 1)), rackQuestion(rackId(4, 5))],
    [boxQuestion(boxId(1, 1, 1)), boxQuestion(boxId(2, 2, 2)), boxQuestion(boxId(3, 1, 5))],
    [boxQuestion(boxId(2, 1, 4)), boxQuestion(boxId(3, 3, 7)), boxQuestion(boxId(4, 2, 10))],
    [boxQuestion(boxId(3, 4, 8)), boxQuestion(boxId(4, 3, 15)), boxQuestion(boxId(4, 6, 16))],
    [sampleQuestion(sampleId(1, 1, 1, 1)), sampleQuestion(sampleId(2, 2, 2, 9)), sampleQuestion(sampleId(3, 1, 3, 18))],
    [sampleQuestion(sampleId(2, 1, 4, 10)), sampleQuestion(sampleId(3, 2, 5, 20)), sampleQuestion(sampleId(4, 2, 6, 30))],
    [sampleQuestion(sampleId(3, 1, 8, 20)), sampleQuestion(sampleId(3, 4, 2, 23)), sampleQuestion(sampleId(4, 4, 11, 35))],
    [sampleQuestion(sampleId(3, 3, 4, 22)), sampleQuestion(sampleId(4, 3, 13, 36)), sampleQuestion(sampleId(4, 5, 15, 40))],
    [sampleQuestion(sampleId(4, 1, 16, 36)), sampleQuestion(sampleId(4, 4, 14, 39)), sampleQuestion(sampleId(4, 6, 16, 41))]
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

/** Returns practice boxes with their containing shelves and racks. */
function getBoxes() {
    return tutorialShelves.flatMap(shelf => shelf.racks.flatMap(rack => rack.boxes.map(box => ({ shelf, rack, box }))));
}

/** Returns practice samples with their containing shelves, racks, and boxes. */
function getSamples() {
    return getBoxes().flatMap(({ shelf, rack, box }) => box.samples.map(sample => ({ shelf, rack, box, sample })));
}

/** Converts a sample's one-based row and column into a position label such as A1 and returns it. */
function samplePosition(sample: TutorialSample): string {
    return `${String.fromCharCode(64 + sample.row)}${sample.column}`;
}

/** Takes a stored question definition and returns the prompt, instructions, and answer address built from the practice freezer. */
function buildQuestion(definition: TutorialQuestionDefinition): TutorialQuestion {
    const { type, targetId } = definition;
    if (type === 'rack') {
        const shelf = tutorialShelves.find(item => item.racks.some(rack => rack.id === targetId))!;
        const rack = shelf.racks.find(item => item.id === targetId)!;
        return {
            type,
            targetId,
            prompt: `Find ${shelf.name} / ${rack.name}`,
            detail: 'Select the matching rack.',
            address: `${shelf.name} / ${rack.name}`
        };
    }
    if (type === 'box') {
        const { shelf, rack, box } = getBoxes().find(item => item.box.id === targetId)!;
        return {
            type,
            targetId,
            prompt: `Find ${shelf.name} / ${rack.name} / ${box.name}`,
            detail: 'Select the matching box.',
            address: `${shelf.name} / ${rack.name} / ${box.name}`
        };
    }
    const { shelf, rack, box, sample } = getSamples().find(item => item.sample.id === targetId)!;
    const address = `${shelf.name} / ${rack.name} / ${box.name} / ${samplePosition(sample)}`;
    return {
        type,
        targetId,
        prompt: `Find ${address}`,
        detail: 'Select the matching sample position.',
        address
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
            cells += `<button type="button" class="tutorial-sample-target${targetClass(sample.id)}" data-training-target="${escapeHtml(sample.id)}" aria-label="Position ${label}" title="Position ${label}">${label}</button>`;
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
    return `<button type="button" class="tutorial-box-toggle${isExpanded ? ' is-expanded' : ''}" style="--tutorial-box-color: ${boxColor}; --tutorial-box-foreground: ${boxForeground}" data-training-toggle-box="${escapeHtml(box.id)}" aria-expanded="${isExpanded}">${isExpanded ? '▾' : '▸'} ${escapeHtml(box.name)}</button>`;
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
                <span>${isExpanded ? '▾' : '▸'} ${escapeHtml(rack.name)}</span>
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
            ${tutorialShelves.map(shelf => `<section class="tutorial-shelf" aria-label="${escapeHtml(shelf.name)}">
                <header class="tutorial-shelf-header">
                    <span class="tutorial-shelf-label"></span>
                    <h2>${escapeHtml(shelf.name)}</h2>
                </header>
                <ul class="tutorial-racks">${shelf.racks.map(renderRack).join('')}</ul>
            </section>`).join('')}
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
