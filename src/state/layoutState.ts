import type { SavedLayout } from '../models/SavedLayout.js';
import { generateLayoutId } from '../services/StorageService.js';
import { FREEZER_LAYOUT_SCHEMA_VERSION } from '../models/freezerLayout.js';

let currentEditingLayout: SavedLayout | null = null;

export function getCurrentEditingLayout(): SavedLayout | null {
    return currentEditingLayout;
}

export function setCurrentEditingLayout(layout: SavedLayout | null): void {
    currentEditingLayout = layout;
}

// Create a new empty layout
export function createNewEmptyLayout(): SavedLayout {
    const id = generateLayoutId();
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}
