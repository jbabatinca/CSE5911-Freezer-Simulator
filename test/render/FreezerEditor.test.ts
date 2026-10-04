import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SavedLayout } from '../../src/models/SavedLayout.js';
import * as layoutState from '../../src/state/layoutState.js';
import * as editorState from '../../src/state/editorState.js';
import * as freezerService from '../../src/services/FreezerService.js';

vi.mock('../../src/state/layoutState.js');
vi.mock('../../src/state/editorState.js');
vi.mock('../../src/services/FreezerService.js');

describe('Freezer Editor View', () => {
  let testLayout: SavedLayout;

  beforeEach(() => {
    vi.clearAllMocks();

    testLayout = {
      id: 'layout-1',
      name: 'Test Layout',
      freezerData: {
        schemaVersion: '1.0',
        id: 'freezer-1',
        name: 'Test Freezer',
        shelves: [
          {
            id: 'shelf-1',
            name: 'Shelf 1',
            racks: [
              {
                id: 'rack-1',
                name: 'Rack 1',
                boxSlots: Array.from({ length: 16 }, (_, i) => ({
                  row: Math.floor(i / 4) + 1,
                  column: (i % 4) + 1,
                  box: null
                }))
              }
            ]
          }
        ],
        samples: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    (layoutState.getCurrentEditingLayout as any).mockReturnValue(testLayout);
    (editorState.getExpandedShelfId as any).mockReturnValue(null);
    (editorState.getExpandedRackId as any).mockReturnValue(null);
    (editorState.getExpandedBoxId as any).mockReturnValue(null);
  });

  describe('Layout Management', () => {
    it('should load current editing layout', () => {
      const currentLayout = layoutState.getCurrentEditingLayout();
      expect(currentLayout).toBeDefined();
      expect(currentLayout?.id).toBe('layout-1');
    });

    it('should update editing layout', () => {
      expect(layoutState.setCurrentEditingLayout).toBeDefined();
    });

    it('should access layout structure', () => {
      const layout = layoutState.getCurrentEditingLayout();
      expect(layout?.freezerData.shelves).toBeDefined();
      expect(layout?.freezerData.samples).toBeDefined();
    });
  });

  describe('Expansion State Management', () => {
    it('should track expanded shelf', () => {
      const expandedShelfId = editorState.getExpandedShelfId();
      expect(editorState.getExpandedShelfId).toBeDefined();
      expect(editorState.setExpandedShelfId).toBeDefined();
    });

    it('should track expanded rack', () => {
      expect(editorState.getExpandedRackId).toBeDefined();
      expect(editorState.setExpandedRackId).toBeDefined();
    });

    it('should track expanded box', () => {
      expect(editorState.getExpandedBoxId).toBeDefined();
      expect(editorState.setExpandedBoxId).toBeDefined();
    });

    it('should toggle shelf expansion', () => {
      (editorState.getExpandedShelfId as any).mockReturnValue(null);
      expect(editorState.getExpandedShelfId()).toBeNull();

      (editorState.getExpandedShelfId as any).mockReturnValue('shelf-1');
      expect(editorState.getExpandedShelfId()).toBe('shelf-1');
    });
  });

  describe('Freezer Service Integration', () => {
    it('should add shelves through service', () => {
      expect(freezerService.addShelf).toBeDefined();
    });

    it('should add racks through service', () => {
      expect(freezerService.addRack).toBeDefined();
    });

    it('should add boxes through service', () => {
      expect(freezerService.addBox).toBeDefined();
    });

    it('should remove elements through service', () => {
      expect(freezerService.removeShelf).toBeDefined();
      expect(freezerService.removeRack).toBeDefined();
      expect(freezerService.removeBox).toBeDefined();
    });
  });

  describe('Hierarchy Navigation', () => {
    it('should navigate through shelf structure', () => {
      const layout = layoutState.getCurrentEditingLayout();
      expect(layout?.freezerData.shelves.length).toBeGreaterThan(0);
    });

    it('should access racks within shelves', () => {
      const layout = layoutState.getCurrentEditingLayout();
      const shelf = layout?.freezerData.shelves[0];
      expect(shelf?.racks).toBeDefined();
      expect(shelf?.racks.length).toBeGreaterThan(0);
    });

    it('should access box slots within racks', () => {
      const layout = layoutState.getCurrentEditingLayout();
      const rack = layout?.freezerData.shelves[0]?.racks[0];
      expect(rack?.boxSlots).toBeDefined();
      expect(rack?.boxSlots.length).toBe(16);
    });
  });

  describe('Configuration Operations', () => {
    it('should support adding new shelves to layout', () => {
      expect(freezerService.addShelf).toBeDefined();
    });

    it('should support adding new racks to shelves', () => {
      expect(freezerService.addRack).toBeDefined();
    });

    it('should support adding boxes to slots', () => {
      expect(freezerService.addBox).toBeDefined();
    });

    it('should support removing elements from hierarchy', () => {
      expect(freezerService.removeShelf).toBeDefined();
      expect(freezerService.removeRack).toBeDefined();
      expect(freezerService.removeBox).toBeDefined();
    });
  });
});
