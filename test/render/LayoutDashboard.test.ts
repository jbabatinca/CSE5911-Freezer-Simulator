import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutDashboard } from '../../src/render/LayoutDashboard.js';
import { saveLayout } from '../../src/services/StorageService.js';
import { makeLayout, parseView } from '../helpers/questionSets.js';

const view = (readOnly = false) => parseView(LayoutDashboard(readOnly));
const layoutButtons = (root: ParentNode) => root.querySelectorAll('.layout-slot');

describe('LayoutDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('edit mode', () => {
    it('shows only the Add Freezer button when there are no saved layouts', () => {
      const root = view();
      expect(layoutButtons(root)).toHaveLength(0);
      expect(root.querySelectorAll('.layout-button')).toHaveLength(1);
      expect(root.querySelector('#btn-add-freezer')?.textContent).toContain('+ Add Freezer');
    });

    it('shows every saved layout followed by exactly one Add Freezer button', () => {
      saveLayout(makeLayout('layout-1'));
      saveLayout(makeLayout('layout-2'));
      const root = view();
      expect(layoutButtons(root)).toHaveLength(2);
      expect(root.querySelectorAll('#btn-add-freezer')).toHaveLength(1);
      const buttons = Array.from(root.querySelectorAll('.layout-button'));
      expect(buttons.at(-1)?.id).toBe('btn-add-freezer');
    });

    it('has no fixed limit on the number of layouts', () => {
      for (let i = 1; i <= 8; i++) saveLayout(makeLayout(`layout-${i}`));
      const root = view();
      expect(layoutButtons(root)).toHaveLength(8);
      expect(root.querySelectorAll('.layout-button')).toHaveLength(9);
      expect(root.querySelectorAll('#btn-add-freezer')).toHaveLength(1);
    });

    it('no longer renders the old New Layout or + placeholder buttons', () => {
      saveLayout(makeLayout('layout-1'));
      const root = view();
      expect(root.querySelector('[id^="btn-new-layout"]')).toBeNull();
      expect(root.querySelector('[id^="btn-add-layout"]')).toBeNull();
      expect(root.querySelector('.plus-btn')).toBeNull();
      expect(root.textContent).not.toContain('New Layout');
    });

    it('keeps the layout-<id> button ids that the click handler relies on', () => {
      saveLayout(makeLayout('layout-1'));
      expect(view().querySelector('#layout-layout-1')).not.toBeNull();
    });

    it('does not let the add button match the layout-click selector', () => {
      const addButton = view().querySelector('#btn-add-freezer')!;
      expect(addButton.matches('[id^="layout-"]')).toBe(false);
    });
  });

  describe('read-only mode', () => {
    it('shows saved layouts but no Add Freezer button', () => {
      saveLayout(makeLayout('layout-1'));
      saveLayout(makeLayout('layout-2'));
      const root = view(true);
      expect(layoutButtons(root)).toHaveLength(2);
      expect(root.querySelector('#btn-add-freezer')).toBeNull();
    });

    it('shows nothing clickable when there are no layouts', () => {
      expect(view(true).querySelectorAll('.layout-button')).toHaveLength(0);
    });
  });
});
