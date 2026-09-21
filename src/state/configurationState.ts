let showNewLayoutModal = false;

export function isNewLayoutModalOpen(): boolean {
  return showNewLayoutModal;
}

export function openNewLayoutModal(): void {
  showNewLayoutModal = true;
}

export function closeNewLayoutModal(): void {
  showNewLayoutModal = false;
}
