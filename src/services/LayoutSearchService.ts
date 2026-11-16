import type { SavedLayout } from '../models/SavedLayout.js';

export type LayoutSearchType = 'layout' | 'shelf' | 'rack' | 'box' | 'sample' | 'position';

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

/** Search names throughout each layout and physical coordinates for stored positions. */
export function searchLayouts(layouts: readonly SavedLayout[], query: string): LayoutSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];
  const matches = (name: string) => name.toLocaleLowerCase().includes(normalizedQuery);
  const results: LayoutSearchResult[] = [];

  for (const layout of layouts) {
    type Location = Pick<LayoutSearchResult, 'layoutId' | 'shelfId' | 'rackId' | 'boxId' | 'positionId'>;
    const root: Location = { layoutId: layout.id, shelfId: null, rackId: null, boxId: null, positionId: null };
    const add = (type: LayoutSearchType, id: string, name: string, path: string, location: Location) => {
      results.push({ ...location, key: JSON.stringify([layout.id, type, id]), type, name, path });
    };
    if (matches(layout.name) || matches(layout.freezerData.name)) {
      add('layout', layout.id, layout.name, layout.name, root);
    }
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
