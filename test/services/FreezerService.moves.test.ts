import { describe, it, expect, beforeEach } from 'vitest';
import type { SavedLayout } from '../../src/models/SavedLayout.js';
import type { FreezerRack } from '../../src/models/freezerLayout.js';
import {
  addBox,
  assignSampleToPosition,
  moveRack,
  moveBox,
  pasteShelf,
  pasteRack,
  pasteBox
} from '../../src/services/FreezerService.js';

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

// shelf-1 (Alpha): rack-1, rack-2     shelf-2 (Beta): rack-3
function makeLayout(id = 'layout-a'): SavedLayout {
  return {
    id,
    name: id,
    freezerData: {
      schemaVersion: '1.0',
      id: `freezer-${id}`,
      name: 'Freezer',
      shelves: [
        { id: 'shelf-1', name: 'Alpha', racks: [makeRack('rack-1'), makeRack('rack-2')] },
        { id: 'shelf-2', name: 'Beta', racks: [makeRack('rack-3')] }
      ],
      samples: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

const rackOf = (layout: SavedLayout, id: string) =>
  layout.freezerData.shelves.flatMap(s => s.racks).find(r => r.id === id)!;
const slotOf = (layout: SavedLayout, rackId: string, row: number, column: number) =>
  rackOf(layout, rackId).boxSlots.find(s => s.row === row && s.column === column)!;
const rackIds = (layout: SavedLayout, shelfIndex: number) =>
  layout.freezerData.shelves[shelfIndex]!.racks.map(r => r.id);

function fillRack(layout: SavedLayout, shelfIndex: number, rackIndex: number): void {
  for (let row = 1; row <= 4; row++) {
    for (let col = 1; col <= 4; col++) {
      if (!slotOf(layout, layout.freezerData.shelves[shelfIndex]!.racks[rackIndex]!.id, row, col).box) {
        addBox(layout, shelfIndex, rackIndex, row, col);
      }
    }
  }
}

describe('moveRack', () => {
  it('reorders a rack within its shelf', () => {
    const layout = makeLayout();
    expect(moveRack(layout, 'shelf-1', 'rack-2', 0).ok).toBe(true);
    expect(rackIds(layout, 0)).toEqual(['rack-2', 'rack-1']);
  });

  it('rejects an invalid index and leaves the order unchanged', () => {
    const layout = makeLayout();
    expect(moveRack(layout, 'shelf-1', 'rack-1', 5).ok).toBe(false);
    expect(moveRack(layout, 'shelf-1', 'missing', 0).ok).toBe(false);
    expect(rackIds(layout, 0)).toEqual(['rack-1', 'rack-2']);
  });
});

describe('moveBox', () => {
  let layout: SavedLayout;
  beforeEach(() => {
    layout = makeLayout();
    addBox(layout, 0, 0, 1, 1, 'A');
  });

  it('moves a box to an empty slot', () => {
    expect(moveBox(layout, 'rack-1', 1, 1, 3, 4).ok).toBe(true);
    expect(slotOf(layout, 'rack-1', 1, 1).box).toBeNull();
    expect(slotOf(layout, 'rack-1', 3, 4).box?.name).toBe('A');
  });

  it('swaps with a box in an occupied slot', () => {
    addBox(layout, 0, 0, 1, 2, 'B');
    expect(moveBox(layout, 'rack-1', 1, 1, 1, 2).ok).toBe(true);
    expect(slotOf(layout, 'rack-1', 1, 1).box?.name).toBe('B');
    expect(slotOf(layout, 'rack-1', 1, 2).box?.name).toBe('A');
  });

  it('rejects moving from an empty slot or to a slot outside the grid', () => {
    expect(moveBox(layout, 'rack-1', 2, 2, 3, 3).ok).toBe(false);
    expect(moveBox(layout, 'rack-1', 1, 1, 5, 5).ok).toBe(false);
    expect(slotOf(layout, 'rack-1', 1, 1).box?.name).toBe('A');
  });
});

describe('pasteBox', () => {
  let layout: SavedLayout;
  let boxId: string;
  beforeEach(() => {
    layout = makeLayout();
    addBox(layout, 0, 0, 1, 1, 'A');
    boxId = slotOf(layout, 'rack-1', 1, 1).box!.id;
  });

  it('cut removes the box from the original rack and puts it in the target', () => {
    expect(pasteBox(layout, layout, 'rack-2', boxId, 'cut').ok).toBe(true);
    expect(slotOf(layout, 'rack-1', 1, 1).box).toBeNull();
    expect(slotOf(layout, 'rack-2', 1, 1).box?.id).toBe(boxId);
  });

  it('copy leaves the original and creates a duplicate with new ids', () => {
    expect(pasteBox(layout, layout, 'rack-2', boxId, 'copy').ok).toBe(true);
    const original = slotOf(layout, 'rack-1', 1, 1).box!;
    const copy = slotOf(layout, 'rack-2', 1, 1).box!;
    expect(original.id).toBe(boxId);
    expect(copy.id).not.toBe(boxId);
    expect(copy.name).toBe('A');
    expect(copy.positions).toHaveLength(81);
    expect(copy.positions[0]!.id).not.toBe(original.positions[0]!.id);
  });

  it('pastes into the requested empty slot', () => {
    pasteBox(layout, layout, 'rack-2', boxId, 'copy', 3, 2);
    expect(slotOf(layout, 'rack-2', 3, 2).box).not.toBeNull();
    expect(slotOf(layout, 'rack-2', 1, 1).box).toBeNull();
  });

  it('falls back to the first free slot when the requested slot is occupied', () => {
    addBox(layout, 0, 1, 3, 2, 'Existing');
    pasteBox(layout, layout, 'rack-2', boxId, 'copy', 3, 2);
    expect(slotOf(layout, 'rack-2', 3, 2).box?.name).toBe('Existing');
    expect(slotOf(layout, 'rack-2', 1, 1).box?.name).toBe('A');
  });

  it('into a full rack returns an error and changes nothing (cut is undone)', () => {
    fillRack(layout, 0, 1);
    const result = pasteBox(layout, layout, 'rack-2', boxId, 'cut');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toMatch(/full/i);
    expect(slotOf(layout, 'rack-1', 1, 1).box?.id).toBe(boxId);
  });

  it('copy into a full rack adds nothing', () => {
    fillRack(layout, 0, 1);
    expect(pasteBox(layout, layout, 'rack-2', boxId, 'copy').ok).toBe(false);
    expect(rackOf(layout, 'rack-2').boxSlots.filter(s => s.box).length).toBe(16);
  });

  it('can cut and paste within the same rack', () => {
    expect(pasteBox(layout, layout, 'rack-1', boxId, 'cut', 2, 2).ok).toBe(true);
    expect(slotOf(layout, 'rack-1', 1, 1).box).toBeNull();
    expect(slotOf(layout, 'rack-1', 2, 2).box?.id).toBe(boxId);
  });

  it('fails if the copied box no longer exists', () => {
    expect(pasteBox(layout, layout, 'rack-2', 'missing', 'copy').ok).toBe(false);
  });

  it('between freezers brings the box samples along; cut removes it from the source', () => {
    const other = makeLayout('layout-b');
    assignSampleToPosition(layout, slotOf(layout, 'rack-1', 1, 1).box!.positions[0]!.id, 'Blood');

    expect(pasteBox(layout, other, 'rack-2', boxId, 'cut').ok).toBe(true);

    expect(slotOf(layout, 'rack-1', 1, 1).box).toBeNull();
    const pasted = slotOf(other, 'rack-2', 1, 1).box!;
    const sampleId = pasted.positions.find(p => p.sampleId)!.sampleId;
    expect(other.freezerData.samples?.find(s => s.id === sampleId)?.name).toBe('Blood');
  });
});

describe('pasteRack', () => {
  let layout: SavedLayout;
  beforeEach(() => {
    layout = makeLayout();
    addBox(layout, 0, 0, 1, 1, 'A');   // a box on rack-1
  });

  it('cut moves a rack (and its boxes) to another shelf', () => {
    expect(pasteRack(layout, layout, 'shelf-2', 'rack-1', 'cut').ok).toBe(true);
    expect(rackIds(layout, 0)).toEqual(['rack-2']);
    expect(rackIds(layout, 1)).toEqual(['rack-3', 'rack-1']);
    expect(slotOf(layout, 'rack-1', 1, 1).box?.name).toBe('A');
  });

  it('copy leaves the original and creates a duplicate with new ids, boxes included', () => {
    expect(pasteRack(layout, layout, 'shelf-2', 'rack-1', 'copy').ok).toBe(true);
    expect(rackIds(layout, 0)).toEqual(['rack-1', 'rack-2']);
    const copy = layout.freezerData.shelves[1]!.racks[1]!;
    expect(copy.id).not.toBe('rack-1');
    expect(copy.boxSlots.find(s => s.row === 1 && s.column === 1)!.box?.name).toBe('A');
    expect(copy.boxSlots[0]!.box!.id).not.toBe(slotOf(layout, 'rack-1', 1, 1).box!.id);
  });

  it('into a full shelf returns an error and changes nothing', () => {
    const shelf2 = layout.freezerData.shelves[1]!;
    while (shelf2.racks.length < 6) shelf2.racks.push(makeRack(`filler-${shelf2.racks.length}`));
    const result = pasteRack(layout, layout, 'shelf-2', 'rack-1', 'copy');
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toMatch(/full/i);
    expect(shelf2.racks).toHaveLength(6);
    expect(rackIds(layout, 0)).toEqual(['rack-1', 'rack-2']);
  });

  it('cut within a full shelf is allowed (it frees its own spot)', () => {
    const shelf1 = layout.freezerData.shelves[0]!;
    while (shelf1.racks.length < 6) shelf1.racks.push(makeRack(`filler-${shelf1.racks.length}`));
    expect(pasteRack(layout, layout, 'shelf-1', 'rack-1', 'cut').ok).toBe(true);
    expect(shelf1.racks).toHaveLength(6);
    expect(shelf1.racks[5]!.id).toBe('rack-1');
  });

  it('between freezers copies the rack with its samples', () => {
    const other = makeLayout('layout-b');
    assignSampleToPosition(layout, slotOf(layout, 'rack-1', 1, 1).box!.positions[0]!.id, 'Plasma');
    expect(pasteRack(layout, other, 'shelf-2', 'rack-1', 'copy').ok).toBe(true);
    expect(other.freezerData.samples?.map(s => s.name)).toContain('Plasma');
    expect(rackIds(layout, 0)).toContain('rack-1');
  });
});

describe('pasteShelf (contents only)', () => {
  let layout: SavedLayout;
  beforeEach(() => {
    layout = makeLayout();
    addBox(layout, 0, 0, 1, 1, 'A');
  });

  it('copy replaces the target shelf contents but keeps both names', () => {
    expect(pasteShelf(layout, layout, 'shelf-1', 'shelf-2', 'copy').ok).toBe(true);
    const [alpha, beta] = layout.freezerData.shelves;
    expect(alpha!.name).toBe('Alpha');
    expect(beta!.name).toBe('Beta');
    expect(rackIds(layout, 0)).toEqual(['rack-1', 'rack-2']);        // source untouched
    expect(beta!.racks).toHaveLength(2);                              // rack-3 replaced by the copies
    expect(beta!.racks.map(r => r.id)).not.toContain('rack-3');
    expect(beta!.racks.map(r => r.id)).not.toContain('rack-1');       // new ids
    expect(beta!.racks[0]!.boxSlots[0]!.box?.name).toBe('A');
  });

  it('cut empties the source shelf but keeps its name', () => {
    expect(pasteShelf(layout, layout, 'shelf-1', 'shelf-2', 'cut').ok).toBe(true);
    expect(layout.freezerData.shelves[0]!.name).toBe('Alpha');
    expect(rackIds(layout, 0)).toEqual([]);
    expect(layout.freezerData.shelves[1]!.name).toBe('Beta');
    expect(rackIds(layout, 1)).toEqual(['rack-1', 'rack-2']);
  });

  it('rejects pasting a shelf onto itself or onto a shelf that does not exist', () => {
    expect(pasteShelf(layout, layout, 'shelf-1', 'shelf-1', 'copy').ok).toBe(false);
    expect(pasteShelf(layout, layout, 'shelf-1', 'missing', 'cut').ok).toBe(false);
    expect(rackIds(layout, 0)).toEqual(['rack-1', 'rack-2']);
  });

  it('between freezers brings samples along and cut empties the source shelf', () => {
    const other = makeLayout('layout-b');
    assignSampleToPosition(layout, slotOf(layout, 'rack-1', 1, 1).box!.positions[0]!.id, 'Serum');
    expect(pasteShelf(layout, other, 'shelf-1', 'shelf-2', 'cut').ok).toBe(true);
    expect(rackIds(layout, 0)).toEqual([]);
    expect(other.freezerData.shelves[1]!.racks.map(r => r.id)).toEqual(['rack-1', 'rack-2']);
    expect(other.freezerData.samples?.map(s => s.name)).toContain('Serum');
  });
});
