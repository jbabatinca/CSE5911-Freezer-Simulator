type TutorialLevel = 1 | 2 | 3;
type FeedbackKind = 'correct' | 'incorrect' | 'progress' | 'complete';

interface TutorialSample {
    id: string;
    name: string;
    row: number;
    column: number;
}

interface TutorialBox {
    id: string;
    name: string;
    row: number;
    column: number;
    color: string;
    samples: TutorialSample[];
}

interface TutorialRack {
    id: string;
    name: string;
    color: string;
    boxes: TutorialBox[];
}

interface TutorialQuestion {
    targetId: string;
    prompt: string;
    detail: string;
    address: string;
}

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
        }
    ] satisfies TutorialRack[]
};

const levels = [
    { level: 1 as const, title: 'Find the rack' },
    { level: 2 as const, title: 'Find the box' },
    { level: 3 as const, title: 'Find the sample' }
];

let currentLevel: TutorialLevel = 1;
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

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]!);
}

function choose<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)]!;
}

function getBoxes(): { rack: TutorialRack; box: TutorialBox }[] {
    return tutorialShelf.racks.flatMap(rack => rack.boxes.map(box => ({ rack, box })));
}

function getSamples(): { rack: TutorialRack; box: TutorialBox; sample: TutorialSample }[] {
    return getBoxes().flatMap(({ rack, box }) => box.samples.map(sample => ({ rack, box, sample })));
}

function samplePosition(sample: TutorialSample): string {
    return `${String.fromCharCode(64 + sample.row)}${sample.column}`;
}

function startQuestion(): void {
    if (currentLevel === 1) {
        const rack = choose(tutorialShelf.racks);
        currentQuestion = {
            targetId: rack.id,
            prompt: `Find ${rack.name}`,
            detail: 'Select the matching rack.',
            address: `${tutorialShelf.name} / ${rack.name}`
        };
    } else if (currentLevel === 2) {
        const { rack, box } = choose(getBoxes());
        currentQuestion = {
            targetId: box.id,
            prompt: `Find ${box.name}`,
            detail: 'Select the matching box.',
            address: `${tutorialShelf.name} / ${rack.name} / ${box.name}`
        };
    } else {
        const { rack, box, sample } = choose(getSamples());
        currentQuestion = {
            targetId: sample.id,
            prompt: `Find ${sample.name}`,
            detail: 'Select the matching sample position.',
            address: `${tutorialShelf.name} / ${rack.name} / ${box.name} / Position ${samplePosition(sample)}`
        };
    }

    questionStartedAt = Date.now();
    selectedTargetId = null;
    expandedRackId = null;
    expandedBoxId = null;
}

export function startTrainingTutorial(): void {
    currentLevel = 1;
    wrongAnswersThisLevel = 0;
    tutorialStartedAt = Date.now();
    feedbackMessage = '';
    feedbackKind = 'progress';
    tutorialComplete = false;
    startQuestion();
}

export function answerTrainingTarget(targetId: string): void {
    if (!currentQuestion || tutorialComplete) return;
    selectedTargetId = targetId;
    const elapsed = ((Date.now() - questionStartedAt) / 1000).toFixed(1);

    if (targetId === currentQuestion.targetId) {
        const finishedLevel = currentLevel;
        wrongAnswersThisLevel = 0;
        if (finishedLevel === 3) {
            tutorialComplete = true;
            feedbackKind = 'complete';
            const totalElapsed = ((Date.now() - tutorialStartedAt) / 1000).toFixed(1);
            feedbackMessage = `Correct. ${currentQuestion.address}. Tutorial completed in ${totalElapsed} seconds.`;
            return;
        }

        currentLevel = (finishedLevel + 1) as TutorialLevel;
        feedbackKind = 'correct';
        feedbackMessage = `Correct. ${currentQuestion.address}. Answered in ${elapsed} seconds. Advancing to L${currentLevel}.`;
        startQuestion();
        return;
    }

    wrongAnswersThisLevel++;
    if (wrongAnswersThisLevel === 3) {
        feedbackKind = 'progress';
        feedbackMessage = `Three incorrect answers. Returning to L1. The answer was ${currentQuestion.address}.`;
        currentLevel = 1;
        wrongAnswersThisLevel = 0;
        startQuestion();
        return;
    }

    feedbackKind = 'incorrect';
    feedbackMessage = `Not quite. ${wrongAnswersThisLevel} of 3 misses at this level. Try again.`;
}

export function toggleTrainingRack(rackId: string): void {
    expandedRackId = expandedRackId === rackId ? null : rackId;
    expandedBoxId = null;
}

export function toggleTrainingBox(boxId: string): void {
    expandedBoxId = expandedBoxId === boxId ? null : boxId;
}

function targetClass(targetId: string): string {
    if (feedbackKind !== 'incorrect' || !selectedTargetId) return '';
    if (selectedTargetId === targetId) return ' is-incorrect';
    return currentQuestion?.targetId === targetId ? ' is-correct' : '';
}

function renderSampleGrid(box: TutorialBox): string {
    const samplesByPosition = new Map(box.samples.map(sample => [`${sample.row}-${sample.column}`, sample]));
    let cells = '';
    for (let row = 1; row <= 9; row++) {
        for (let column = 1; column <= 9; column++) {
            const sample = samplesByPosition.get(`${row}-${column}`);
            if (!sample) {
                cells += '<div class="tutorial-sample-empty" aria-hidden="true"></div>';
                continue;
            }
            const label = samplePosition(sample);
            cells += `<button class="tutorial-sample-target${targetClass(sample.id)}" data-training-target="${sample.id}" aria-label="${escapeHtml(sample.name)}, position ${label}" title="${escapeHtml(sample.name)}">${label}</button>`;
        }
    }
    return `<div class="tutorial-sample-grid" style="--tutorial-box-color: ${box.color}">${cells}</div>`;
}

function renderBox(box: TutorialBox): string {
    if (currentLevel === 2) {
        return `<button class="tutorial-box-target${targetClass(box.id)}" style="--tutorial-box-color: ${box.color}" data-training-target="${box.id}">${escapeHtml(box.name)}</button>`;
    }

    const isExpanded = expandedBoxId === box.id;
    return `
        <div class="tutorial-box${isExpanded ? ' is-expanded' : ''}" style="--tutorial-box-color: ${box.color}">
            <button class="tutorial-box-toggle" data-training-toggle-box="${box.id}" aria-expanded="${isExpanded}">${isExpanded ? '▼' : '▶'} ${escapeHtml(box.name)}</button>
            ${isExpanded ? renderSampleGrid(box) : ''}
        </div>
    `;
}

function renderRack(rack: TutorialRack): string {
    const isExpanded = expandedRackId === rack.id;
    const contents = currentLevel > 1 && isExpanded
        ? `<div class="tutorial-boxes">${rack.boxes.map(renderBox).join('')}</div>`
        : '';

    if (currentLevel === 1) {
        return `
            <li class="tutorial-rack" style="--tutorial-rack-color: ${rack.color}">
                <button class="tutorial-rack-target${targetClass(rack.id)}" data-training-target="${rack.id}">
                    <span class="tutorial-color-key" aria-hidden="true"></span>
                    <span>${escapeHtml(rack.name)}</span>
                </button>
            </li>
        `;
    }

    return `
        <li class="tutorial-rack${isExpanded ? ' is-expanded' : ''}" style="--tutorial-rack-color: ${rack.color}">
            <button class="tutorial-rack-toggle" data-training-toggle-rack="${rack.id}" aria-expanded="${isExpanded}">
                <span class="tutorial-color-key" aria-hidden="true"></span>
                <span>${isExpanded ? '▼' : '▶'} ${escapeHtml(rack.name)}</span>
            </button>
            ${contents}
        </li>
    `;
}

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

function renderLevelProgress(): string {
    return [
        { level: 1, title: 'Find the rack' },
        { level: 2, title: 'Find the box' },
        { level: 3, title: 'Find the sample' }
    ].map(({ level, title }) => {
        const stateClass = level === currentLevel ? ' is-current' : level < currentLevel || tutorialComplete ? ' is-complete' : '';
        const current = level === currentLevel && !tutorialComplete;
        return `<div class="tutorial-level${stateClass}" aria-current="${current ? 'step' : 'false'}"><strong>L${level}</strong><span>${title}</span></div>`;
    }).join('');
}

export function TutorialTrainingModeView(): string {
    if (!currentQuestion) startQuestion();

    return `
        <section class="training-view tutorial-training">
            <header class="training-heading training-active-heading">
                <div>
                    <p class="training-eyebrow">STATIC TUTORIAL</p>
                    <h1>${tutorialComplete ? 'Tutorial complete' : 'Freezer location tutorial'}</h1>
                </div>
                ${!tutorialComplete ? `<p class="tutorial-strikes"><strong>${wrongAnswersThisLevel}</strong> / 3 misses at L${currentLevel}</p>` : ''}
            </header>
            <nav class="tutorial-levels" aria-label="Tutorial levels">${renderLevelProgress()}</nav>
            ${tutorialComplete ? `
                <section id="training-question-panel" class="tutorial-completion" tabindex="-1" aria-live="polite">
                    <p class="training-feedback is-correct" role="status">${escapeHtml(feedbackMessage)}</p>
                    <button id="btn-tutorial-restart" class="btn-save">Restart tutorial</button>
                </section>
            ` : `
                <section id="training-question-panel" class="training-question" tabindex="-1" aria-live="polite">
                    <p class="training-prompt">LEVEL L${currentLevel} · ${['Find the rack', 'Find the box', 'Find the sample'][currentLevel - 1]!.toUpperCase()}</p>
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