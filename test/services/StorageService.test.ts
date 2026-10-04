import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SavedLayout } from '../../src/models/SavedLayout.js';
import {
  getAllLayouts,
  getLayout,
  saveLayout,
  deleteLayout,
  generateLayoutId
} from '../../src/services/StorageService.js';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Layout Management', () => {
    it('should save a layout to localStorage', () => {
      const layout: SavedLayout = {
        id: 'layout-1',
        name: 'Test Layout',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-1',
          name: 'Test Freezer',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      saveLayout(layout);
      const stored = localStorage.getItem('freezer-layouts');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]?.id).toBe('layout-1');
    });

    it('should retrieve all saved layouts', () => {
      const layout1: SavedLayout = {
        id: 'layout-1',
        name: 'Layout 1',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-1',
          name: 'Freezer 1',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const layout2: SavedLayout = {
        id: 'layout-2',
        name: 'Layout 2',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-2',
          name: 'Freezer 2',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      saveLayout(layout1);
      saveLayout(layout2);

      const allLayouts = getAllLayouts();
      expect(allLayouts).toHaveLength(2);
      expect(allLayouts[0]?.id).toBe('layout-1');
      expect(allLayouts[1]?.id).toBe('layout-2');
    });

    it('should get a single layout by ID', () => {
      const layout: SavedLayout = {
        id: 'layout-1',
        name: 'Test Layout',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-1',
          name: 'Test Freezer',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      saveLayout(layout);
      const retrieved = getLayout('layout-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('layout-1');
      expect(retrieved?.name).toBe('Test Layout');
    });

    it('should return null for non-existent layout ID', () => {
      const retrieved = getLayout('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should update an existing layout', () => {
      const layout: SavedLayout = {
        id: 'layout-1',
        name: 'Original Name',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-1',
          name: 'Freezer 1',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      saveLayout(layout);
      layout.name = 'Updated Name';
      saveLayout(layout);

      const allLayouts = getAllLayouts();
      expect(allLayouts).toHaveLength(1);
      expect(allLayouts[0]?.name).toBe('Updated Name');
    });

    it('should delete a layout by ID', () => {
      const layout1: SavedLayout = {
        id: 'layout-1',
        name: 'Layout 1',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-1',
          name: 'Freezer 1',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const layout2: SavedLayout = {
        id: 'layout-2',
        name: 'Layout 2',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-2',
          name: 'Freezer 2',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      saveLayout(layout1);
      saveLayout(layout2);
      expect(getAllLayouts()).toHaveLength(2);

      deleteLayout('layout-1');
      const remaining = getAllLayouts();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe('layout-2');
    });

    it('should handle empty localStorage gracefully', () => {
      const allLayouts = getAllLayouts();
      expect(allLayouts).toEqual([]);
    });
  });

  describe('ID Generation', () => {
    it('should generate unique layout IDs', async () => {
      const id1 = generateLayoutId();
      await new Promise(resolve => setTimeout(resolve, 10));
      const id2 = generateLayoutId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^layout-\d+$/);
      expect(id2).toMatch(/^layout-\d+$/);
    });
  });

  describe('Persistence', () => {
    it('should persist data across multiple operations', () => {
      const layout: SavedLayout = {
        id: 'layout-persist',
        name: 'Persistent Layout',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-persist',
          name: 'Persistent Freezer',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      saveLayout(layout);
      const retrieved1 = getLayout('layout-persist');
      expect(retrieved1).not.toBeNull();

      const allLayouts = getAllLayouts();
      expect(allLayouts).toHaveLength(1);

      const retrieved2 = getLayout('layout-persist');
      expect(retrieved2?.name).toBe('Persistent Layout');
    });
  });
});
