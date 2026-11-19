/** StorageService.ts - reads and writes saved freezer layouts in browser localStorage. */
import type { SavedLayout } from '../models/SavedLayout.js';
import { fillMissingPositions } from './FreezerService.js';

// The 'freezer-layouts' key holds a JSON array; parsing and storage errors propagate to callers.
/**
 * Takes no arguments and returns all saved layouts, or an empty array when the storage key is absent.
 * Also fills in any missing box positions (see fillMissingPositions), so layouts saved before every
 * box had 81 positions still work. The fill is in memory until the layout is saved again.
 */
export function getAllLayouts(): SavedLayout[] {
  const stored = localStorage.getItem('freezer-layouts');
  const result: SavedLayout[] = stored ? JSON.parse(stored) : [];
  result.forEach(fillMissingPositions);
  return result;
}

/** Looks up the supplied layout id and returns the saved layout, or null if it is missing. */
export function getLayout(id: string): SavedLayout | null {
    const layouts = getAllLayouts();
    return layouts.find(l => l.id === id) || null;
}

/** Stores the supplied layout, replacing any entry with the same id; returns nothing. */
export function saveLayout(layout: SavedLayout): void {
    const layouts = getAllLayouts();
    const existing = layouts.findIndex(l => l.id === layout.id);

    if (existing >= 0) {
        layouts[existing] = layout;
    } else {
        layouts.push(layout);
    }

    localStorage.setItem('freezer-layouts', JSON.stringify(layouts));
}

/** Removes the layout matching the supplied id from storage; returns nothing, even if no entry matches. */
export function deleteLayout(id: string): void {
    const layouts = getAllLayouts();
    const filtered = layouts.filter(l => l.id !== id);
    localStorage.setItem('freezer-layouts', JSON.stringify(filtered));
}

/** Takes no arguments and returns a 'layout-' id based on the current millisecond timestamp. */
export function generateLayoutId(): string {
    // Calls in the same millisecond can produce the same id; this is not a UUID generator.
    return 'layout-' + Date.now();
}
