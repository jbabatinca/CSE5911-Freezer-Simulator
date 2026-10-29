import type { QuestionSetQuestion, QuestionTargetType, ResolvedQuestionTarget } from '../models/QuestionSet.js';
import type { SavedLayout } from '../models/SavedLayout.js';

/** Shared by the admin target picker and user answer checking. Does not access storage. */
export function getQuestionTargets(layout: SavedLayout, targetType: QuestionTargetType): ResolvedQuestionTarget[] {
    const targets: ResolvedQuestionTarget[] = [];
    const samples = new Map((layout.freezerData.samples ?? []).map(sample => [sample.id, sample.name]));

    for (const shelf of layout.freezerData.shelves) {
        for (const rack of shelf.racks) {
            const rackPath = `${shelf.name} / ${rack.name}`;
            const location = { shelfId: shelf.id, rackId: rack.id };
            if (targetType === 'rack') {
                targets.push({ ...location, id: rack.id, targetType, label: rackPath, boxId: null });
                continue;
            }
            for (const slot of rack.boxSlots) {
                const box = slot.box;
                if (!box) continue;
                const boxPath = `${rackPath} / ${box.name}`;
                if (targetType === 'box') {
                    targets.push({ ...location, id: box.id, targetType, boxId: box.id, label: `${boxPath} (slot ${slot.row}-${slot.column})` });
                } else if (targetType === 'sample') {
                    for (const position of box.positions) {
                        if (!position.sampleId) continue;
                        targets.push({
                            ...location, id: position.id, targetType, boxId: box.id,
                            label: `${samples.get(position.sampleId) ?? position.sampleId} / ${boxPath} / ${position.label}`,
                        });
                    }
                }
            }
        }
    }
    return targets;
}

/** Returns null for deleted, empty, foreign-layout, or wrong-type targets. */
export function resolveQuestionTarget(
    layout: SavedLayout,
    question: Pick<QuestionSetQuestion, 'targetType' | 'targetId'>,
): ResolvedQuestionTarget | null {
    return getQuestionTargets(layout, question.targetType).find(target => target.id === question.targetId) ?? null;
}
