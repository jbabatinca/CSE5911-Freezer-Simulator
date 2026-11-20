import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SavedLayout } from '../../src/models/SavedLayout.js';
import type { FreezerShelf, SamplePosition } from '../../src/models/freezerLayout.js';
import {
  addShelf,
  removeShelf,
  addRack,
  removeRack,
  addBox,
  removeBox,
  createSample,
  removeSampleFromLayout,
  removeSampleFromPosition,
  assignSampleToPosition
} from '../../src/services/FreezerService.js';

describe('FreezerService - Shelf Operations', () => {
  let layout: SavedLayout;

  beforeEach(() => {
    layout = {
      id: 'test-layout',
      name: 'Test Layout',
      freezerData: {
        schemaVersion: '1.0',
        id: 'test-freezer',
        name: 'Test Freezer',
        shelves: [],
        samples: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  it('should add a shelf to the freezer', () => {
    addShelf(layout);
    expect(layout.freezerData.shelves).toHaveLength(1);
    expect(layout.freezerData.shelves[0]?.name).toBe('Shelf 1');
  });

  it('should add multiple shelves up to the limit (4)', () => {
    addShelf(layout);
    addShelf(layout);
    addShelf(layout);
    addShelf(layout);
    expect(layout.freezerData.shelves).toHaveLength(4);
  });

  it('should not add more than 4 shelves', () => {
    addShelf(layout);
    addShelf(layout);
    addShelf(layout);
    addShelf(layout);
    addShelf(layout); // Should not add
    expect(layout.freezerData.shelves).toHaveLength(4);
  });

  it('should remove a shelf by index', () => {
    addShelf(layout);
    addShelf(layout);
    expect(layout.freezerData.shelves).toHaveLength(2);
    removeShelf(layout, 0);
    expect(layout.freezerData.shelves).toHaveLength(1);
  });

  it('should not remove shelf with invalid index', () => {
    addShelf(layout);
    removeShelf(layout, 5);
    expect(layout.freezerData.shelves).toHaveLength(1);
  });
});

describe('FreezerService - Rack Operations', () => {
  let layout: SavedLayout;

  beforeEach(() => {
    layout = {
      id: 'test-layout',
      name: 'Test Layout',
      freezerData: {
        schemaVersion: '1.0',
        id: 'test-freezer',
        name: 'Test Freezer',
        shelves: [
          {
            id: 'shelf-1',
            name: 'Shelf 1',
            racks: []
          }
        ],
        samples: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  it('should add a rack to a shelf', () => {
    const shelfId = layout.freezerData.shelves[0]!.id;
    addRack(layout, shelfId);
    expect(layout.freezerData.shelves[0]?.racks).toHaveLength(1);
  });

  it('should add multiple racks up to the limit (6)', () => {
    const shelfId = layout.freezerData.shelves[0]!.id;
    for (let i = 0; i < 6; i++) {
      addRack(layout, shelfId);
    }
    expect(layout.freezerData.shelves[0]?.racks).toHaveLength(6);
  });

  it('should not add more than 6 racks per shelf', () => {
    const shelfId = layout.freezerData.shelves[0]!.id;
    for (let i = 0; i < 7; i++) {
      addRack(layout, shelfId);
    }
    expect(layout.freezerData.shelves[0]?.racks).toHaveLength(6);
  });

  it('should create rack with 16 boxSlots (4x4 grid)', () => {
    const shelfId = layout.freezerData.shelves[0]!.id;
    addRack(layout, shelfId);
    const rack = layout.freezerData.shelves[0]?.racks[0];
    expect(rack?.boxSlots).toHaveLength(16);
  });

  it('should remove a rack from a shelf', () => {
    const shelfId = layout.freezerData.shelves[0]!.id;
    addRack(layout, shelfId);
    addRack(layout, shelfId);
    removeRack(layout, 0, 0);
    expect(layout.freezerData.shelves[0]?.racks).toHaveLength(1);
  });
});

describe('FreezerService - Box Operations', () => {
  let layout: SavedLayout;

  beforeEach(() => {
    layout = {
      id: 'test-layout',
      name: 'Test Layout',
      freezerData: {
        schemaVersion: '1.0',
        id: 'test-freezer',
        name: 'Test Freezer',
        shelves: [
          {
            id: 'shelf-1',
            name: 'Shelf 1',
            racks: [
              {
                id: 'rack-1',
                name: 'Rack 1',
                boxSlots: Array.from({ length: 16 }, (_, i) => ({
                  row: Math.floor(i / 4) + 1,
                  column: (i % 4) + 1,
                  box: null
                }))
              }
            ]
          }
        ],
        samples: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  it('should add a box to a rack position', () => {
    addBox(layout, 0, 0, 1, 1);
    const box = layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box;
    expect(box).not.toBeNull();
    expect(box?.rows).toBe(9);
    expect(box?.columns).toBe(9);
  });

  it('should not add box to occupied slot', () => {
    addBox(layout, 0, 0, 1, 1);
    addBox(layout, 0, 0, 1, 1);
    const slot = layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0];
    expect(slot?.box?.id).toBeDefined();
  });

  it('should remove a box from a rack position', () => {
    addBox(layout, 0, 0, 1, 1);
    expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box).not.toBeNull();
    removeBox(layout, 0, 0, 1, 1);
    expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box).toBeNull();
  });
});

describe('FreezerService - Sample Operations', () => {
  let layout: SavedLayout;

  beforeEach(() => {
    layout = {
      id: 'test-layout',
      name: 'Test Layout',
      freezerData: {
        schemaVersion: '1.0',
        id: 'test-freezer',
        name: 'Test Freezer',
        shelves: [],
        samples: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  it('should create a sample in the layout', () => {
    const sample = createSample(layout, 'Test Sample', 'Test Description');
    expect(layout.freezerData.samples).toHaveLength(1);
    expect(sample.name).toBe('Test Sample');
    expect(sample.description).toBe('Test Description');
  });

  it('should remove a sample from the layout', () => {
    const sample = createSample(layout, 'Test Sample');
    expect(layout.freezerData.samples).toHaveLength(1);
    removeSampleFromLayout(layout, sample.id);
    expect(layout.freezerData.samples).toHaveLength(0);
  });

    // Builds shelf -> rack -> box through the service, so the box gets its 81 positions.
  function layoutWithBox(): SavedLayout {
    addShelf(layout);
    addRack(layout, layout.freezerData.shelves[0]!.id);
    addBox(layout, 0, 0, 1, 1);
    return layout;
  }
  const getBox = () => layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!;

  it('should give every new box 81 unique empty positions', () => {
    layoutWithBox();
    const positions = getBox().positions;
    expect(positions).toHaveLength(81);
    expect(positions.every(position => !position.sampleId)).toBe(true);
    expect(new Set(positions.map(position => position.id)).size).toBe(81);
    expect(positions[0]?.label).toBe('A1');
    expect(positions[80]?.label).toBe('I9');
  });

  it('should clear the sample but keep the position when a sample is removed from a position', () => {
    layoutWithBox();
    const position = getBox().positions[0]!;
    assignSampleToPosition(layout, position.id, 'Plasma');
    expect(position.sampleId).toBeDefined();

    removeSampleFromPosition(layout, position.id);

    expect(getBox().positions).toHaveLength(81);
    expect(position.sampleId).toBeUndefined();
  });

  it('should delete the sample record when its only position is cleared', () => {
    layoutWithBox();
    const position = getBox().positions[0]!;
    assignSampleToPosition(layout, position.id, 'Plasma');
    expect(layout.freezerData.samples).toHaveLength(1);

    removeSampleFromPosition(layout, position.id);

    expect(layout.freezerData.samples).toHaveLength(0);
  });

  it('should keep the sample record when another position still uses it', () => {
    layoutWithBox();
    const [first, second] = getBox().positions as [SamplePosition, SamplePosition];
    assignSampleToPosition(layout, first.id, 'Plasma');
    second.sampleId = first.sampleId!;

    removeSampleFromPosition(layout, first.id);

    expect(first.sampleId).toBeUndefined();
    expect(layout.freezerData.samples).toHaveLength(1);
  });

  it('should do nothing for an unknown or already empty position id', () => {
    layoutWithBox();
    removeSampleFromPosition(layout, 'does-not-exist');
    removeSampleFromPosition(layout, getBox().positions[0]!.id);
    expect(getBox().positions).toHaveLength(81);
    expect(layout.freezerData.samples).toHaveLength(0);
  });

  it('should let a cleared position take a new sample', () => {
    layoutWithBox();
    const position = getBox().positions[0]!;
    assignSampleToPosition(layout, position.id, 'Plasma');
    removeSampleFromPosition(layout, position.id);
    assignSampleToPosition(layout, position.id, 'Serum');

    expect(layout.freezerData.samples?.map(sample => sample.name)).toEqual(['Serum']);
    expect(position.sampleId).toBe(layout.freezerData.samples![0]!.id);
  });
});

describe('FreezerService - schema-driven limits', () => {
  let layout: SavedLayout;
  let alertMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    alertMock = vi.fn();
    vi.stubGlobal('alert', alertMock);
    layout = {
      id: 'test-layout',
      name: 'Test Layout',
      freezerData: {
        schemaVersion: '1.0',
        id: 'test-freezer',
        name: 'Test Freezer',
        shelves: [],
        samples: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addShelf(layout);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create a new rack with 16 box slots in a 4x4 grid', () => {
    addRack(layout, layout.freezerData.shelves[0]!.id);
    const slots = layout.freezerData.shelves[0]!.racks[0]!.boxSlots;
    expect(slots).toHaveLength(16);
    expect(slots[0]).toEqual({ row: 1, column: 1, box: null });
    expect(slots[15]).toEqual({ row: 4, column: 4, box: null });
  });

  it('should create a new box with 9x9 dimensions and 81 empty positions', () => {
    addRack(layout, layout.freezerData.shelves[0]!.id);
    addBox(layout, 0, 0, 1, 1);
    const box = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!;
    expect(box.rows).toBe(9);
    expect(box.columns).toBe(9);
    expect(box.positions).toHaveLength(81);
    expect(box.positions.every(position => !position.sampleId)).toBe(true);
  });


  it('should alert with the shelf limit when adding a fifth shelf', () => {
    addShelf(layout);
    addShelf(layout);
    addShelf(layout);
    addShelf(layout);
    expect(layout.freezerData.shelves).toHaveLength(4);
    expect(alertMock).toHaveBeenCalledWith('Maximum shelves reached (4)');
  });

  it('should alert with the rack limit when adding a seventh rack', () => {
    const shelfId = layout.freezerData.shelves[0]!.id;
    for (let i = 0; i < 7; i++) addRack(layout, shelfId);
    expect(layout.freezerData.shelves[0]!.racks).toHaveLength(6);
    expect(alertMock).toHaveBeenCalledWith('Maximum racks per shelf reached (6)');
  });
});
