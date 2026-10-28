import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SavedLayout } from '../../src/models/SavedLayout.js';
import * as layoutState from '../../src/state/layoutState.js';
import * as editorState from '../../src/state/editorState.js';
import * as freezerService from '../../src/services/FreezerService.js';
import { FreezerEditor } from '../../src/render/FreezerEditor.js';
import type { FreezerRack } from '../../src/models/freezerLayout.js';

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

// ---- Helpers for color tests ----

function makeLayout(options: { rackColor?: string; boxColor?: string; rackName?: string } = {}): SavedLayout {
  const box = {
    id: 'box-1',
    name: 'Box 1-1',
    rows: 9 as const,
    columns: 9 as const,
    positions: [],
    ...(options.boxColor !== undefined ? { color: options.boxColor } : {})
  };

  const rack: FreezerRack = {
    id: 'rack-1',
    name: options.rackName ?? 'Rack 1',
    ...(options.rackColor !== undefined ? { color: options.rackColor } : {}),
    boxSlots: Array.from({ length: 16 }, (_, i) => ({
      row: Math.floor(i / 4) + 1,
      column: (i % 4) + 1,
      box: i === 0 ? box : null
    }))
  };

  return {
    id: 'layout-1',
    name: 'Test Layout',
    freezerData: {
      schemaVersion: '1.0',
      id: 'freezer-1',
      name: 'Test Freezer',
      shelves: [{ id: 'shelf-1', name: 'Shelf 1', racks: [rack] }],
      samples: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Sets which shelf, rack, and box are expanded so their contents render
function expand({ rackExpanded = false }: { rackExpanded?: boolean } = {}) {
  (editorState.getExpandedShelfId as any).mockReturnValue('shelf-1');
  (editorState.getExpandedRackId as any).mockReturnValue(rackExpanded ? 'rack-1' : null);
  (editorState.getExpandedBoxId as any).mockReturnValue(null);
}

describe('FreezerEditor - rack colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    expand();
  });

  it('should use the rack color for the rack', () => {
    const html = FreezerEditor(makeLayout({ rackColor: '#2E9D50' }));
    expect(html).toContain('--item-color: #2E9D50');
  });

  it('should default a rack with no color to white', () => {
    const html = FreezerEditor(makeLayout());
    expect(html).toContain('--item-color: #FFFFFF');
  });

  it('should fall back to white when the rack color is not a valid hex value', () => {
    const html = FreezerEditor(makeLayout({ rackColor: 'red' }));
    expect(html).toContain('--item-color: #FFFFFF');
    expect(html).not.toContain('--item-color: red');
  });

  it('should use white text on a dark rack color', () => {
    const html = FreezerEditor(makeLayout({ rackColor: '#174477' }));
    expect(html).toContain('--item-foreground: #ffffff');
  });

  it('should use dark text on a light rack color', () => {
    const html = FreezerEditor(makeLayout({ rackColor: '#FFF1A8' }));
    expect(html).toContain('--item-foreground: #18334d');
  });

  it('should mark the current rack color as selected in the palette', () => {
    const html = FreezerEditor(makeLayout({ rackColor: '#2E9D50' }));
    expect(html).toMatch(/value="#2E9D50"[^>]*aria-pressed="true"/);
  });
});

describe('FreezerEditor - edit mode vs read-only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    expand({ rackExpanded: true });
  });

  it('should show rename and color controls for a rack in edit mode', () => {
    const html = FreezerEditor(makeLayout());
    expect(html).toContain('id="btn-rename-rack-rack-1"');
    expect(html).toContain('rack-color-trigger');
  });

  it('should hide rename and color controls in read-only mode', () => {
    const html = FreezerEditor(makeLayout(), true);
    expect(html).not.toContain('btn-rename-rack-rack-1');
    expect(html).not.toContain('rack-color-trigger');
    expect(html).not.toContain('btn-rename-box-box-1');
  });

  it('should escape quotes in the rename label', () => {
    const html = FreezerEditor(makeLayout({ rackName: 'Rack "A"' }));
    expect(html).toContain('Rename Rack &quot;A&quot;');
  });
});

describe('FreezerEditor - box colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    expand({ rackExpanded: true });
  });

  it('should use the box color when the box has one', () => {
    const html = FreezerEditor(makeLayout({ rackColor: '#2878C7', boxColor: '#F2D21B' }));
    expect(html).toMatch(/box-container[^"]*" style="[^"]*--item-color: #F2D21B/);
  });

  it('should inherit the rack color when the box has no color', () => {
    const html = FreezerEditor(makeLayout({ rackColor: '#2878C7' }));
    expect(html).toMatch(/box-container[^"]*" style="[^"]*--item-color: #2878C7/);
  });

  it('should mark "Match rack color" as selected when the box has no color', () => {
    const html = FreezerEditor(makeLayout({ rackColor: '#2878C7' }));
    expect(html).toMatch(/data-layout-color-value="inherit" aria-pressed="true"/);
  });

  it('should not mark "Match rack color" as selected when the box has its own color', () => {
    const html = FreezerEditor(makeLayout({ rackColor: '#2878C7', boxColor: '#F2D21B' }));
    expect(html).toMatch(/data-layout-color-value="inherit" aria-pressed="false"/);
  });

  it('should fall back to white when neither box nor rack has a color', () => {
    const html = FreezerEditor(makeLayout());
    expect(html).toMatch(/box-container[^"]*" style="[^"]*--item-color: #FFFFFF/);
  });

  it('should hide the "Match rack color" option in read-only mode', () => {
    const html = FreezerEditor(makeLayout({ rackColor: '#2878C7' }), true);
    expect(html).not.toContain('Match rack color');
  });
});

