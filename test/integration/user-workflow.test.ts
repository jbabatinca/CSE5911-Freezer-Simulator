import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { SavedLayout } from '../../src/models/SavedLayout.js';
import { createNewEmptyLayout } from '../../src/state/layoutState.js';
import { saveLayout, getLayout, getAllLayouts } from '../../src/services/StorageService.js';
import { addShelf, addRack, addBox, addSample, createSample } from '../../src/services/FreezerService.js';

describe('User Workflow Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Complete Demo Workflow', () => {
    it('should load a freezer layout', () => {
      const layout = createNewEmptyLayout();
      expect(layout).toBeDefined();
      expect(layout.freezerData).toHaveProperty('shelves');
      expect(layout.freezerData).toHaveProperty('samples');
    });

    it('should navigate from freezer -> shelf -> rack -> box -> position', () => {
      const layout = createNewEmptyLayout();

      // Step 1: Add shelf to freezer
      addShelf(layout);
      expect(layout.freezerData.shelves).toHaveLength(1);
      const shelf = layout.freezerData.shelves[0]!;

      // Step 2: Add rack to shelf
      addRack(layout, shelf.id);
      expect(shelf.racks).toHaveLength(1);
      const rack = shelf.racks[0]!;

      // Step 3: Add box to rack
      addBox(layout, 0, 0, 1, 1);
      const box = rack.boxSlots[0]?.box;
      expect(box).toBeDefined();

      // Step 4: Add sample position to box
      addSample(layout, 0, 0, 1, 1, 1, 1);
      expect(box?.positions).toHaveLength(1);
      expect(box?.positions[0]?.label).toBe('A1');
    });

    it('should create and locate a sample in the hierarchy', () => {
      const layout = createNewEmptyLayout();

      // Create a sample
      const sample = createSample(layout, 'Test Sample', 'Contains important data');
      expect(layout.freezerData.samples).toHaveLength(1);
      expect(sample.name).toBe('Test Sample');

      // Build the freezer hierarchy
      addShelf(layout);
      addRack(layout, layout.freezerData.shelves[0]!.id);
      addBox(layout, 0, 0, 1, 1);
      addSample(layout, 0, 0, 1, 1, 5, 5);

      // Verify the navigation path works
      const shelf = layout.freezerData.shelves[0];
      const rack = shelf?.racks[0];
      const box = rack?.boxSlots[0]?.box;
      const position = box?.positions[0];

      expect(position).toBeDefined();
      expect(position?.label).toBe('E5');
    });

    it('should save and retrieve a complete layout', () => {
      const layout = createNewEmptyLayout();

      // Build layout
      addShelf(layout);
      addRack(layout, layout.freezerData.shelves[0]!.id);
      addBox(layout, 0, 0, 1, 1);
      createSample(layout, 'Sample 1');
      addSample(layout, 0, 0, 1, 1, 1, 1);

      // Save to storage
      saveLayout(layout);
      expect(getAllLayouts()).toHaveLength(1);

      // Retrieve and verify
      const retrieved = getLayout(layout.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.freezerData.shelves).toHaveLength(1);
      expect(retrieved?.freezerData.samples).toHaveLength(1);
      expect(retrieved?.freezerData.shelves[0]?.racks).toHaveLength(1);
    });
  });

  describe('Multiple User Scenarios', () => {
    it('should handle multiple layouts independently', async () => {
      const layout1 = createNewEmptyLayout();
      layout1.name = 'Lab Freezer A';
      addShelf(layout1);

      await new Promise(resolve => setTimeout(resolve, 10));

      const layout2 = createNewEmptyLayout();
      layout2.name = 'Lab Freezer B';
      addShelf(layout2);
      addShelf(layout2);

      saveLayout(layout1);
      saveLayout(layout2);

      expect(getAllLayouts()).toHaveLength(2);

      const retrieved1 = getLayout(layout1.id);
      const retrieved2 = getLayout(layout2.id);

      expect(retrieved1?.freezerData.shelves).toHaveLength(1);
      expect(retrieved2?.freezerData.shelves).toHaveLength(2);
    });

    it('should build a full 4-shelf, 6-rack freezer with samples', () => {
      const layout = createNewEmptyLayout();

      // Build full 4-shelf structure
      for (let s = 0; s < 4; s++) {
        addShelf(layout);
      }
      expect(layout.freezerData.shelves).toHaveLength(4);

      // Add racks to first shelf
      const shelfId = layout.freezerData.shelves[0]!.id;
      for (let r = 0; r < 6; r++) {
        addRack(layout, shelfId);
      }
      expect(layout.freezerData.shelves[0]?.racks).toHaveLength(6);

      // Add boxes to first rack
      for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 4; col++) {
          addBox(layout, 0, 0, row, col);
        }
      }
      expect(layout.freezerData.shelves[0]?.racks[0]?.boxSlots.filter(s => s.box !== null)).toHaveLength(16);

      // Create samples
      for (let i = 0; i < 5; i++) {
        createSample(layout, `Sample ${i + 1}`);
      }
      expect(layout.freezerData.samples).toHaveLength(5);

      // Save and verify
      saveLayout(layout);
      const retrieved = getLayout(layout.id);
      expect(retrieved?.freezerData.shelves).toHaveLength(4);
      expect(retrieved?.freezerData.shelves[0]?.racks).toHaveLength(6);
      expect(retrieved?.freezerData.samples).toHaveLength(5);
    });
  });

  describe('Data Persistence & Integrity', () => {
    it('should maintain data integrity through save-load cycle', () => {
      const layout = createNewEmptyLayout();
      const originalId = layout.id;
      const originalCreatedAt = layout.createdAt;

      addShelf(layout);
      addRack(layout, layout.freezerData.shelves[0]!.id);
      addBox(layout, 0, 0, 1, 1);
      const sample = createSample(layout, 'Important Sample');
      const sampleId = sample.id;

      saveLayout(layout);
      const retrieved = getLayout(originalId);

      expect(retrieved?.id).toBe(originalId);
      expect(retrieved?.createdAt).toBe(originalCreatedAt);
      expect(retrieved?.freezerData.shelves[0]?.racks[0]?.boxSlots[0]?.box).not.toBeNull();
      expect(retrieved?.freezerData.samples[0]?.id).toBe(sampleId);
    });

    it('should handle concurrent operations on same layout', () => {
      const layout = createNewEmptyLayout();

      addShelf(layout);
      addShelf(layout);
      addRack(layout, layout.freezerData.shelves[0]!.id);
      addRack(layout, layout.freezerData.shelves[1]!.id);

      expect(layout.freezerData.shelves).toHaveLength(2);
      expect(layout.freezerData.shelves[0]?.racks).toHaveLength(1);
      expect(layout.freezerData.shelves[1]?.racks).toHaveLength(1);

      saveLayout(layout);
      const retrieved = getLayout(layout.id);

      expect(retrieved?.freezerData.shelves).toHaveLength(2);
      expect(retrieved?.freezerData.shelves[0]?.racks).toHaveLength(1);
      expect(retrieved?.freezerData.shelves[1]?.racks).toHaveLength(1);
    });
  });
});
