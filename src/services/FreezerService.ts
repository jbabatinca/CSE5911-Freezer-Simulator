/**
 * FreezerService.ts - editing operations on a freezer layout.
 * Add/rename/remove shelves, racks, boxes, and samples inside a SavedLayout,
 * enforcing the capacity limits from models/freezerLayout.ts. Functions mutate
 * the layout object in place and return nothing (unless noted); they do NOT save,
 * so callers (App.ts) update `updatedAt` and call saveLayout() afterwards.
 * Invalid indexes/ids are ignored silently rather than throwing.
 */
import type { FreezerShelf, FreezerRack, FreezerBox, SamplePosition, Sample } from '../models/freezerLayout.js';
import type { SavedLayout } from '../models/SavedLayout.js';
import { FREEZER_LAYOUT_LIMITS, isHexColor } from '../models/freezerLayout.js';

// Builds an id like "shelf-<timestamp>-<random>"; unique enough for local use.
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// SHELF operations
/** Appends an empty, auto-named shelf. Shows an alert and does nothing if the shelf limit is reached. */
export function addShelf(layout: SavedLayout): void {
  const freezer = layout.freezerData;
  if (freezer.shelves.length >= FREEZER_LAYOUT_LIMITS.maxShelvesPerFreezer) {
    alert(`Maximum shelves reached (${FREEZER_LAYOUT_LIMITS.maxShelvesPerFreezer})`);
    return;
  }

  const newShelf: FreezerShelf = {
    id: generateId('shelf'),
    name: `Shelf ${freezer.shelves.length + 1}`,
    racks: []
  };

  freezer.shelves.push(newShelf);
}

/** Removes the shelf at `shelfIndex` (with everything on it). Out-of-range index is ignored. */
export function removeShelf(layout: SavedLayout, shelfIndex: number): void {
  const freezer = layout.freezerData;
  if (shelfIndex < 0 || shelfIndex >= freezer.shelves.length) return;
  freezer.shelves.splice(shelfIndex, 1);
}

// RACK operations
/** Adds a new rack (with an empty box-slot grid) to the shelf with id `shelfId`. Alerts if the rack limit is reached. */
export function addRack(layout: SavedLayout, shelfId: string): void {
  const freezer = layout.freezerData;
  const shelf = freezer.shelves.find(s => s.id === shelfId);
  if (!shelf) return;

  if (shelf.racks.length >= FREEZER_LAYOUT_LIMITS.maxRacksPerShelf) {
    alert(`Maximum racks per shelf reached (${FREEZER_LAYOUT_LIMITS.maxRacksPerShelf})`);
    return;
  }

  const newRack: FreezerRack = {
    id: generateId('rack'),
    name: `Rack ${shelf.racks.length + 1}`,
    boxSlots: createEmptyBoxSlots()
  };

  shelf.racks.push(newRack);
}

/** Renames the rack with id `rackId` (searched across all shelves); the name is trimmed. No-op if not found. */
export function renameRack(layout: SavedLayout, rackId: string, rackName: string): void {
  const rack = layout.freezerData.shelves.flatMap(shelf => shelf.racks).find(item => item.id === rackId);
  if (rack) rack.name = rackName.trim();
}

/** Sets a rack's display color. Ignored unless `color` is a valid hex color (see isHexColor). */
export function setRackColor(layout: SavedLayout, rackId: string, color: string): void {
  if (!isHexColor(color)) return;
  const rack = layout.freezerData.shelves.flatMap(shelf => shelf.racks).find(item => item.id === rackId);
  if (rack) rack.color = color;
}

/** Removes the rack at `rackIndex` on the shelf at `shelfIndex`. Out-of-range indexes are ignored. */
export function removeRack(layout: SavedLayout, shelfIndex: number, rackIndex: number): void {
  const freezer = layout.freezerData;
  if (shelfIndex < 0 || shelfIndex >= freezer.shelves.length) return;
  const shelf = freezer.shelves[shelfIndex]!;
  if (rackIndex < 0 || rackIndex >= shelf.racks.length) return;
  shelf.racks.splice(rackIndex, 1);
}

// BOX operations
/**
 * Places a new empty box in the rack slot at (row, column). Rows/columns are 1-based grid
 * coordinates. Does nothing if the slot doesn't exist or already holds a box.
 * `boxName` is optional; defaults to "Box <row>-<column>".
 */
export function addBox(layout: SavedLayout, shelfIndex: number, rackIndex: number, row: number, column: number, boxName?: string): void {
  const freezer = layout.freezerData;
  if (shelfIndex < 0 || shelfIndex >= freezer.shelves.length) return;
  const shelf = freezer.shelves[shelfIndex]!;
  if (rackIndex < 0 || rackIndex >= shelf.racks.length) return;
  const rack = shelf.racks[rackIndex]!;

  const slot = rack.boxSlots.find(s => s.row === row && s.column === column);
  if (!slot || slot.box) return;

  const newBox: FreezerBox = {
    id: generateId('box'),
    name: boxName?.trim() || `Box ${row}-${column}`,
    // Box dimensions are fixed by the schema; the casts narrow to its literal types.
    rows: FREEZER_LAYOUT_LIMITS.boxRows as FreezerBox['rows'],
    columns: FREEZER_LAYOUT_LIMITS.boxColumns as FreezerBox['columns'],
    positions: createEmptySamplePositions()
  };

  slot.box = newBox;
}

/** Renames the box with id `boxId` (searched across the whole layout); the name is trimmed. No-op if not found. */
export function renameBox(layout: SavedLayout, boxId: string, boxName: string): void {
  for (const shelf of layout.freezerData.shelves) {
    for (const rack of shelf.racks) {
      const box = rack.boxSlots.find(slot => slot.box?.id === boxId)?.box;
      if (box) {
        box.name = boxName.trim();
        return;
      }
    }
  }
}

/** Sets a box's color, or pass `null` to clear it so the box inherits its rack's color. Invalid hex is ignored. */
export function setBoxColor(layout: SavedLayout, boxId: string, color: string | null): void {
  if (color !== null && !isHexColor(color)) return;
  for (const shelf of layout.freezerData.shelves) {
    for (const rack of shelf.racks) {
      const box = rack.boxSlots.find(slot => slot.box?.id === boxId)?.box;
      if (box) {
        if (color === null) delete box.color;
        else box.color = color;
        return;
      }
    }
  }
}

/** Empties the rack slot at (row, column), deleting the box and its sample positions. No-op if indexes/slot are invalid. */
export function removeBox(layout: SavedLayout, shelfIndex: number, rackIndex: number, row: number, column: number): void {
  const freezer = layout.freezerData;
  if (shelfIndex < 0 || shelfIndex >= freezer.shelves.length) return;
  const shelf = freezer.shelves[shelfIndex]!;
  if (rackIndex < 0 || rackIndex >= shelf.racks.length) return;
  const rack = shelf.racks[rackIndex]!;

  const slot = rack.boxSlots.find(s => s.row === row && s.column === column);
  if (slot) {
    slot.box = null;
  }
}

// LAYOUT SAMPLES operations (manage samples in the freezer layout)
// Samples live in a layout-wide list (freezerData.samples); box positions point to them by sampleId.
/** Creates a sample (optional description) in the layout-wide list and returns it. Does not place it in any box. */
export function createSample(layout: SavedLayout, name: string, description?: string): Sample {
  layout.freezerData.samples ??= [];
  const newSample: Sample = {
    id: generateId('sample'),
    name,
    ...(description !== undefined ? { description } : {})
  };
  layout.freezerData.samples.push(newSample);
  return newSample;
}

/** Renames the sample with id `sampleId`; if it isn't in the list yet, adds it with that id and name. */
export function renameSample(layout: SavedLayout, sampleId: string, sampleName: string): void {
  layout.freezerData.samples ??= [];
  const sample = layout.freezerData.samples.find(item => item.id === sampleId);
  if (sample) {
    sample.name = sampleName.trim();
    return;
  }

  // Not found: create it so a position that references this id still gets a name.
  layout.freezerData.samples.push({ id: sampleId, name: sampleName.trim() });
}

/** Creates a new sample named `sampleName` and attaches it to the position with id `positionId`, if that position is still empty. */
export function assignSampleToPosition(layout: SavedLayout, positionId: string, sampleName: string): void {
  for (const shelf of layout.freezerData.shelves) {
    for (const rack of shelf.racks) {
      for (const slot of rack.boxSlots) {
        const position = slot.box?.positions.find(item => item.id === positionId);
        if (!position || position.sampleId) continue;

        const specimen = createSample(layout, sampleName.trim());
        position.sampleId = specimen.id;
        return;
      }
    }
  }
}

/** Deletes a sample from the layout-wide list by id. Box positions that referenced it are NOT updated. */
export function removeSampleFromLayout(layout: SavedLayout, sampleId: string): void {
  const samples = layout.freezerData.samples;
  if (!samples) return;
  const idx = samples.findIndex(s => s.id === sampleId);
  if (idx >= 0) {
    samples.splice(idx, 1);
  }
}

// BOX POSITION SAMPLES operations (assign samples to box positions)
/**
 * Adds a sample position at (sampleRow, sampleCol) inside the box at slot (row, column).
 * If `sampleName` is given, a new sample is created for it; otherwise it reuses the first
 * sample not yet assigned to any position (or none). The position label is a letter for the
 * row plus the column number (row 1 -> "A", so row 2, column 3 -> "B3").
 * Alerts and does nothing if the box already has the maximum number of positions.
 */
export function addSample(layout: SavedLayout, shelfIndex: number, rackIndex: number, row: number, column: number, sampleRow: number, sampleCol: number, sampleName?: string): void {
  const freezer = layout.freezerData;
  if (shelfIndex < 0 || shelfIndex >= freezer.shelves.length) return;
  const shelf = freezer.shelves[shelfIndex]!;
  if (rackIndex < 0 || rackIndex >= shelf.racks.length) return;
  const rack = shelf.racks[rackIndex]!;

  const slot = rack.boxSlots.find(s => s.row === row && s.column === column);
  if (!slot || !slot.box) return;

  if (slot.box.positions.length >= FREEZER_LAYOUT_LIMITS.maxPositionsPerBox) {
    alert(`Maximum samples per box reached (${FREEZER_LAYOUT_LIMITS.maxPositionsPerBox})`);
    return;
  }

  const specimen = sampleName?.trim()
    ? createSample(layout, sampleName.trim())
    : getUnassignedSample(layout);
  // 64 + 1 = 65 = 'A', so row 1 maps to "A", row 2 to "B", and so on.
  const positionLabel = String.fromCharCode(64 + sampleRow) + sampleCol;
  const newPosition: SamplePosition = {
    id: generateId('pos'),
    label: positionLabel,
    row: sampleRow,
    column: sampleCol,
    ...(specimen ? { sampleId: specimen.id } : {})
  };

  slot.box.positions.push(newPosition);
}

// Returns the first sample in the layout list that no box position references yet, or undefined.
function getUnassignedSample(layout: SavedLayout): Sample | undefined {
  const assignedSampleIds = new Set(
    layout.freezerData.shelves.flatMap(shelf =>
      shelf.racks.flatMap(rack =>
        rack.boxSlots.flatMap(slot =>
          slot.box?.positions.flatMap(position => position.sampleId ? [position.sampleId] : []) ?? []
        )
      )
    )
  );
  return layout.freezerData.samples?.find(sample => !assignedSampleIds.has(sample.id));
}

/**
 * Removes a sample position from the box at slot (row, column).
 * NOTE: despite its name, `sampleId` is matched against the POSITION id (position.id),
 * which is what the remove button in App.ts passes. The sample itself stays in the
 * layout-wide list (use removeSampleFromLayout to delete it).
 */
export function removeSample(layout: SavedLayout, shelfIndex: number, rackIndex: number, row: number, column: number, sampleId: string): void {
  const freezer = layout.freezerData;
  if (shelfIndex < 0 || shelfIndex >= freezer.shelves.length) return;
  const shelf = freezer.shelves[shelfIndex]!;
  if (rackIndex < 0 || rackIndex >= shelf.racks.length) return;
  const rack = shelf.racks[rackIndex]!;

  const slot = rack.boxSlots.find(s => s.row === row && s.column === column);
  if (!slot || !slot.box) return;

  const idx = slot.box.positions.findIndex(p => p.id === sampleId);
  if (idx >= 0) {
    slot.box.positions.splice(idx, 1);
  }
}

// Helper functions
// Builds the full rack grid of empty slots (1-based row/column up to the schema's limits).
function createEmptyBoxSlots() {
  const slots = [];
  for (let row = 1; row <= FREEZER_LAYOUT_LIMITS.rackRows; row++) {
    for (let col = 1; col <= FREEZER_LAYOUT_LIMITS.rackColumns; col++) {
      slots.push({ row, column: col, box: null });
    }
  }
  return slots;
}

// New boxes start with no sample positions; positions are added one at a time via addSample().
function createEmptySamplePositions() {
  return [];
}
