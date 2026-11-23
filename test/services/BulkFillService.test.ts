import { describe, it, expect, beforeEach } from 'vitest';
import type { SavedLayout } from '../../src/models/SavedLayout.js';
import type { FreezerBox, FreezerRack } from '../../src/models/freezerLayout.js';
import { addBox, assignSampleToPosition } from '../../src/services/FreezerService.js';
import { planRackFill, applyRackFill, planBoxFill, applyBoxFill } from '../../src/services/BulkFillService.js';
import type { FillCell } from '../../src/services/BulkFillService.js';

function makeRack(id: string): FreezerRack {
  return {
    id,
    name: id,
    boxSlots: Array.from({ length: 16 }, (_, i) => ({
      row: Math.floor(i / 4) + 1,
      column: (i % 4) + 1,
      box: null
    }))
  };
}

// shelf-1: rack-1 (index 0), rack-2 (index 1)
function makeLayout(): SavedLayout {
  return {
    id: 'layout-a',
    name: 'layout-a',
    freezerData: {
      schemaVersion: '1.0',
      id: 'freezer-a',
      name: 'Freezer',
      shelves: [{ id: 'shelf-1', name: 'Alpha', racks: [makeRack('rack-1'), makeRack('rack-2')] }],
      samples: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

const cell = (row: number, column: number, name: string): FillCell => ({ row, column, name });

const boxAt = (layout: SavedLayout, row: number, column: number, rackIndex = 0): FreezerBox | null =>
  layout.freezerData.shelves[0]!.racks[rackIndex]!.boxSlots.find(s => s.row === row && s.column === column)!.box ?? null;

const posAt = (box: FreezerBox, row: number, column: number) =>
  box.positions.find(p => p.row === row && p.column === column)!;

const sampleAt = (layout: SavedLayout, box: FreezerBox, row: number, column: number): string | undefined => {
  const id = posAt(box, row, column).sampleId;
  return id ? layout.freezerData.samples?.find(s => s.id === id)?.name : undefined;
};

/** Same steps the Update button runs. */
function updateRack(layout: SavedLayout, cells: FillCell[]) {
  const plan = planRackFill(layout, 0, 0, cells);
  applyRackFill(layout, 0, 0, plan);
  return plan;
}
function updateBox(layout: SavedLayout, boxId: string, cells: FillCell[]) {
  const plan = planBoxFill(layout, boxId, cells);
  applyBoxFill(layout, boxId, plan);
  return plan;
}

let layout: SavedLayout;
beforeEach(() => { layout = makeLayout(); });

describe('Bulk fill – rack tab', () => {
  it('1. Update adds boxes with the typed names', () => {
    updateRack(layout, [cell(1, 1, 'Box A'), cell(2, 2, 'Box B')]);
    expect(boxAt(layout, 1, 1)?.name).toBe('Box A');
    expect(boxAt(layout, 2, 2)?.name).toBe('Box B');
    expect(boxAt(layout, 1, 2)).toBeNull();
  });

  it('2. Clear then Update empties the whole rack', () => {
    addBox(layout, 0, 0, 1, 1, 'Box A');
    addBox(layout, 0, 0, 3, 2, 'Box B');
    updateRack(layout, []);
    expect(layout.freezerData.shelves[0]!.racks[0]!.boxSlots.every(s => s.box === null)).toBe(true);
  });

  it('3. clearing one cell removes only that box', () => {
    addBox(layout, 0, 0, 1, 1, 'Box A');
    addBox(layout, 0, 0, 1, 2, 'Box B');
    updateRack(layout, [cell(1, 1, 'Box A'), cell(1, 2, '')]);
    expect(boxAt(layout, 1, 1)?.name).toBe('Box A');
    expect(boxAt(layout, 1, 2)).toBeNull();
  });

  it('4. a changed name renames the box and keeps its samples', () => {
    addBox(layout, 0, 0, 1, 1, 'Old');
    const box = boxAt(layout, 1, 1)!;
    assignSampleToPosition(layout, posAt(box, 1, 1).id, 'S1');

    updateRack(layout, [cell(1, 1, 'New')]);

    const after = boxAt(layout, 1, 1)!;
    expect(after.id).toBe(box.id);
    expect(after.name).toBe('New');
    expect(sampleAt(layout, after, 1, 1)).toBe('S1');
  });

  it('5. plans no changes when the grid already matches (spaces ignored)', () => {
    addBox(layout, 0, 0, 1, 1, 'Box A');
    expect(planRackFill(layout, 0, 0, [cell(1, 1, '  Box A  ')]))
      .toEqual({ add: [], update: [], remove: [], duplicates: [] });
  });

  it('6. flags names typed twice or used in another rack', () => {
    addBox(layout, 0, 1, 1, 1, 'Taken');
    const plan = planRackFill(layout, 0, 0, [cell(1, 1, 'Dup'), cell(1, 2, 'Dup'), cell(1, 3, 'Taken')]);
    expect(plan.duplicates.sort()).toEqual(['Dup', 'Taken']);
  });
});

describe('Bulk fill – box tab', () => {
  let box: FreezerBox;
  beforeEach(() => {
    addBox(layout, 0, 0, 1, 1, 'Box A');
    box = boxAt(layout, 1, 1)!;
  });

  it('7. Update adds samples at the typed positions', () => {
    updateBox(layout, box.id, [cell(1, 1, 'S1'), cell(9, 9, 'S2')]);
    expect(sampleAt(layout, box, 1, 1)).toBe('S1');
    expect(sampleAt(layout, box, 9, 9)).toBe('S2');
  });

  it('8. Clear then Update empties the box and deletes the sample records', () => {
    assignSampleToPosition(layout, posAt(box, 1, 1).id, 'S1');
    assignSampleToPosition(layout, posAt(box, 5, 5).id, 'S2');
    updateBox(layout, box.id, []);
    expect(box.positions.every(p => !p.sampleId)).toBe(true);
    expect(layout.freezerData.samples).toEqual([]);
  });

  it('9. clearing one cell removes only that sample', () => {
    assignSampleToPosition(layout, posAt(box, 1, 1).id, 'S1');
    assignSampleToPosition(layout, posAt(box, 1, 2).id, 'S2');
    updateBox(layout, box.id, [cell(1, 1, 'S1'), cell(1, 2, '')]);
    expect(sampleAt(layout, box, 1, 1)).toBe('S1');
    expect(sampleAt(layout, box, 1, 2)).toBeUndefined();
  });

  it('10. a changed name replaces the sample at that position', () => {
    assignSampleToPosition(layout, posAt(box, 1, 1).id, 'Old');
    updateBox(layout, box.id, [cell(1, 1, 'New')]);
    expect(sampleAt(layout, box, 1, 1)).toBe('New');
    expect(layout.freezerData.samples?.map(s => s.name)).toEqual(['New']);
  });
});
