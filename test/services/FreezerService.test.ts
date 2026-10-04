import { describe, it, expect, beforeEach } from 'vitest';
import type { SavedLayout } from '../../src/models/SavedLayout.js';
import {
  addShelf,
  removeShelf,
  addRack,
  removeRack,
  addBox,
  removeBox,
  createSample,
  removeSampleFromLayout,
  addSample,
  removeSample
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

  it('should create box with 81 empty positions (9x9)', () => {
    addBox(layout, 0, 0, 1, 1);
    const box = layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box;
    expect(box?.positions).toHaveLength(0);
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

  it('should add a sample position to a box', () => {
    const shelf = {
      id: 'shelf-1',
      name: 'Shelf 1',
      racks: [
        {
          id: 'rack-1',
          name: 'Rack 1',
          boxSlots: [
            {
              row: 1,
              column: 1,
              box: {
                id: 'box-1',
                name: 'Box 1-1',
                rows: 9,
                columns: 9,
                positions: []
              }
            },
            ...Array.from({ length: 15 }, (_, i) => ({
              row: Math.floor((i + 1) / 4) + 1,
              column: ((i + 1) % 4) + 1,
              box: null
            }))
          ]
        }
      ]
    };
    layout.freezerData.shelves.push(shelf);

    addSample(layout, 0, 0, 1, 1, 1, 1);
    const box = layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box;
    expect(box?.positions).toHaveLength(1);
    expect(box?.positions[0]?.label).toBe('A1');
  });
});
