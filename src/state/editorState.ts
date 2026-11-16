/**
 * editorState.ts - stores the currently expanded shelf, rack, and box in the editor.
 * Only one id per level is retained; changing a parent clears its descendants.
 */
let expandedShelfId: string | null = null;
let expandedRackId: string | null = null;
let expandedBoxId: string | null = null;

/** Takes no arguments; returns the expanded shelf id, or null if none is expanded. */
export function getExpandedShelfId(): string | null {
  return expandedShelfId;
}

/** Takes a shelf id or null, sets it as expanded, and resets the rack and box; returns nothing. */
export function setExpandedShelfId(shelfId: string | null): void {
  expandedShelfId = shelfId;
  // When changing shelves, reset rack and box
  expandedRackId = null;
  expandedBoxId = null;
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
