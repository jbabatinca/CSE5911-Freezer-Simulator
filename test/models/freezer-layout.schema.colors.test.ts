import { describe, it, expect, beforeAll } from 'vitest';
import Ajv2020 from 'ajv/dist/2020.js';
import schema from '../../src/models/freezer-layout.schema.json';

let validate: ReturnType<Ajv2020['compile']>;

beforeAll(() => {
  const ajv = new Ajv2020();
  validate = ajv.compile(schema);
});

function makeFreezer(rackColor?: string, boxColor?: string) {
  const rack: Record<string, unknown> = {
    id: 'rack-1',
    name: 'Rack 1',
    boxSlots: Array.from({ length: 16 }, (_, i) => ({
      row: Math.floor(i / 4) + 1,
      column: (i % 4) + 1,
      box: null
    }))
  };
  if (rackColor !== undefined) rack.color = rackColor;

  if (boxColor !== undefined) {
    rack.boxSlots = (rack.boxSlots as Array<Record<string, unknown>>).map((slot, i) =>
      i === 0
        ? {
            ...slot,
            box: { id: 'box-1', name: 'Box 1-1', rows: 9, columns: 9, positions: [], color: boxColor }
          }
        : slot
    );
  }

  return {
    schemaVersion: '1.0',
    id: 'freezer-1',
    name: 'Test Freezer',
    shelves: [{ id: 'shelf-1', name: 'Shelf 1', racks: [rack] }]
  };
}

describe('Freezer Layout Schema - color fields', () => {
  it('should accept a layout with no colors', () => {
    expect(validate(makeFreezer())).toBe(true);
  });

  it('should accept a valid rack color', () => {
    expect(validate(makeFreezer('#2E9D50'))).toBe(true);
  });

  it('should accept a lowercase rack color', () => {
    expect(validate(makeFreezer('#2878c7'))).toBe(true);
  });

  it('should reject a rack color that is a color name', () => {
    expect(validate(makeFreezer('red'))).toBe(false);
  });

  it('should reject a 3-digit rack color', () => {
    expect(validate(makeFreezer('#FFF'))).toBe(false);
  });

  it('should reject a rack color with non-hex characters', () => {
    expect(validate(makeFreezer('#GGGGGG'))).toBe(false);
  });

  it('should accept a valid box color', () => {
    expect(validate(makeFreezer(undefined, '#F2D21B'))).toBe(true);
  });

  it('should reject a box color that is a color name', () => {
    expect(validate(makeFreezer(undefined, 'blue'))).toBe(false);
  });
});

describe('Freezer Layout Schema - samples', () => {
  it('should accept a layout that stores samples at the top level', () => {
    const freezer = { ...makeFreezer(), samples: [{ id: 'sample-1', name: 'Tube 7' }] };
    expect(validate(freezer)).toBe(true);
  });
});
