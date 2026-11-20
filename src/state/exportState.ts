/** exportState.ts - remembers which PDF export layout the user chose last. */
import type { ExportLayout } from '../render/FreezerEditor.js';

// 'freezer-export-layout' stores a plain 'current' or 'shelf-pages' string, not JSON.
const STORAGE_KEY = 'freezer-export-layout';

/** Returns the last chosen export layout; 'current' when nothing valid is stored. */
export function getExportLayoutPreference(): ExportLayout {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'current' || saved === 'shelf-pages') return saved;
    } catch {
        // Browser storage is optional; fall back to the default.
    }
    return 'current';
}

/** Remembers the chosen export layout for the next export; returns nothing. */
export function setExportLayoutPreference(value: ExportLayout): void {
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch {
        // The choice still applies to this export even if it cannot be saved.
    }
}
