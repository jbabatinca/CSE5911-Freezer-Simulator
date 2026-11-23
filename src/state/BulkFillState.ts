export type BulkFillTab = 'rack' | 'box';

interface BulkFillState {
  open: boolean;
  tab: BulkFillTab;
  shelfIndex: number;
  rackIndex: number;
  boxId: string | null;
  cells: Record<string, string>; // key "row-column" -> typed name
}

const state: BulkFillState = { open: false, tab: 'rack', shelfIndex: 0, rackIndex: 0, boxId: null, cells: {} };

export function getBulkFill(): Readonly<BulkFillState> { return state; }
export function setBulkFill(patch: Partial<BulkFillState>): void { Object.assign(state, patch); }
export function setBulkFillCell(row: number, column: number, name: string): void { state.cells[`${row}-${column}`] = name; }
export function clearBulkFillCells(): void { state.cells = {}; }
