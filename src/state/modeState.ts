/**
 * modeState.ts - tracks which screen is showing and which modals are open.
 * State is held in memory only (resets on page reload); callers must call
 * render() in App.ts after changing it.
 */

/** Screens the app can show; App.ts renders a view based on the current Mode. */
export type Mode = 'home' | 'admin-home' | 'user-home' | 'configuration' | 'training' | 'freezer-layouts' | 'question-set-user' | 'progress-history';

let currentMode: Mode = 'home';
let previousMode: Mode = 'home';
let showAdminPasswordModal = false;
let showAdminSettingsModal = false;

/** Returns the screen currently shown. */
export function getCurrentMode(): Mode {
  return currentMode;
}

/** Navigates to `mode`, remembering the old one so goBack() can return to it. */
export function setMode(mode: Mode): void {
  previousMode = currentMode;
  currentMode = mode;
}

/** Resets navigation to `startMode` (default 'home') and resets the back target to 'home'. */
export function initializeMode(startMode: Mode = 'home'): void {
  currentMode = startMode;
  previousMode = 'home';
}

/** Returns the mode that was active before the current one. */
export function getPreviousMode(): Mode {
  return previousMode;
}

/** Swaps current and previous mode. Only one step is remembered, so calling it twice toggles between two screens. */
export function goBack(): void {
  const temp = currentMode;
  currentMode = previousMode;
  previousMode = temp;
}

/** Returns whether the admin login modal should be displayed. */
export function getShowAdminPasswordModal(): boolean {
  return showAdminPasswordModal;
}

/** Shows or hides the admin login modal (takes effect on the next render). */
export function setShowAdminPasswordModal(show: boolean): void {
  showAdminPasswordModal = show;
}

/** Returns whether the admin settings (change password) modal should be displayed. */
export function getShowAdminSettingsModal(): boolean {
  return showAdminSettingsModal;
}

/** Shows or hides the admin settings modal (takes effect on the next render; App.ts only shows it to admins). */
export function setShowAdminSettingsModal(show: boolean): void {
  showAdminSettingsModal = show;
}

