/**
 * configurationState.ts - holds whether the new-layout modal is open.
 * This in-memory UI state resets when the app page is reloaded.
 */
let showNewLayoutModal = false;

/** Takes no arguments; returns whether the new-layout modal is currently open. */
export function isNewLayoutModalOpen(): boolean {
  return showNewLayoutModal;
}

/** Marks the new-layout modal open; returns nothing. */
export function openNewLayoutModal(): void {
  showNewLayoutModal = true;
}

/** Marks the new-layout modal closed; returns nothing. */
export function closeNewLayoutModal(): void {
  showNewLayoutModal = false;
}
