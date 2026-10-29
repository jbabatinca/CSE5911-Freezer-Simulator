import { describe, it, expect } from 'vitest';
import { validateFreezerLayout } from '../../src/services/LayoutValidator';
import sampleLayout from '../../src/data/sample-freezer-layout.json';

function makeRack(id = 'rack-1', color?: string, boxColor?: string) {
  const rack: Record<string, unknown> = {
    id,
    name: `Rack ${id}`,
    boxSlots: Array.from({ length: 16 }, (_, i) => ({
      row: Math.floor(i / 4) + 1,
      column: (i % 4) + 1,
      box: null,
    })),
  };
  if (color !== undefined) rack.color = color;
  if (boxColor !== undefined) {
    (rack.boxSlots as Array<Record<string, unknown>>)[0]!.box = {
      id: 'box-1',
      name: 'Box 1-1',
      rows: 9,
      columns: 9,
      positions: [],
      color: boxColor,
    };
  }
  return rack;
}

function makeFreezer(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: '1.0',
    id: 'freezer-1',
    name: 'Test Freezer',
    shelves: [{ id: 'shelf-1', name: 'Shelf 1', racks: [makeRack()] }],
    ...overrides,
  };
}

function errorsOf(data: unknown): string[] {
  const result = validateFreezerLayout(data);
  return result.ok ? [] : result.errors;
}

describe('validateFreezerLayout', () => {
  describe('valid layouts', () => {
    it('accepts the sample layout', () => {
      const result = validateFreezerLayout(sampleLayout);
      expect(errorsOf(sampleLayout)).toEqual([]);
      expect(result.ok).toBe(true);
    });

    it('accepts a minimal layout and returns it unchanged', () => {
      const layout = makeFreezer();
      const result = validateFreezerLayout(layout);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.layout).toBe(layout);
    });

    it('accepts a layout with no shelves', () => {
      expect(validateFreezerLayout(makeFreezer({ shelves: [] })).ok).toBe(true);
    });

    it('accepts racks and boxes with no color', () => {
      expect(validateFreezerLayout(makeFreezer()).ok).toBe(true);
    });

    it('accepts valid hex colors on a rack and a box', () => {
      const layout = makeFreezer({
        shelves: [{ id: 's', name: 'S', racks: [makeRack('r', '#2878C7', '#abcdef')] }],
      });
      expect(validateFreezerLayout(layout).ok).toBe(true);
    });
  });

  describe('capacity limits from the schema', () => {
    it('accepts 4 shelves and rejects 5', () => {
      const shelf = (n: number) => ({ id: `s${n}`, name: `S${n}`, racks: [] });
      expect(validateFreezerLayout(makeFreezer({ shelves: [1, 2, 3, 4].map(shelf) })).ok).toBe(true);

      const errors = errorsOf(makeFreezer({ shelves: [1, 2, 3, 4, 5].map(shelf) }));
      expect(errors.some(e => e.startsWith('/shelves'))).toBe(true);
    });

    it('accepts 6 racks on a shelf and rejects 7', () => {
      const shelfWith = (count: number) => ({
        id: 's',
        name: 'S',
        racks: Array.from({ length: count }, (_, i) => makeRack(`r${i}`)),
      });
      expect(validateFreezerLayout(makeFreezer({ shelves: [shelfWith(6)] })).ok).toBe(true);

      const errors = errorsOf(makeFreezer({ shelves: [shelfWith(7)] }));
      expect(errors.some(e => e.startsWith('/shelves/0/racks'))).toBe(true);
    });

    it('rejects a rack with fewer than 16 box slots', () => {
      const rack = makeRack();
      (rack.boxSlots as unknown[]).pop();
      const errors = errorsOf(makeFreezer({ shelves: [{ id: 's', name: 'S', racks: [rack] }] }));
      expect(errors.some(e => e.includes('boxSlots'))).toBe(true);
    });

    it('rejects a box slot outside the 4x4 grid', () => {
      const rack = makeRack();
      (rack.boxSlots as Array<Record<string, unknown>>)[0]!.row = 5;
      const errors = errorsOf(makeFreezer({ shelves: [{ id: 's', name: 'S', racks: [rack] }] }));
      expect(errors.some(e => e.includes('/boxSlots/0/row'))).toBe(true);
    });

    it('rejects a box that is not 9x9', () => {
      const rack = makeRack('r', undefined, '#FFFFFF');
      const box = (rack.boxSlots as Array<Record<string, unknown>>)[0]!.box as Record<string, unknown>;
      box.rows = 8;
      const errors = errorsOf(makeFreezer({ shelves: [{ id: 's', name: 'S', racks: [rack] }] }));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects a box with more than 81 positions', () => {
      const rack = makeRack('r', undefined, '#FFFFFF');
      const box = (rack.boxSlots as Array<Record<string, unknown>>)[0]!.box as Record<string, unknown>;
      box.positions = Array.from({ length: 82 }, (_, i) => ({
        id: `p${i}`,
        label: `P${i}`,
        row: 1,
        column: 1,
      }));
      const errors = errorsOf(makeFreezer({ shelves: [{ id: 's', name: 'S', racks: [rack] }] }));
      expect(errors.some(e => e.includes('positions'))).toBe(true);
    });
  });

  describe('invalid colors', () => {
    it.each(['blue', '#fff', '#GGGGGG', '', 'ffffff'])('rejects rack color "%s"', (color) => {
      const layout = makeFreezer({ shelves: [{ id: 's', name: 'S', racks: [makeRack('r', color)] }] });
      const errors = errorsOf(layout);
      expect(errors.some(e => e.includes('/racks/0/color'))).toBe(true);
    });

    it('rejects an invalid box color', () => {
      const layout = makeFreezer({ shelves: [{ id: 's', name: 'S', racks: [makeRack('r', undefined, 'red')] }] });
      expect(validateFreezerLayout(layout).ok).toBe(false);
    });
  });

  describe('required fields and shape', () => {
    it.each(['schemaVersion', 'id', 'name', 'shelves'])('rejects a layout missing %s', (field) => {
      const layout = makeFreezer() as Record<string, unknown>;
      delete layout[field];
      expect(validateFreezerLayout(layout).ok).toBe(false);
    });

    it('rejects an unsupported schemaVersion', () => {
      expect(validateFreezerLayout(makeFreezer({ schemaVersion: '2.0' })).ok).toBe(false);
    });

    it('rejects an empty name', () => {
      expect(validateFreezerLayout(makeFreezer({ name: '' })).ok).toBe(false);
    });

    it('rejects unknown extra fields', () => {
      expect(validateFreezerLayout(makeFreezer({ unexpected: true })).ok).toBe(false);
    });

    it('rejects shelves that are not an array', () => {
      expect(validateFreezerLayout(makeFreezer({ shelves: 'none' })).ok).toBe(false);
    });
  });

  describe('non-layout input', () => {
    it.each([null, undefined, 'text', 42, [], {}])('returns ok: false without throwing for %j', (input) => {
      expect(() => validateFreezerLayout(input)).not.toThrow();
      expect(validateFreezerLayout(input).ok).toBe(false);
    });
  });

  describe('error messages', () => {
    it('includes the JSON path and the problem', () => {
      const errors = errorsOf(makeFreezer({ shelves: [{ id: 's', name: 'S', racks: [makeRack('r', 'blue')] }] }));
      expect(errors).toContain('/shelves/0/racks/0/color must match pattern "^#[0-9A-Fa-f]{6}$"');
    });

    it('reports every problem, not only the first', () => {
      const errors = errorsOf(makeFreezer({ name: '', schemaVersion: '9.9' }));
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
