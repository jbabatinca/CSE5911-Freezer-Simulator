let expandedShelfId: string | null = null;
let expandedRackId: string | null = null;
let expandedBoxId: string | null = null;

// Get which shelf is expanded
export function getExpandedShelfId(): string | null {
  return expandedShelfId;
}

// Set which shelf is expanded
export function setExpandedShelfId(shelfId: string | null): void {
  expandedShelfId = shelfId;
  // When changing shelves, reset rack and box
  expandedRackId = null;
  expandedBoxId = null;
}

// Get which rack is expanded
export function getExpandedRackId(): string | null {
  return expandedRackId;
}

// Set which rack is expanded
export function setExpandedRackId(rackId: string | null): void {
  expandedRackId = rackId;
  // When changing racks, reset box
  expandedBoxId = null;
}

// Get which box is expanded
export function getExpandedBoxId(): string | null {
  return expandedBoxId;
}

// Set which box is expanded
export function setExpandedBoxId(boxId: string | null): void {
  expandedBoxId = boxId;
}
