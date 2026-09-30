import type { SavedLayout } from '../models/SavedLayout.js';
import type { FreezerBox } from '../models/freezerLayout.js';
import { getAllLayouts } from '../services/StorageService.js';

type QuestionMode = 'mixed' | 'boxes' | 'specimens';
type TargetKind = 'box' | 'specimen';

interface TrainingTarget {
    key: string;
    kind: TargetKind;
    label: string;
    identifier: string;
    parentAddress: string;
    address: string;
    shelfId: string;
    rackId: string;
    boxId: string;
    slotRow: number;
    slotColumn: number;
    positionId?: string;
    positionLabel?: string;
}

let selectedLayoutId: string | null = null;
let questionMode: QuestionMode = 'mixed';
let currentTargetKey: string | null = null;
let selectedTargetKey: string | null = null;
let questionAnswered = false;
let correctAnswers = 0;
let answeredQuestions = 0;
let expandedShelfId: string | null = null;
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

function getTrainingTargets(layout: SavedLayout): TrainingTarget[] {
    const samples = new Map((layout.freezerData.samples ?? []).map(sample => [sample.id, sample]));

    return layout.freezerData.shelves.flatMap(shelf =>
        shelf.racks.flatMap(rack =>
            rack.boxSlots.flatMap(slot => {
                if (!slot.box) return [];

                const address = `${shelf.name} / ${rack.name} / rack slot R${slot.row}C${slot.column}`;
                const parentAddress = `${shelf.name} / ${rack.name}`;
                const boxTarget: TrainingTarget = {
                    key: `box:${shelf.id}/${rack.id}/${slot.row}/${slot.column}/${slot.box.id}`,
                    kind: 'box',
                    label: slot.box.name,
                    identifier: slot.box.id,
                    parentAddress,
                    address,
                    shelfId: shelf.id,
                    rackId: rack.id,
                    boxId: slot.box.id,
                    slotRow: slot.row,
                    slotColumn: slot.column
                };
                const specimenTargets = slot.box.positions.flatMap(position => {
                    if (!position.sampleId) return [];
                    const specimen = samples.get(position.sampleId);
                    return [{
                        key: `specimen:${shelf.id}/${rack.id}/${slot.box!.id}/${position.id}`,
                        kind: 'specimen' as const,
                        label: specimen?.name ?? position.sampleId,
                        identifier: position.sampleId,
                        parentAddress,
                        address: `${address} / ${slot.box!.name} / position ${position.label}`,
                        shelfId: shelf.id,
                        rackId: rack.id,
                        boxId: slot.box!.id,
                        slotRow: slot.row,
                        slotColumn: slot.column,
                        positionId: position.id,
                        positionLabel: position.label
                    }];
                });

                return [boxTarget, ...specimenTargets];
            })
        )
    );
}

function getModeTargets(targets: TrainingTarget[]): TrainingTarget[] {
    if (questionMode === 'boxes') return targets.filter(target => target.kind === 'box');
    if (questionMode === 'specimens') return targets.filter(target => target.kind === 'specimen');
    return targets;
}

function resetExpandedLocation(): void {
    expandedShelfId = null;
    expandedRackId = null;
    expandedBoxId = null;
}

function startQuestion(targets: TrainingTarget[]): void {
    const eligibleTargets = getModeTargets(targets);
    const targetKinds = questionMode === 'mixed'
        ? [...new Set(eligibleTargets.map(target => target.kind))]
        : [];
    const selectedKind = targetKinds.length > 0
        ? targetKinds[Math.floor(Math.random() * targetKinds.length)]
        : undefined;
    const kindTargets = selectedKind ? eligibleTargets.filter(target => target.kind === selectedKind) : eligibleTargets;
    const availableTargets = kindTargets.length > 1
        ? kindTargets.filter(target => target.key !== currentTargetKey)
        : kindTargets;
    const target = availableTargets[Math.floor(Math.random() * availableTargets.length)];
    currentTargetKey = target?.key ?? null;
    selectedTargetKey = null;
    questionAnswered = false;
    resetExpandedLocation();
}

export function selectTrainingLayout(layoutId: string): void {
    selectedLayoutId = layoutId;
    questionMode = 'mixed';
    currentTargetKey = null;
    selectedTargetKey = null;
    questionAnswered = false;
    correctAnswers = 0;
    answeredQuestions = 0;
    resetExpandedLocation();
}

export function setTrainingQuestionMode(mode: QuestionMode): void {
    if (questionMode === mode) return;
    questionMode = mode;
    currentTargetKey = null;
    selectedTargetKey = null;
    questionAnswered = false;
    resetExpandedLocation();
}

export function answerTrainingTarget(targetKey: string): void {
    if (questionAnswered || !currentTargetKey) return;
    selectedTargetKey = targetKey;
    questionAnswered = true;
    answeredQuestions++;
    if (targetKey === currentTargetKey) correctAnswers++;
}

export function nextTrainingQuestion(): void {
    currentTargetKey = null;
    selectedTargetKey = null;
    questionAnswered = false;
    resetExpandedLocation();
}

export function toggleTrainingShelf(shelfId: string): void {
    expandedShelfId = expandedShelfId === shelfId ? null : shelfId;
    expandedRackId = null;
    expandedBoxId = null;
}

export function toggleTrainingRack(rackId: string): void {
    expandedRackId = expandedRackId === rackId ? null : rackId;
    expandedBoxId = null;
}

export function toggleTrainingBox(boxId: string): void {
    expandedBoxId = expandedBoxId === boxId ? null : boxId;
}

function renderBoxGrid(shelfId: string, rackId: string, slot: SavedLayout['freezerData']['shelves'][number]['racks'][number]['boxSlots'][number], target: TrainingTarget): string {
    const box = slot.box!;
    if (target.kind === 'box') {
        const isCorrect = questionAnswered && target.key === currentTargetKey;
        const isWrongSelection = questionAnswered && selectedTargetKey === `box:${shelfId}/${rackId}/${slot.row}/${slot.column}/${box.id}` && !isCorrect;
        const stateClass = isCorrect ? ' is-correct' : isWrongSelection ? ' is-incorrect' : '';
        const trainingKey = `box:${shelfId}/${rackId}/${slot.row}/${slot.column}/${box.id}`;
        return `
            <button class="box-container training-box-target${stateClass}" data-training-target="${escapeHtml(trainingKey)}" ${questionAnswered ? 'disabled' : ''}>
                <span class="training-box-name">${escapeHtml(box.name)}</span>
                <span class="training-box-slot">R${slot.row}C${slot.column}</span>
            </button>
        `;
    }

    const boxExpanded = expandedBoxId === box.id;
    return `
        <div class="box-container${boxExpanded ? ' box-selected' : ''}">
            <button class="box-toggle training-box-toggle" data-training-toggle-box="${escapeHtml(box.id)}" aria-expanded="${boxExpanded}">
                ${boxExpanded ? '▼' : '▶'} ${escapeHtml(box.name)} <span>R${slot.row}C${slot.column}</span>
            </button>
        </div>
    `;
}

function renderPositionGrid(layout: SavedLayout, shelfId: string, rackId: string, slot: SavedLayout['freezerData']['shelves'][number]['racks'][number]['boxSlots'][number], target: TrainingTarget): string {
    const box = slot.box!;
    const samples = new Map((layout.freezerData.samples ?? []).map(sample => [sample.id, sample]));
    let html = '<section class="box-details"><h5>Positions in ' + escapeHtml(box.name) + '</h5><div class="box-positions-grid">';

    for (let row = 1; row <= 9; row++) {
        for (let column = 1; column <= 9; column++) {
            const position = box.positions.find(item => item.row === row && item.column === column);
            if (!position) {
                html += '<div class="box-position" aria-hidden="true"></div>';
                continue;
            }

            const key = `specimen:${shelfId}/${rackId}/${box.id}/${position.id}`;
            if (position.sampleId) {
                const isCorrect = questionAnswered && target.key === key;
                const isWrongSelection = questionAnswered && selectedTargetKey === key && !isCorrect;
                const specimenName = samples.get(position.sampleId)?.name ?? position.sampleId;
                const stateClass = isCorrect ? ' is-correct' : isWrongSelection ? ' is-incorrect' : '';
                html += `<button class="box-position position-filled training-specimen-target${stateClass}" data-training-target="${escapeHtml(key)}" title="${escapeHtml(specimenName)}${questionAnswered ? '' : ' (' + escapeHtml(position.sampleId) + ')'}" ${questionAnswered ? 'disabled' : ''}>${escapeHtml(position.label)}</button>`;
            } else {
                html += `<div class="box-position position-filled training-unassigned-position" title="Unassigned position">${escapeHtml(position.label)}</div>`;
            }
        }
    }

    html += '</div></section>';
    return html;
}

function renderTrainingRack(layout: SavedLayout, shelfId: string, rack: SavedLayout['freezerData']['shelves'][number]['racks'][number], target: TrainingTarget): string {
    const rackExpanded = expandedRackId === rack.id;
    const boxCount = rack.boxSlots.filter(slot => slot.box !== null).length;
    const rackContents = rackExpanded
        ? `<div class="rack-grid"><div class="box-grid">${rack.boxSlots.map(slot => slot.box
            ? renderBoxGrid(shelfId, rack.id, slot, target)
            : `<div class="box-slot empty training-empty-slot" aria-label="Empty rack slot R${slot.row}C${slot.column}">R${slot.row}C${slot.column}</div>`).join('')}</div></div>`
        : '';
    const positions = rackExpanded && target.kind === 'specimen'
        ? rack.boxSlots.map(slot => slot.box?.id === expandedBoxId
            ? renderPositionGrid(layout, shelfId, rack.id, slot, target)
            : '').join('')
        : '';

    return `
        <li class="rack${rackExpanded ? ' rack-expanded' : ''}">
            <div class="rack-info">
                <button class="btn-toggle" data-training-toggle-rack="${escapeHtml(rack.id)}" aria-expanded="${rackExpanded}">${rackExpanded ? '▼' : '▶'}</button>
                <h4>${escapeHtml(rack.name)}</h4>
                <p>${boxCount} / ${rack.boxSlots.length} boxes filled</p>
            </div>
            ${rackContents}
            ${positions}
        </li>
    `;
}

function renderTrainingShelf(layout: SavedLayout, shelf: SavedLayout['freezerData']['shelves'][number], target: TrainingTarget): string {
    const shelfExpanded = expandedShelfId === shelf.id;
    const contents = shelfExpanded
        ? shelf.racks.length === 0
            ? '<p>No racks on this shelf.</p>'
            : `<ul class="racks">${shelf.racks.map(rack => renderTrainingRack(layout, shelf.id, rack, target)).join('')}</ul>`
        : '';

    return `
        <section class="shelf" aria-label="${escapeHtml(shelf.name)}">
            <div class="shelf-header">
                <button class="btn-toggle" data-training-toggle-shelf="${escapeHtml(shelf.id)}" aria-expanded="${shelfExpanded}">${shelfExpanded ? '▼' : '▶'}</button>
                <h3>${escapeHtml(shelf.name)}</h3>
            </div>
            ${contents}
        </section>
    `;
}

function renderFreezerMap(layout: SavedLayout, target: TrainingTarget): string {
    const shelves = layout.freezerData.shelves.length === 0
        ? '<p>No shelves in this freezer.</p>'
        : layout.freezerData.shelves.map(shelf => renderTrainingShelf(layout, shelf, target)).join('');
    return `<section class="freezer" aria-label="Freezer layout map">${shelves}</section>`;
}

function renderModeButton(mode: QuestionMode, label: string, disabled = false): string {
    const active = questionMode === mode;
    return `<button class="training-mode-button${active ? ' is-active' : ''}" data-training-mode="${mode}" aria-pressed="${active}" ${disabled ? 'disabled' : ''}>${label}</button>`;
}

export function TrainingModeView(): string {
    const layouts = getAllLayouts();
    const selectedLayout = layouts.find(layout => layout.id === selectedLayoutId);

    if (!selectedLayout) {
        selectedLayoutId = null;
        const layoutCards = layouts.map(layout => {
            const targets = getTrainingTargets(layout);
            const boxes = targets.filter(target => target.kind === 'box').length;
            const specimens = targets.filter(target => target.kind === 'specimen').length;
            return `
                <button class="training-layout" id="training-layout-${escapeHtml(layout.id)}">
                    <span class="training-layout-name">${escapeHtml(layout.name)}</span>
                    <span class="training-layout-meta">${boxes} ${boxes === 1 ? 'box' : 'boxes'} · ${specimens} ${specimens === 1 ? 'specimen' : 'specimens'}</span>
                </button>
            `;
        }).join('');

        return `
            <section class="training-view">
                <header class="training-heading">
                    <div>
                        <p class="training-eyebrow">PRACTICE</p>
                        <h1>Choose a freezer layout</h1>
                        <p>Practice navigating boxes and specimens in a configured freezer.</p>
                    </div>
                </header>
                ${layouts.length === 0
                    ? '<p class="training-empty">No saved layouts yet. Create and save a layout in Configuration Mode to begin.</p>'
                    : `<div class="training-layout-list">${layoutCards}</div>`}
            </section>
        `;
    }

    const targets = getTrainingTargets(selectedLayout);
    const boxTargets = targets.filter(target => target.kind === 'box');
    const specimenTargets = targets.filter(target => target.kind === 'specimen');
    const eligibleTargets = getModeTargets(targets);

    if (questionMode === 'specimens' && specimenTargets.length === 0) {
        return `
            <section class="training-view">
                <button id="btn-training-back" class="training-back">&larr; All layouts</button>
                <h1>${escapeHtml(selectedLayout.name)}</h1>
                <p class="training-empty">This layout has no named specimens assigned to positions. Add specimens to occupied positions in Configuration Mode, save the layout, then return here.</p>
            </section>
        `;
    }

    if (eligibleTargets.length === 0) {
        return `
            <section class="training-view">
                <button id="btn-training-back" class="training-back">&larr; All layouts</button>
                <h1>${escapeHtml(selectedLayout.name)}</h1>
                <p class="training-empty">This layout has no boxes yet. Add boxes in Configuration Mode, save the layout, then return here.</p>
            </section>
        `;
    }

    if (!currentTargetKey || !eligibleTargets.some(target => target.key === currentTargetKey)) startQuestion(targets);
    const target = targets.find(item => item.key === currentTargetKey)!;
    const isCorrect = selectedTargetKey === currentTargetKey;
    const feedback = !questionAnswered
        ? ''
        : isCorrect
            ? '<p class="training-feedback is-correct" role="status">Correct. You found the right location.</p>'
            : `<p class="training-feedback is-incorrect" role="status">Not quite. The correct address is ${escapeHtml(target.address)}.</p>`;
    const prompt = target.kind === 'box'
        ? `Locate this box: ${target.label}`
        : `Find specimen: ${target.label}`;
    const promptDetail = target.kind === 'box'
        ? `Unique box ID: ${target.identifier} · Located in ${target.parentAddress}`
        : `Specimen ID: ${target.identifier}`;

    return `
        <section class="training-view training-editor">
            <button id="btn-training-back" class="training-back">&larr; All layouts</button>
            <header class="training-heading training-active-heading">
                <div>
                    <p class="training-eyebrow">LOCATION PRACTICE</p>
                    <h1>${escapeHtml(selectedLayout.name)}</h1>
                </div>
                <p class="training-score"><strong>${correctAnswers}</strong> correct <span>·</span> ${answeredQuestions} answered</p>
            </header>
            <div class="training-toolbar">
                <div class="training-mode-control" role="group" aria-label="Question type">
                    ${renderModeButton('mixed', 'Mixed')}
                    ${renderModeButton('boxes', `Boxes (${boxTargets.length})`, boxTargets.length === 0)}
                    ${renderModeButton('specimens', `Specimens (${specimenTargets.length})`, specimenTargets.length === 0)}
                </div>
            </div>
            <section class="training-question" aria-live="polite">
                <p class="training-prompt">${target.kind === 'box' ? 'BOX LOCATION' : 'SPECIMEN LOCATION'}</p>
                <h2>${escapeHtml(prompt)}</h2>
                <p class="training-prompt-detail">${escapeHtml(promptDetail)}</p>
                ${feedback}
                ${questionAnswered ? '<button id="btn-training-next" class="btn-save training-next">Next question &rarr;</button>' : ''}
            </section>
            <div class="editor-content">
                <h2>Freezer layout</h2>
                <p>${target.kind === 'box' ? 'Expand a shelf and rack, then select the matching box slot.' : 'Expand a shelf, rack, and box, then select the specimen position.'}</p>
                ${renderFreezerMap(selectedLayout, target)}
            </div>
        </section>
    `;
}
