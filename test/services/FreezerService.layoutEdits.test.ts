import { describe, it, expect, beforeEach } from 'vitest';
import type { SavedLayout } from '../../src/models/SavedLayout.js';
import {
  addBox,
  renameRack,
  setRackColor,
  renameBox,
  setBoxColor,
  createSample,
  renameSample,
  assignSampleToPosition,
  addSample
} from '../../src/services/FreezerService.js';

function makeLayout(): SavedLayout {
  return {
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
}

describe('FreezerService - Rack Rename and Color', () => {
  let layout: SavedLayout;

  beforeEach(() => {
    layout = makeLayout();
  });

  it('should rename a rack and trim whitespace', () => {
    renameRack(layout, 'rack-1', '  Freezer A  ');
    expect(layout.freezerData.shelves[0]?.racks[0]?.name).toBe('Freezer A');
  });

  it('should ignore a rename for an unknown rack id', () => {
    renameRack(layout, 'missing', 'Nope');
    expect(layout.freezerData.shelves[0]?.racks[0]?.name).toBe('Rack 1');
  });

  it('should set a rack color from a valid hex value', () => {
    setRackColor(layout, 'rack-1', '#2E9D50');
    expect(layout.freezerData.shelves[0]?.racks[0]?.color).toBe('#2E9D50');
  });

  it('should reject a rack color that is not a 6-digit hex value', () => {
    setRackColor(layout, 'rack-1', 'red');
    setRackColor(layout, 'rack-1', '#FFF');
    setRackColor(layout, 'rack-1', '#GGGGGG');
    expect(layout.freezerData.shelves[0]?.racks[0]?.color).toBeUndefined();
  });

  it('should keep the previous rack color when given an invalid one', () => {
    setRackColor(layout, 'rack-1', '#2878C7');
    setRackColor(layout, 'rack-1', 'not-a-color');
    expect(layout.freezerData.shelves[0]?.racks[0]?.color).toBe('#2878C7');
  });
});

describe('FreezerService - Box Name and Color', () => {
  let layout: SavedLayout;

  beforeEach(() => {
    layout = makeLayout();
  });

  it('should use the custom name passed to addBox', () => {
    addBox(layout, 0, 0, 1, 1, '  Stem cells  ');
    expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box?.name).toBe('Stem cells');
  });

  it('should fall back to the row-column name when addBox gets a blank name', () => {
    addBox(layout, 0, 0, 2, 3, '   ');
    expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots[6]?.box?.name).toBe('Box 2-3');
  });

  it('should default to the row-column name when no name is passed', () => {
    addBox(layout, 0, 0, 1, 2);
    expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots[1]?.box?.name).toBe('Box 1-2');
  });

  it('should rename a box by id and trim whitespace', () => {
    addBox(layout, 0, 0, 1, 1);
    const boxId = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.id;
    renameBox(layout, boxId, '  Plasma  ');
    expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box?.name).toBe('Plasma');
  });

  it('should ignore a rename for an unknown box id', () => {
    addBox(layout, 0, 0, 1, 1, 'Original');
    renameBox(layout, 'missing', 'Changed');
    expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box?.name).toBe('Original');
  });

  it('should set a box color from a valid hex value', () => {
    addBox(layout, 0, 0, 1, 1);
    const boxId = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.id;
    setBoxColor(layout, boxId, '#F2D21B');
    expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box?.color).toBe('#F2D21B');
  });

  it('should reject an invalid box color and keep the previous one', () => {
    addBox(layout, 0, 0, 1, 1);
    const boxId = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.id;
    setBoxColor(layout, boxId, '#2878C7');
    setBoxColor(layout, boxId, 'blue');
    expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box?.color).toBe('#2878C7');
  });

  it('should remove the box color key when color is set to null (match rack)', () => {
    addBox(layout, 0, 0, 1, 1);
    const boxId = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.id;
    setBoxColor(layout, boxId, '#2878C7');
    setBoxColor(layout, boxId, null);
    expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box).not.toHaveProperty('color');
  });
});

describe('FreezerService - Sample Naming and Assignment', () => {
  let layout: SavedLayout;

  beforeEach(() => {
    layout = makeLayout();
  });

  it('should create the samples list when the layout has none', () => {
    delete (layout.freezerData as { samples?: unknown }).samples;
    createSample(layout, 'Sample A');
    expect(layout.freezerData.samples).toHaveLength(1);
  });

  it('should rename a sample and trim whitespace', () => {
    const sample = createSample(layout, 'Old');
    renameSample(layout, sample.id, '  New name  ');
    expect(layout.freezerData.samples?.[0]?.name).toBe('New name');
  });

  it('should create and assign a named sample when addSample gets a name', () => {
    addBox(layout, 0, 0, 1, 1);
    addSample(layout, 0, 0, 1, 1, 1, 1, '  Tube 7  ');
    const position = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.positions[0]!;
    const linked = layout.freezerData.samples?.find(s => s.id === position.sampleId);
    expect(linked?.name).toBe('Tube 7');
  });

  it('should reuse an existing unassigned sample when no name is given', () => {
    const spare = createSample(layout, 'Spare');
    addBox(layout, 0, 0, 1, 1);
    addSample(layout, 0, 0, 1, 1, 1, 1);
    const position = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.positions[0]!;
    expect(position.sampleId).toBe(spare.id);
    expect(layout.freezerData.samples).toHaveLength(1);
  });

  it('should leave a position without a sample when nothing is unassigned', () => {
    addBox(layout, 0, 0, 1, 1);
    addSample(layout, 0, 0, 1, 1, 1, 1);
    const position = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.positions[0]!;
    expect(position.sampleId).toBeUndefined();
  });

  it('should assign a named sample to an empty position via assignSampleToPosition', () => {
    addBox(layout, 0, 0, 1, 1);
    addSample(layout, 0, 0, 1, 1, 1, 1);
    const position = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.positions[0]!;

    assignSampleToPosition(layout, position.id, '  Aliquot  ');

    const linked = layout.freezerData.samples?.find(s => s.id === position.sampleId);
    expect(linked?.name).toBe('Aliquot');
  });

  it('should not overwrite a position that already has a sample', () => {
    addBox(layout, 0, 0, 1, 1);
    addSample(layout, 0, 0, 1, 1, 1, 1, 'First');
    const position = layout.freezerData.shelves[0]!.racks[0]!.boxSlots[0]!.box!.positions[0]!;
    const originalSampleId = position.sampleId;

    assignSampleToPosition(layout, position.id, 'Second');

    expect(position.sampleId).toBe(originalSampleId);
    expect(layout.freezerData.samples).toHaveLength(1);
  });
});
