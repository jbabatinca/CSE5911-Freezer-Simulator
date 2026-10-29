import { describe, expect, it } from 'vitest';
import { getQuestionTargets, resolveQuestionTarget } from '../../src/services/QuestionTargetService.js';
import { makeLayout, makeQuestionSet } from '../helpers/questionSets.js';

describe('Question target resolution', () => {
  it.each(makeQuestionSet().questions)('resolves $targetType targets with their current hierarchy', question => {
    const target = resolveQuestionTarget(makeLayout(), question);
    expect(target).toMatchObject({
      id: question.targetId, targetType: question.targetType,
      shelfId: 'layout-1-shelf', rackId: 'layout-1-rack-1',
      boxId: question.targetType === 'rack' ? null : 'layout-1-box-1',
    });
    expect(target!.label).toContain('Top shelf / Rack 1');
    if (question.targetType === 'sample') expect(target!.label).toBe('Serum / Top shelf / Rack 1 / Box 1 / A1');
  });

  it('lists targets in layout order and excludes empty slots and unoccupied positions', () => {
    expect(getQuestionTargets(makeLayout(), 'rack').map(target => target.id)).toEqual(['layout-1-rack-1', 'layout-1-rack-2']);
    expect(getQuestionTargets(makeLayout(), 'box').map(target => target.id)).toEqual(['layout-1-box-1', 'layout-1-box-2']);
    expect(getQuestionTargets(makeLayout(), 'sample').map(target => target.id)).toEqual(['layout-1-position-1', 'layout-1-position-2']);
  });

  it.each([
    { targetType: 'rack', targetId: 'layout-1-box-1' },
    { targetType: 'box', targetId: 'layout-1-rack-1' },
    { targetType: 'sample', targetId: 'layout-1-sample' },
    { targetType: 'sample', targetId: 'layout-1-empty-1' },
    { targetType: 'rack', targetId: 'layout-2-rack-1' },
    { targetType: 'box', targetId: 'deleted' },
  ] as const)('rejects missing or wrong-type target $targetId as $targetType', question => {
    expect(resolveQuestionTarget(makeLayout(), question)).toBeNull();
  });

  it('resolves repeated specimens by position ID rather than by shared sample ID', () => {
    const targets = getQuestionTargets(makeLayout(), 'sample');
    expect(targets).toHaveLength(2);
    expect(targets[0]!.id).not.toBe(targets[1]!.id);
    expect(targets[0]!.label).toContain('Rack 1');
    expect(targets[1]!.label).toContain('Rack 2');
  });

  it('returns null for a target removed from the layout and uses current names', () => {
    const layout = makeLayout();
    const question = makeQuestionSet().questions[0]!;
    layout.freezerData.shelves[0]!.racks[0]!.name = 'Renamed rack';
    expect(resolveQuestionTarget(layout, question)!.label).toBe('Top shelf / Renamed rack');
    layout.freezerData.shelves[0]!.racks.shift();
    expect(resolveQuestionTarget(layout, question)).toBeNull();
  });

  it('supports layouts without sample metadata and leaves the source data untouched', () => {
    const layout = makeLayout();
    layout.freezerData.samples = [];
    const before = structuredClone(layout);
    expect(getQuestionTargets(layout, 'sample')[0]!.label).toContain('layout-1-sample /');
    expect(layout).toEqual(before);
  });
});
