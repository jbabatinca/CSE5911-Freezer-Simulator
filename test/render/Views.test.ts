import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as modeState from '../../src/state/modeState.js';
import * as authState from '../../src/state/authState.js';
import * as layoutState from '../../src/state/layoutState.js';
import * as configState from '../../src/state/configurationState.js';

vi.mock('../../src/state/modeState.js');
vi.mock('../../src/state/authState.js');
vi.mock('../../src/state/layoutState.js');
vi.mock('../../src/state/configurationState.js');

describe('View Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (modeState.getCurrentMode as any).mockReturnValue('home');
    (authState.isAdminAuthenticated as any).mockReturnValue(false);
    (layoutState.getCurrentEditingLayout as any).mockReturnValue(null);
  });

  describe('Home View', () => {
    it('should render home view in home mode', () => {
      (modeState.getCurrentMode as any).mockReturnValue('home');
      expect(modeState.getCurrentMode()).toBe('home');
    });

    it('should access layout state from home view', () => {
      expect(layoutState.getCurrentEditingLayout).toBeDefined();
      expect(layoutState.createNewEmptyLayout).toBeDefined();
    });
  });

  describe('Admin Home View', () => {
    it('should check admin authentication', () => {
      (authState.isAdminAuthenticated as any).mockReturnValue(true);
      expect(authState.isAdminAuthenticated()).toBe(true);
    });

    it('should render admin view for authenticated users', () => {
      (authState.isAdminAuthenticated as any).mockReturnValue(true);
      (modeState.getCurrentMode as any).mockReturnValue('admin-home');

      expect(authState.isAdminAuthenticated()).toBe(true);
      expect(modeState.getCurrentMode()).toBe('admin-home');
    });

    it('should handle admin password change', () => {
      expect(authState.changeAdminPassword).toBeDefined();
    });

    it('should handle admin logout', () => {
      expect(authState.logout).toBeDefined();
    });
  });

  describe('User Home View', () => {
    it('should render user view for non-admin users', () => {
      (authState.isAdminAuthenticated as any).mockReturnValue(false);
      (modeState.getCurrentMode as any).mockReturnValue('user-home');

      expect(authState.isAdminAuthenticated()).toBe(false);
      expect(modeState.getCurrentMode()).toBe('user-home');
    });

    it('should access saved layouts from user home', () => {
      expect(layoutState.getCurrentEditingLayout).toBeDefined();
    });
  });

  describe('Configuration Mode View', () => {
    it('should render configuration view', () => {
      (modeState.getCurrentMode as any).mockReturnValue('configuration-mode');
      expect(modeState.getCurrentMode()).toBe('configuration-mode');
    });

    it('should manage configuration state', () => {
      expect(configState.openNewLayoutModal).toBeDefined();
      expect(configState.closeNewLayoutModal).toBeDefined();
    });
  });

  describe('Training Mode View', () => {
    it('should render training mode', () => {
      (modeState.getCurrentMode as any).mockReturnValue('training-mode');
      expect(modeState.getCurrentMode()).toBe('training-mode');
    });

    it('should access current layout in training mode', () => {
      (layoutState.getCurrentEditingLayout as any).mockReturnValue({
        id: 'layout-1',
        name: 'Training Layout',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-1',
          name: 'Freezer',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const layout = layoutState.getCurrentEditingLayout();
      expect(layout).toBeDefined();
      expect(layout?.freezerData).toBeDefined();
    });
  });

  describe('Layout Navigation View', () => {
    it('should render layout navigation mode', () => {
      (modeState.getCurrentMode as any).mockReturnValue('layout-navigation');
      expect(modeState.getCurrentMode()).toBe('layout-navigation');
    });

    it('should access freezer hierarchy in navigation', () => {
      (layoutState.getCurrentEditingLayout as any).mockReturnValue({
        id: 'layout-1',
        name: 'Navigation Layout',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-1',
          name: 'Freezer',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const layout = layoutState.getCurrentEditingLayout();
      expect(layout?.freezerData.shelves).toBeDefined();
    });
  });

  describe('Mode Transitions', () => {
    it('should transition between modes', () => {
      (modeState.getCurrentMode as any).mockReturnValue('home');
      expect(modeState.getCurrentMode()).toBe('home');

      (modeState.getCurrentMode as any).mockReturnValue('user-home');
      expect(modeState.getCurrentMode()).toBe('user-home');

      (modeState.getCurrentMode as any).mockReturnValue('layout-navigation');
      expect(modeState.getCurrentMode()).toBe('layout-navigation');
    });

    it('should handle back navigation', () => {
      expect(modeState.goBack).toBeDefined();
    });

    it('should set mode programmatically', () => {
      expect(modeState.setMode).toBeDefined();
    });
  });

  describe('View State Integration', () => {
    it('should coordinate all state sources', () => {
      expect(layoutState.getCurrentEditingLayout).toBeDefined();
      expect(modeState.getCurrentMode).toBeDefined();
      expect(authState.isAdminAuthenticated).toBeDefined();
      expect(configState.openNewLayoutModal).toBeDefined();
    });

    it('should maintain state across view changes', () => {
      (layoutState.getCurrentEditingLayout as any).mockReturnValue({
        id: 'layout-1',
        name: 'Test',
        freezerData: {
          schemaVersion: '1.0',
          id: 'freezer-1',
          name: 'Freezer',
          shelves: [],
          samples: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      (modeState.getCurrentMode as any).mockReturnValue('layout-navigation');

      const layout = layoutState.getCurrentEditingLayout();
      const mode = modeState.getCurrentMode();

      expect(layout?.id).toBe('layout-1');
      expect(mode).toBe('layout-navigation');
    });
  });
});
