import { describe, it, expect, beforeEach } from 'vitest';
import type { SavedLayout } from '../../src/models/SavedLayout.js';
import {
  getCurrentEditingLayout,
  setCurrentEditingLayout,
  createNewEmptyLayout
} from '../../src/state/layoutState.js';

describe('Layout State Management', () => {
  beforeEach(() => {
    setCurrentEditingLayout(null);
  });

  describe('Current Editing Layout', () => {
    it('should return null when no layout is being edited', () => {
      const layout = getCurrentEditingLayout();
      expect(layout).toBeNull();
    });

    it('should set and retrieve the current editing layout', () => {
      const testLayout: SavedLayout = {
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

      setCurrentEditingLayout(testLayout);
      const retrieved = getCurrentEditingLayout();
      expect(retrieved).toEqual(testLayout);
      expect(retrieved?.id).toBe('layout-1');
    });

    it('should update the current editing layout', () => {
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

      setCurrentEditingLayout(layout1);
      expect(getCurrentEditingLayout()?.id).toBe('layout-1');

      setCurrentEditingLayout(layout2);
      expect(getCurrentEditingLayout()?.id).toBe('layout-2');
    });

    it('should clear the current editing layout', () => {
      const testLayout: SavedLayout = {
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

      setCurrentEditingLayout(testLayout);
      expect(getCurrentEditingLayout()).not.toBeNull();
      setCurrentEditingLayout(null);
      expect(getCurrentEditingLayout()).toBeNull();
    });
  });

  describe('Create New Empty Layout', () => {
    it('should create a new empty layout with valid structure', () => {
      const newLayout = createNewEmptyLayout();
      expect(newLayout).toHaveProperty('id');
      expect(newLayout).toHaveProperty('name');
      expect(newLayout).toHaveProperty('freezerData');
      expect(newLayout).toHaveProperty('createdAt');
      expect(newLayout).toHaveProperty('updatedAt');
    });

    it('should create layout with correct defaults', () => {
      const newLayout = createNewEmptyLayout();
      expect(newLayout.name).toBe('Unnamed Layout');
      expect(newLayout.freezerData.name).toBe('Unnamed Freezer');
      expect(newLayout.freezerData.schemaVersion).toBe('1.0');
      expect(newLayout.freezerData.shelves).toHaveLength(0);
      expect(newLayout.freezerData.samples).toHaveLength(0);
    });

    it('should generate unique IDs for new layouts', async () => {
      const layout1 = createNewEmptyLayout();
      await new Promise(resolve => setTimeout(resolve, 10));
      const layout2 = createNewEmptyLayout();
      expect(layout1.id).not.toBe(layout2.id);
      expect(layout1.freezerData.id).toBe(layout1.id);
      expect(layout2.freezerData.id).toBe(layout2.id);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const now = new Date();
      const newLayout = createNewEmptyLayout();
      const createdAt = new Date(newLayout.createdAt);
      const updatedAt = new Date(newLayout.updatedAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(now.getTime() - 2000);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(now.getTime() - 2000);
      expect(newLayout.createdAt).toBe(newLayout.updatedAt);
    });

    it('should create layout with no shelves or samples initially', () => {
      const newLayout = createNewEmptyLayout();
      expect(newLayout.freezerData.shelves).toEqual([]);
      expect(newLayout.freezerData.samples).toEqual([]);
    });
  });

  describe('Layout State Integration', () => {
    it('should manage multiple layouts in state', () => {
      const layout1 = createNewEmptyLayout();
      const layout2 = createNewEmptyLayout();

      setCurrentEditingLayout(layout1);
      expect(getCurrentEditingLayout()?.id).toBe(layout1.id);

      setCurrentEditingLayout(layout2);
      expect(getCurrentEditingLayout()?.id).toBe(layout2.id);

      setCurrentEditingLayout(null);
      expect(getCurrentEditingLayout()).toBeNull();
    });
  });
});
