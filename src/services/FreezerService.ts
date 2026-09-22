import type { FreezerShelf, FreezerRack, FreezerBox, BoxPosition, Sample } from '../models/freezerLayout.js';
import type { SavedLayout } from '../models/SavedLayout.js';
import { FREEZER_LAYOUT_LIMITS } from '../models/freezerLayout.js';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// SHELF operations
export function addShelf(layout: SavedLayout): void {
  const freezer = layout.freezerData;
  if (freezer.shelves.length >= FREEZER_LAYOUT_LIMITS.maxShelvesPerFreezer) {
    alert('Maximum shelves reached (4)');
    return;
  }

  const newShelf: FreezerShelf = {
    id: generateId('shelf'),
    name: `Shelf ${freezer.shelves.length + 1}`,
    racks: []
  };

  freezer.shelves.push(newShelf);
}

export function removeShelf(layout: SavedLayout, shelfIndex: number): void {
  const freezer = layout.freezerData;
  if (shelfIndex < 0 || shelfIndex >= freezer.shelves.length) return;
  freezer.shelves.splice(shelfIndex, 1);
}

// RACK operations
export function addRack(layout: SavedLayout, shelfId: string): void {
  const freezer = layout.freezerData;
  const shelf = freezer.shelves.find(s => s.id === shelfId);
  if (!shelf) return;

  if (shelf.racks.length >= FREEZER_LAYOUT_LIMITS.maxRacksPerShelf) {
    alert('Maximum racks per shelf reached (6)');
    return;
  }

  const newRack: FreezerRack = {
    id: generateId('rack'),
    name: `Rack ${shelf.racks.length + 1}`,
    boxSlots: createEmptyBoxSlots()
  };

  shelf.racks.push(newRack);
}

export function removeRack(layout: SavedLayout, shelfIndex: number, rackIndex: number): void {
  const freezer = layout.freezerData;
  if (shelfIndex < 0 || shelfIndex >= freezer.shelves.length) return;
  const shelf = freezer.shelves[shelfIndex]!;
  if (rackIndex < 0 || rackIndex >= shelf.racks.length) return;
  shelf.racks.splice(rackIndex, 1);
}

// BOX operations
export function addBox(layout: SavedLayout, shelfIndex: number, rackIndex: number, row: number, column: number): void {
  const freezer = layout.freezerData;
  if (shelfIndex < 0 || shelfIndex >= freezer.shelves.length) return;
  const shelf = freezer.shelves[shelfIndex]!;
  if (rackIndex < 0 || rackIndex >= shelf.racks.length) return;
  const rack = shelf.racks[rackIndex]!;

  const slot = rack.boxSlots.find(s => s.row === row && s.column === column);
  if (!slot || slot.box) return;

  const newBox: FreezerBox = {
    id: generateId('box'),
    name: `Box ${row}-${column}`,
    rows: 9,
    columns: 9,
    positions: createEmptySamplePositions()
  };

  slot.box = newBox;
}

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
export function createSample(layout: SavedLayout, name: string, description?: string): Sample {
  const newSample: Sample = {
    id: generateId('sample'),
    name,
    ...(description !== undefined ? { description } : {})
  };
  layout.freezerData.samples.push(newSample);
  return newSample;
}

export function removeSampleFromLayout(layout: SavedLayout, sampleId: string): void {
  const freezer = layout.freezerData;
  const idx = freezer.samples.findIndex(s => s.id === sampleId);
  if (idx >= 0) {
    freezer.samples.splice(idx, 1);
  }
}

// BOX POSITION SAMPLES operations (assign samples to box positions)
export function addSample(layout: SavedLayout, shelfIndex: number, rackIndex: number, row: number, column: number, sampleRow: number, sampleCol: number): void {
  const freezer = layout.freezerData;
  if (shelfIndex < 0 || shelfIndex >= freezer.shelves.length) return;
  const shelf = freezer.shelves[shelfIndex]!;
  if (rackIndex < 0 || rackIndex >= shelf.racks.length) return;
  const rack = shelf.racks[rackIndex]!;

  const slot = rack.boxSlots.find(s => s.row === row && s.column === column);
  if (!slot || !slot.box) return;

  if (slot.box.positions.length >= FREEZER_LAYOUT_LIMITS.maxPositionsPerBox) {
    alert('Maximum samples per box reached (81)');
    return;
  }

  const positionLabel = String.fromCharCode(64 + sampleRow) + sampleCol;
  const newPosition: BoxPosition = {
    id: generateId('pos'),
    label: positionLabel,
    row: sampleRow,
    column: sampleCol
  };

  slot.box.positions.push(newPosition);
}

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
function createEmptyBoxSlots() {
  const slots = [];
  for (let row = 1; row <= 4; row++) {
    for (let col = 1; col <= 4; col++) {
      slots.push({ row, column: col, box: null });
    }
  }
  return slots;
}

function createEmptySamplePositions() {
  return [];
}
