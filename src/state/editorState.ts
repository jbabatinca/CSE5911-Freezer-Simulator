/**
 * editorState.ts - stores the expanded shelves and the open rack and box in the editor.
 */
const expandedShelfIds = new Set<string>();
let expandedRackId: string | null = null;
let expandedBoxId: string | null = null;

export function getExpandedShelfIds(): ReadonlySet<string> {
  return expandedShelfIds;
}

/** Opens a single shelf to reveal a search result, or clears expansion when passed null. */
export function setExpandedShelfId(shelfId: string | null): void {
  expandedShelfIds.clear();
  if (shelfId !== null) expandedShelfIds.add(shelfId);
  setExpandedRackId(null);
}

export function expandShelves(shelfIds: readonly string[]): void {
  for (const shelfId of shelfIds) expandedShelfIds.add(shelfId);
}

export function collapseShelf(shelfId: string): void {
  expandedShelfIds.delete(shelfId);
}

/** Takes no arguments; returns the expanded rack id, or null if none is expanded. */
export function getExpandedRackId(): string | null {
  return expandedRackId;
}

/** Takes a rack id or null, sets it as expanded, and resets the box; returns nothing. */
export function setExpandedRackId(rackId: string | null): void {
  expandedRackId = rackId;
  // When changing racks, reset box
  expandedBoxId = null;
}

/** Takes no arguments; returns the expanded box id, or null if none is expanded. */
export function getExpandedBoxId(): string | null {
  return expandedBoxId;
}

/** Takes a box id or null, sets it as expanded, and returns nothing. */
export function setExpandedBoxId(boxId: string | null): void {
  expandedBoxId = boxId;
}
