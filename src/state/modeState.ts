export type Mode = 'home' | 'admin-home' | 'user-home' | 'configuration' | 'training' | 'freezer-layouts';

let currentMode: Mode = 'home';
let previousMode: Mode = 'home';
let showAdminPasswordModal = false;
let showAdminSettingsModal = false;

export function getCurrentMode(): Mode {
  return currentMode;
}

export function setMode(mode: Mode): void {
  previousMode = currentMode;
  currentMode = mode;
}

export function initializeMode(startMode: Mode = 'home'): void {
  currentMode = startMode;
  previousMode = 'home';
}

export function getPreviousMode(): Mode {
  return previousMode;
}

export function goBack(): void {
  const temp = currentMode;
  currentMode = previousMode;
  previousMode = temp;
}

export function getShowAdminPasswordModal(): boolean {
  return showAdminPasswordModal;
}

export function setShowAdminPasswordModal(show: boolean): void {
  showAdminPasswordModal = show;
}

export function getShowAdminSettingsModal(): boolean {
  return showAdminSettingsModal;
}

export function setShowAdminSettingsModal(show: boolean): void {
  showAdminSettingsModal = show;
}

