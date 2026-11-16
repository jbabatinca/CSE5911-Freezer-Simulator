/**
 * LayoutSearchService.ts - search across saved freezer layouts.
 * Pure function (no DOM, no storage): give it the layouts and a text query and it
 * returns every matching layout, shelf, rack, box, sample, or box position,
 * each with the ids needed to jump to it. Used by render/LayoutSearchView.ts
 * and the search handlers in render/App.ts.
 */
import type { SavedLayout } from '../models/SavedLayout.js';

/** What kind of item a search result points to. */
export type LayoutSearchType = 'layout' | 'shelf' | 'rack' | 'box' | 'sample' | 'position';

/**
 * One search hit.
 * key: unique id for the result (JSON of [layoutId, type, itemId]); used to track which result is selected.
 * type/name: what was matched and its display name.
 * layoutId/shelfId/rackId/boxId/positionId: where it lives; ids below the matched level are null
 *   (e.g. a shelf result has rackId, boxId and positionId = null).
 * path: human-readable breadcrumb, e.g. "My Layout → Shelf 1 → Rack 2".
 */
export interface LayoutSearchResult {
  key: string;
  type: LayoutSearchType;
  name: string;
  layoutId: string;
  shelfId: string | null;
  rackId: string | null;
  boxId: string | null;
  positionId: string | null;
  path: string;
}

/**
 * Search names throughout each layout and physical coordinates for stored positions.
 * @param layouts the saved layouts to search (pass one layout to search just that one)
 * @param query text to find; case-insensitive "contains" match. A blank query returns [].
 * @returns matches in layout order, walking shelf -> rack -> box -> position
 *
 * Notes:
 * - Layouts match on either the saved name or the freezerData name.
 * - Positions match on their coordinate (row letter + column, e.g. "B3") or label.
 * - Samples are found through the position that holds them, so a sample that isn't
 *   assigned to any position is not searchable. A sample result reuses that position's
 *   ids so it can be highlighted in the box.
 * - Only boxes that exist are searched; empty rack slots are skipped.
 */
export function searchLayouts(layouts: readonly SavedLayout[], query: string): LayoutSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];
  const matches = (name: string) => name.toLocaleLowerCase().includes(normalizedQuery);
  const results: LayoutSearchResult[] = [];

  for (const layout of layouts) {
    // The ids that say where a result lives; each level below fills in one more id.
    type Location = Pick<LayoutSearchResult, 'layoutId' | 'shelfId' | 'rackId' | 'boxId' | 'positionId'>;
    const root: Location = { layoutId: layout.id, shelfId: null, rackId: null, boxId: null, positionId: null };
    // Records one hit; the key combines layout id, type and item id so it is unique across layouts.
    const add = (type: LayoutSearchType, id: string, name: string, path: string, location: Location) => {
      results.push({ ...location, key: JSON.stringify([layout.id, type, id]), type, name, path });
    };
    if (matches(layout.name) || matches(layout.freezerData.name)) {
      add('layout', layout.id, layout.name, layout.name, root);
    }
    // Lookup of sample id -> sample name, so positions can be matched by their sample's name.
    const names = new Map((layout.freezerData.samples ?? []).map(sample => [sample.id, sample.name]));
    for (const shelf of layout.freezerData.shelves) {
      const shelfLocation = { ...root, shelfId: shelf.id };
      const shelfPath = `${layout.name} → ${shelf.name}`;
      if (matches(shelf.name)) add('shelf', shelf.id, shelf.name, shelfPath, shelfLocation);
      for (const rack of shelf.racks) {
        const rackLocation = { ...shelfLocation, rackId: rack.id };
        const rackPath = `${shelfPath} → ${rack.name}`;
        if (matches(rack.name)) add('rack', rack.id, rack.name, rackPath, rackLocation);
        for (const slot of rack.boxSlots) {
          if (!slot.box) continue;
          const boxLocation = { ...rackLocation, boxId: slot.box.id };
          const boxPath = `${rackPath} → ${slot.box.name}`;
          if (matches(slot.box.name)) add('box', slot.box.id, slot.box.name, boxPath, boxLocation);
          for (const position of slot.box.positions) {
            const location = { ...boxLocation, positionId: position.id };
            // Row 1 -> "A", row 2 -> "B", ... so row 2, column 3 -> "B3" (same labeling as FreezerService.addSample).
            const coordinate = `${String.fromCharCode(64 + position.row)}${position.column}`;
            const path = `${boxPath} → Position ${coordinate}`;
            if (matches(coordinate) || matches(position.label)) {
              add('position', position.id, `Position ${coordinate}`, path, location);
            }
            const sampleName = position.sampleId ? names.get(position.sampleId) : undefined;
            if (sampleName !== undefined && matches(sampleName)) {
              add('sample', position.id, sampleName, path, location);
            }
          }
        }
      }
    }
  }
  return results;
}
