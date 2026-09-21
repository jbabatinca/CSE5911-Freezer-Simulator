import type { SavedLayout } from '../models/SavedLayout.js';

// Get all saved layouts
export function getAllLayouts(): SavedLayout[] {
  const stored = localStorage.getItem('freezer-layouts');
  console.log('Raw stored value:', stored);  // Should be here
  const result = stored ? JSON.parse(stored) : [];
  console.log('Parsed result:', result);  // Should be here
  return result;
}


// Get a single layout by ID
export function getLayout(id: string): SavedLayout | null {
    const layouts = getAllLayouts();
    return layouts.find(l => l.id === id) || null;
}

// Save or update a layout
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

// Delete a layout
export function deleteLayout(id: string): void {
    const layouts = getAllLayouts();
    const filtered = layouts.filter(l => l.id !== id);
    localStorage.setItem('freezer-layouts', JSON.stringify(filtered));
}

// Generate a unique ID for a new layout
export function generateLayoutId(): string {
    return 'layout-' + Date.now();
}
