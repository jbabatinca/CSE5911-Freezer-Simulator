import schema from './freezer-layout.schema.json';

/**
 * Current version of the freezer layout format.
 */
export const FREEZER_LAYOUT_SCHEMA_VERSION = "1.0" as const;

/**
 * Maximum capacity for each part of the freezer.
 */
const { shelf, rack, boxSlot, box, position } = schema.$defs;

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

const COLOR_HEX = new RegExp(schema.$defs.colorHex.pattern);

export function isHexColor(value: string | undefined | null): value is string {
  return value !== undefined && value !== null && COLOR_HEX.test(value);
}

export type FreezerLayoutSchemaVersion =
  typeof FREEZER_LAYOUT_SCHEMA_VERSION;

/**
 * A sample that can be stored in a box position.
 */
export interface Sample {
  id: string;
  name: string;
  description?: string;
}

/**
 * A single position inside a storage box.
 * Example: position A1.
 */
export interface BoxPosition {
  id: string;
  label: string;
  row: number;
  column: number;
  sampleId?: string;
}

/**
 * A box can contain zero to 81 positions.
 */
export interface FreezerBox {
  id: string;
  name: string;
  color?: string;
  rows: 9;
  columns: 9;
  positions: BoxPosition[];
}

/**
 * A fixed placeholder for a box in the rack's 4x4 grid.
 * Each slot can contain a box or be empty (null).
 */
export interface FreezerBoxSlot {
  row: number;      // 1-4
  column: number;   // 1-4
  box: FreezerBox | null;
}

/**
 * A rack can contain zero to 16 boxes.
 */
export interface FreezerRack {
  id: string;
  name: string;
  color?: string;
  boxSlots: FreezerBoxSlot[];
}

/**
 * A shelf can contain zero to six racks.
 */
export interface FreezerShelf {
  id: string;
  name: string;
  racks: FreezerRack[];
}

/**
 * Main freezer layout.
 *
 * Freezer → Shelves → Racks → BoxSlots → Boxes → Positions → Samples
 */
export interface FreezerLayout {
  schemaVersion: FreezerLayoutSchemaVersion;
  id: string;
  name: string;
  shelves: FreezerShelf[];
  samples: Sample[];
}
