/** layoutState.ts - holds the active layout being edited and builds new, unsaved layout objects. */
import type { SavedLayout } from '../models/SavedLayout.js';
import { generateLayoutId } from '../services/StorageService.js';
import { FREEZER_LAYOUT_SCHEMA_VERSION } from '../models/freezerLayout.js';
import { setExpandedShelfId } from './editorState.js';

// Keep the object by reference for in-place editor updates; setting it does not persist it.
let currentEditingLayout: SavedLayout | null = null;

/** Takes no arguments and returns the current layout reference, or null when no layout is being edited. */
export function getCurrentEditingLayout(): SavedLayout | null {
    return currentEditingLayout;
}

/** Sets the active layout reference from the supplied layout, or clears it with null; returns nothing. */
export function setCurrentEditingLayout(layout: SavedLayout | null): void {
    if (currentEditingLayout !== layout) setExpandedShelfId(null);
    currentEditingLayout = layout;
}

/** Takes no arguments and returns an unsaved, unnamed layout with no shelves or samples and fresh ISO timestamps. */
export function createNewEmptyLayout(): SavedLayout {
    const id = generateLayoutId();
    const now = new Date().toISOString();
    return {
        id,
        name: 'Unnamed Layout',
        freezerData: {
            schemaVersion: FREEZER_LAYOUT_SCHEMA_VERSION,
            id,
            name: 'Unnamed Freezer',
            shelves: [],
            samples: [],
        },
        createdAt: now,
        updatedAt: now,
    };
}
