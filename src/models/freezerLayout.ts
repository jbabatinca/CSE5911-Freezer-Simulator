/**
 * Current version of the freezer layout format.
 */
export const FREEZER_LAYOUT_SCHEMA_VERSION = "1.0" as const;

/**
 * Maximum capacity for each part of the freezer.
 */
export const FREEZER_LAYOUT_LIMITS = {
  maxShelvesPerFreezer: 4,
  maxRacksPerShelf: 6,
  maxBoxSlotsPerRack: 16,
  maxPositionsPerBox: 81,
  boxRows: 9,
  boxColumns: 9,
  maxPositionRows: 9,
  maxPositionColumns: 9,
} as const;

export type FreezerLayoutSchemaVersion =
  typeof FREEZER_LAYOUT_SCHEMA_VERSION;

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
 * Freezer → Shelves → Racks → BoxSlots → Boxes → Positions
 */
export interface FreezerLayout {
  schemaVersion: FreezerLayoutSchemaVersion;
  id: string;
  name: string;
  shelves: FreezerShelf[];
}