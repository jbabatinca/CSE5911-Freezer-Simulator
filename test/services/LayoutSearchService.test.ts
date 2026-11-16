import { describe, expect, it } from 'vitest';
import { searchLayouts } from '../../src/services/LayoutSearchService.js';
import { makeLayout } from '../helpers/questionSets.js';

describe('Layout search', () => {
  it('matches partial sample names without case or surrounding whitespace and returns every location', () => {
    const layout = makeLayout();
    const before = JSON.stringify(layout);
    const results = searchLayouts([layout], '  eRu  ');
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      type: 'sample', name: 'Serum', layoutId: layout.id,
      shelfId: 'layout-1-shelf', rackId: 'layout-1-rack-1',
      boxId: 'layout-1-box-1', positionId: 'layout-1-position-1',
      path: 'Freezer layout-1 → Top shelf → Rack 1 → Box 1 → Position A1',
    });
    expect(results[1]?.positionId).toBe('layout-1-position-2');
    expect(JSON.stringify(layout)).toBe(before);
  });

  it.each([
    ['freezer layout', 'layout', 'Freezer layout-1'],
    ['TOP', 'shelf', 'Top shelf'],
    ['rack 2', 'rack', 'Rack 2'],
    ['box 1', 'box', 'Box 1'],
    ['a1', 'position', 'Position A1'],
  ])('finds %s as a %s', (query, type, name) => {
    const results = searchLayouts([makeLayout()], query);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(result => result.type === type)).toBe(true);
    expect(results[0]?.name).toBe(name);
  });

  it('searches the freezer name as well as the saved layout name', () => {
    const layout = makeLayout();
    layout.freezerData.name = 'Research freezer';
    expect(searchLayouts([layout], 'research')[0]).toMatchObject({ type: 'layout', layoutId: layout.id });
  });

  it('returns empty shelves, racks, and boxes even without a sample catalog', () => {
    const layout = makeLayout();
    delete layout.freezerData.samples;
    layout.freezerData.shelves.push({ id: 'empty-shelf', name: 'Empty', racks: [] });
    layout.freezerData.shelves[0]!.racks.push({ id: 'empty-rack', name: 'Empty', boxSlots: [] });
    const box = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!;
    box.name = 'Empty';
    box.positions = [];
    expect(searchLayouts([layout], 'empty').map(result => result.type)).toEqual(['box', 'rack', 'shelf']);
    expect(searchLayouts([layout], 'serum')).toEqual([]);
  });

  it('distinguishes matching names and reused entity IDs across kinds and layouts', () => {
    const first = makeLayout();
    const second = makeLayout('layout-2');
    const shelf = second.freezerData.shelves[0]!;
    const rack = shelf.racks[0]!;
    shelf.id = rack.id = 'same-id';
    shelf.name = rack.name = 'Serum';
    const results = searchLayouts([first, second], 'serum');
    expect(results.map(result => result.type)).toEqual(['sample', 'sample', 'shelf', 'rack', 'sample', 'sample']);
    expect(new Set(results.map(result => result.key)).size).toBe(results.length);
    expect(results.filter(result => result.layoutId === second.id)).toHaveLength(4);
  });

  it('derives physical coordinates and finds stored empty positions', () => {
    const layout = makeLayout();
    Object.assign(layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.positions[0]!, {
      row: 9, column: 9, label: 'Legacy label',
    });
    expect(searchLayouts([layout], 'I9')[0]?.path).toContain('Position I9');
    expect(searchLayouts([layout], 'A2')).toHaveLength(2);
    expect(searchLayouts([layout], 'legacy')[0]?.name).toBe('Position I9');
  });

  it('ignores unassigned samples and unresolved sample IDs', () => {
    const layout = makeLayout();
    layout.freezerData.samples!.push({ id: 'unused', name: 'Unused Serum' });
    layout.freezerData.shelves[0]!.racks[1]!.boxSlots[0]!.box!.positions[0]!.sampleId = 'missing';
    expect(searchLayouts([layout], 'serum')).toHaveLength(1);
    expect(searchLayouts([layout], 'unused')).toEqual([]);
  });

  it('continues searching past both null and omitted boxes', () => {
    const layout = makeLayout();
    const slots = layout.freezerData.shelves[0]!.racks[0]!.boxSlots;
    delete slots[0]!.box;
    expect(slots[1]!.box).toBeNull();
    expect(searchLayouts([layout], 'serum')).toEqual([
      expect.objectContaining({ type: 'sample', positionId: 'layout-1-position-2' }),
    ]);
    expect(searchLayouts([layout], 'rack')).toHaveLength(2);
  });

  it('returns no results for blank queries, empty layouts, or no matches', () => {
    expect(searchLayouts([makeLayout()], '   ')).toEqual([]);
    expect(searchLayouts([makeLayout()], 'absent')).toEqual([]);
    expect(searchLayouts([], 'serum')).toEqual([]);
  });
});
