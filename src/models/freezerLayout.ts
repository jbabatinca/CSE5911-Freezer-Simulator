/**
 * freezerLayout.ts - central entry point for the freezer layout model.
 * Wraps freezer-layout.schema.json: exposes the schema version, the capacity
 * limits (shelves, racks, boxes, positions), a hex-color check, and the
 * generated TypeScript types. Real-world capacities live in the schema, not here.
 */
import schema from './freezer-layout.schema.json';

/**
 * Current version of the freezer layout format.
 */
export const FREEZER_LAYOUT_SCHEMA_VERSION = "1.0" as const;

// Pull the size definitions out of the JSON schema so the limits below are
// read from the schema instead of being duplicated (and drifting) here.
const { shelf, rack, boxSlot, box, position } = schema.$defs;

/**
 * Maximum capacity for each part of the freezer, read from the schema.
 * maxX = most items allowed; rackRows/rackColumns = box-slot grid size per rack;
 * boxRows/boxColumns = fixed sample grid size of a box; maxPositionRows/Columns =
 * largest row/column index a sample position may use.
 */
export const FREEZER_LAYOUT_LIMITS = {
  maxShelvesPerFreezer: schema.properties.shelves.maxItems,
  maxRacksPerShelf: shelf.properties.racks.maxItems,
  maxBoxSlotsPerRack: rack.properties.boxSlots.maxItems,
  maxPositionsPerBox: box.properties.positions.maxItems,
  rackRows: boxSlot.properties.row.maximum,
  rackColumns: boxSlot.properties.column.maximum,
  boxRows: box.properties.rows.const,
  boxColumns: box.properties.columns.const,
  maxPositionRows: position.properties.row.maximum,
  maxPositionColumns: position.properties.column.maximum,
} as const;

// Pattern for valid color strings (hex), taken from the schema's colorHex definition.
const COLOR_HEX = new RegExp(schema.$defs.colorHex.pattern);

/** Type guard: true if `value` is a string matching the schema's hex color pattern (false for null/undefined). */
export function isHexColor(value: string | undefined | null): value is string {
  return value !== undefined && value !== null && COLOR_HEX.test(value);
}

/** Type of the schema version constant (the literal "1.0"). */
export type FreezerLayoutSchemaVersion =
  typeof FREEZER_LAYOUT_SCHEMA_VERSION;

// Re-export the layout types generated from the JSON schema (src/models/generated/)
// so the rest of the app imports them from this one module.
export type {
  FreezerLayout,
  FreezerShelf,
  FreezerRack,
  FreezerBoxSlot,
  FreezerBox,
  SamplePosition,
  Sample,
} from './generated/freezerLayout.types.js';

