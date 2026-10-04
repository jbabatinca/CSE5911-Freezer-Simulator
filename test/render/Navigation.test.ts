import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Navigation } from '../../src/render/Navigation.js';
import type { Mode } from '../../src/state/modeState.js';
import * as authState from '../../src/state/authState.js';

vi.mock('../../src/state/authState.js');

describe('Navigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authState.isAdminAuthenticated as any).mockReturnValue(false);
  });

  describe('Admin Home Mode', () => {
    it('should render admin navigation with Settings and Logout buttons', () => {
      (authState.isAdminAuthenticated as any).mockReturnValue(true);
      const mode: Mode = 'admin-home';
      const html = Navigation(mode);

      expect(html).toContain('Home');
      expect(html).toContain('Settings');
      expect(html).toContain('Logout');
      expect(html).toContain('btn-admin-settings');
      expect(html).toContain('btn-logout');
    });

    it('should have navigation class', () => {
      (authState.isAdminAuthenticated as any).mockReturnValue(true);
      const html = Navigation('admin-home');
      expect(html).toContain('class="navigation"');
    });
  });

  describe('User Home Mode', () => {
    it('should render user navigation with only Home button', () => {
      (authState.isAdminAuthenticated as any).mockReturnValue(false);
      const mode: Mode = 'user-home';
      const html = Navigation(mode);

      expect(html).toContain('Home');
      expect(html).not.toContain('Settings');
      expect(html).not.toContain('Logout');
      expect(html).toContain('btn-home');
    });
  });

  describe('Other Modes (Navigation/Editor)', () => {
    it('should render Back button for non-home modes', () => {
      const modes: Mode[] = ['layout-navigation', 'freezer-editor', 'training-mode', 'configuration-mode'];

      modes.forEach(mode => {
        const html = Navigation(mode);
        expect(html).toContain('Back');
        expect(html).toContain('btn-back');
      });
    });

    it('should not show Settings or Logout for non-admin modes', () => {
      (authState.isAdminAuthenticated as any).mockReturnValue(false);
      const html = Navigation('layout-navigation');

      expect(html).not.toContain('Settings');
      expect(html).not.toContain('Logout');
    });
  });

  describe('Navigation Structure', () => {
    it('should render valid HTML', () => {
      const html = Navigation('user-home');
      expect(html).toContain('<nav');
      expect(html).toContain('</nav>');
      expect(html).toContain('button');
    });

    it('should use nav-button class for all buttons', () => {
      (authState.isAdminAuthenticated as any).mockReturnValue(true);
      const html = Navigation('admin-home');
      const buttonMatches = html.match(/class="nav-button"/g);
      expect(buttonMatches).toBeTruthy();
      expect(buttonMatches?.length).toBeGreaterThan(0);
    });

    it('should have unique button IDs', () => {
      (authState.isAdminAuthenticated as any).mockReturnValue(true);
      const html = Navigation('admin-home');

      const homeButtonCount = (html.match(/id="btn-home"/g) || []).length;
      const settingsButtonCount = (html.match(/id="btn-admin-settings"/g) || []).length;
      const logoutButtonCount = (html.match(/id="btn-logout"/g) || []).length;

      expect(homeButtonCount).toBe(1);
      expect(settingsButtonCount).toBe(1);
      expect(logoutButtonCount).toBe(1);
    });
  });
});
