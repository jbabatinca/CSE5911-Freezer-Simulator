/**
 * BulkFillService.ts - turns a filled-in template grid into boxes (for a rack)
 * or samples (for a box). Planning is separate from applying so the UI can show
 * conflicts before anything changes.
 */
import { addBox, renameBox, removeBox, assignSampleToPosition, removeSampleFromPosition } from './FreezerService.js';
import type { FreezerBox } from '../models/freezerLayout.js';
// Use the same SavedLayout import that FreezerService.ts uses:
import type { SavedLayout } from '../models/SavedLayout.js';


export interface FillCell { row: number; column: number; name: string; }
export interface FillPlan { add: FillCell[]; update: FillCell[]; remove: FillCell[]; duplicates: string[]; }

/** "row-column" -> trimmed name; missing or blank means "should be empty". */
function typedNames(cells: FillCell[]): Map<string, string> {
  return new Map(cells.map(c => [`${c.row}-${c.column}`, c.name.trim()]));
}

/** Row letter + column number, the same labels the position grid shows (A1..I9). */
export function positionLabel(row: number, column: number): string {
  return String.fromCharCode(64 + row) + column;
}

/** Keeps only cells that have a name, trimmed. */
function filled(cells: FillCell[]): FillCell[] {
  return cells.map(c => ({ ...c, name: c.name.trim() })).filter(c => c.name !== '');
}

/** Names typed twice in the form, or already used elsewhere in `existing`. */
function findDuplicates(cells: FillCell[], existing: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  const taken = new Set(existing);
  for (const c of cells) {
    if (seen.has(c.name) || taken.has(c.name)) dupes.add(c.name);
    seen.add(c.name);
  }
  return [...dupes];
}

// ---------- Rack -> boxes ----------
export function planRackFill(layout: SavedLayout, shelfIndex: number, rackIndex: number, cells: FillCell[]): FillPlan {
  const rack = layout.freezerData.shelves[shelfIndex]?.racks[rackIndex];
  const plan: FillPlan = { add: [], update: [], remove: [], duplicates: [] };
  if (!rack) return plan;
  const typed = typedNames(cells);
  for (const slot of rack.boxSlots) {
    const name = typed.get(`${slot.row}-${slot.column}`) ?? '';
    const cell = { row: slot.row, column: slot.column, name };
    if (!slot.box) { if (name) plan.add.push(cell); }
    else if (!name) plan.remove.push({ ...cell, name: slot.box.name });
    else if (slot.box.name !== name) plan.update.push(cell);
  }
  const otherBoxNames = layout.freezerData.shelves.flatMap(s => s.racks).filter(r => r !== rack)
    .flatMap(r => r.boxSlots).map(s => s.box?.name).filter((n): n is string => !!n);
  plan.duplicates = findDuplicates(filled(cells), otherBoxNames);
  return plan;
}

/** Makes the rack match the grid: removes cleared boxes, adds new ones, renames changed ones (samples kept). */
export function applyRackFill(layout: SavedLayout, shelfIndex: number, rackIndex: number, plan: FillPlan): void {
  const rack = layout.freezerData.shelves[shelfIndex]?.racks[rackIndex];
  if (!rack) return;
  for (const c of plan.remove) removeBox(layout, shelfIndex, rackIndex, c.row, c.column);
  for (const c of plan.add) addBox(layout, shelfIndex, rackIndex, c.row, c.column, c.name);
  for (const c of plan.update) {
    const box = rack.boxSlots.find(s => s.row === c.row && s.column === c.column)?.box;
    if (box) renameBox(layout, box.id, c.name);
  }
}

// ---------- Box -> samples ----------
function findBox(layout: SavedLayout, boxId: string): FreezerBox | undefined {
  return layout.freezerData.shelves.flatMap(s => s.racks).flatMap(r => r.boxSlots)
    .find(s => s.box?.id === boxId)?.box ?? undefined;
}

export function planBoxFill(layout: SavedLayout, boxId: string, cells: FillCell[]): FillPlan {
  const box = findBox(layout, boxId);
  const plan: FillPlan = { add: [], update: [], remove: [], duplicates: [] };
  if (!box) return plan;
  const names = new Map((layout.freezerData.samples ?? []).map(s => [s.id, s.name]));
  const typed = typedNames(cells);
  for (const pos of box.positions) {
    const name = typed.get(`${pos.row}-${pos.column}`) ?? '';
    const current = pos.sampleId ? names.get(pos.sampleId) ?? '' : '';
    const cell = { row: pos.row, column: pos.column, name };
    if (!pos.sampleId) { if (name) plan.add.push(cell); }
    else if (!name) plan.remove.push({ ...cell, name: current });
    else if (current !== name) plan.update.push(cell);
  }
  const otherSampleNames = (layout.freezerData.samples ?? [])
    .filter(s => !box.positions.some(p => p.sampleId === s.id)).map(s => s.name);
  plan.duplicates = findDuplicates(filled(cells), otherSampleNames);
  return plan;
}

/** Makes the box match the grid: empties cleared positions, fills new ones, replaces changed ones. */
export function applyBoxFill(layout: SavedLayout, boxId: string, plan: FillPlan): void {
  const box = findBox(layout, boxId);
  if (!box) return;
  const at = (c: FillCell) => box.positions.find(p => p.row === c.row && p.column === c.column);
  for (const c of plan.remove) { const pos = at(c); if (pos) removeSampleFromPosition(layout, pos.id); }
  for (const c of [...plan.add, ...plan.update]) {
    const pos = at(c);
    if (!pos) continue;
    if (pos.sampleId) removeSampleFromPosition(layout, pos.id);
    assignSampleToPosition(layout, pos.id, c.name);
  }
}

/** Optional helper: one name per line -> cells, across rows ('row') or down columns ('column'). */
export function listToCells(text: string, rows: number, columns: number, order: 'row' | 'column'): FillCell[] {
  const names = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
  return names.slice(0, rows * columns).map((name, i) => order === 'row'
    ? { row: Math.floor(i / columns) + 1, column: (i % columns) + 1, name }
    : { row: (i % rows) + 1, column: Math.floor(i / rows) + 1, name });
}
