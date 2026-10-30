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


export type {
  FreezerLayout,
  FreezerShelf,
  FreezerRack,
  FreezerBoxSlot,
  FreezerBox,
  SamplePosition,
  Sample,
} from './generated/freezerLayout.types.js';

