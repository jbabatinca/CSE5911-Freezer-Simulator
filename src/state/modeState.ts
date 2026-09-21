export type Mode = 'home' | 'configuration' | 'training';

let currentMode: Mode = 'home';

export function getCurrentMode(): Mode {
  return currentMode;
}

export function setMode(mode: Mode): void {
  currentMode = mode;
}

export function initializeMode(startMode: Mode = 'home'): void {
  currentMode = startMode;
}

