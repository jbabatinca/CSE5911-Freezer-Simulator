import { describe, it, expect } from 'vitest';
import freezerData from '../../src/data/sample-freezer-layout.json';
import schema from '../../src/models/freezer-layout.schema.json';
import { FREEZER_LAYOUT_LIMITS, FREEZER_LAYOUT_SCHEMA_VERSION, isHexColor } from '../../src/models/freezerLayout';

describe('Freezer Layout Schema', () => {
  it('should have valid freezer structure', () => {
    expect(freezerData).toHaveProperty('schemaVersion', '1.0');
    expect(freezerData).toHaveProperty('id');
    expect(freezerData).toHaveProperty('name');
    expect(freezerData).toHaveProperty('shelves');
  });

  it('should have valid shelf structure', () => {
    const shelf = freezerData.shelves[0];
    expect(shelf).toHaveProperty('id');
    expect(shelf).toHaveProperty('name');
    expect(shelf).toHaveProperty('racks');
  });

  it('should have exactly 16 boxSlots per rack', () => {
    freezerData.shelves.forEach(shelf => {
      shelf.racks.forEach(rack => {
        expect(rack.boxSlots).toHaveLength(16);
      });
    });
  });

  it('should have valid boxSlot positions (1-4 for row/column)', () => {
    freezerData.shelves.forEach(shelf => {
      shelf.racks.forEach(rack => {
        rack.boxSlots.forEach(slot => {
          expect(slot.row).toBeGreaterThanOrEqual(1);
          expect(slot.row).toBeLessThanOrEqual(4);
          expect(slot.column).toBeGreaterThanOrEqual(1);
          expect(slot.column).toBeLessThanOrEqual(4);
        });
      });
    });
  });

  it('should have boxes with 9x9 dimensions', () => {
    freezerData.shelves.forEach(shelf => {
      shelf.racks.forEach(rack => {
        rack.boxSlots.forEach(slot => {
          if (slot.box) {
            expect(slot.box.rows).toBe(9);
            expect(slot.box.columns).toBe(9);
          }
        });
      });
    });
  });

  it('should have valid positions (1-9 for row/column)', () => {
    freezerData.shelves.forEach(shelf => {
      shelf.racks.forEach(rack => {
        rack.boxSlots.forEach(slot => {
          if (slot.box) {
            slot.box.positions.forEach(pos => {
              expect(pos.row).toBeGreaterThanOrEqual(1);
              expect(pos.row).toBeLessThanOrEqual(9);
              expect(pos.column).toBeGreaterThanOrEqual(1);
              expect(pos.column).toBeLessThanOrEqual(9);
            });
          }
        });
      });
    });
  });

  it('should have max 81 positions per box', () => {
    freezerData.shelves.forEach(shelf => {
      shelf.racks.forEach(rack => {
        rack.boxSlots.forEach(slot => {
          if (slot.box) {
            expect(slot.box.positions.length).toBeLessThanOrEqual(81);
          }
        });
      });
    });
  });

  it('reads the layout limits from the schema', () => {
    expect(FREEZER_LAYOUT_LIMITS).toEqual({
      maxShelvesPerFreezer: 4, maxRacksPerShelf: 6, maxBoxSlotsPerRack: 16,
      maxPositionsPerBox: 81, rackRows: 4, rackColumns: 4,
      boxRows: 9, boxColumns: 9, maxPositionRows: 9, maxPositionColumns: 9,
    });
  });

  it('keeps the version constant in sync with the schema', () => {
    expect(FREEZER_LAYOUT_SCHEMA_VERSION).toBe(schema.properties.schemaVersion.const);
  });
});

describe('isHexColor', () => {
  it.each(['#FFFFFF', '#abcdef', '#000000', '#2878C7'])('accepts %s', (color) => {
    expect(isHexColor(color)).toBe(true);
  });

  it.each(['#fff', '#GGGGGG', 'blue', '', 'ffffff', '#12345', '#1234567', undefined, null])(
    'rejects %s',
    (color) => {
      expect(isHexColor(color as string | undefined | null)).toBe(false);
    }
  );
});

