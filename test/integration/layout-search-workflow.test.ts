import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/render/App.js';
import { FreezerEditor } from '../../src/render/FreezerEditor.js';
import { deleteLayout, saveLayout } from '../../src/services/StorageService.js';
import { switchToUserMode } from '../../src/state/authState.js';
import { setExpandedShelfId } from '../../src/state/editorState.js';
import { setCurrentEditingLayout } from '../../src/state/layoutState.js';
import { initializeMode, setShowAdminPasswordModal, setShowAdminSettingsModal } from '../../src/state/modeState.js';
import { element, makeLayout, parseView } from '../helpers/questionSets.js';

const click = (selector: string) => element<HTMLButtonElement>(document, selector).click();
const input = () => element<HTMLInputElement>(document, '#layout-search-input');
function search(query: string) {
  if (element(document, '#btn-toggle-layout-search').getAttribute('aria-expanded') !== 'true') {
    click('#btn-toggle-layout-search');
  }
  input().value = query;
  element(document, '#layout-search-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
function selectResult(type: string, id: string, layoutId = 'layout-1') {
  const key = JSON.stringify([layoutId, type, id]);
  const button = [...document.querySelectorAll<HTMLButtonElement>('[data-layout-search-key]')]
    .find(item => item.dataset.layoutSearchKey === key);
  expect(button, `Expected search result ${key}`).toBeDefined();
  button!.click();
}

describe('Layout search application workflow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    switchToUserMode();
    initializeMode('home');
    setShowAdminPasswordModal(false);
    setShowAdminSettingsModal(false);
    setCurrentEditingLayout(null);
    setExpandedShelfId(null);
    document.body.innerHTML = '<main id="app"></main>';
    saveLayout(makeLayout());
    App();
    click('#btn-user-mode');
    click('#btn-freezer-layouts');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('opens search from the header and preserves it when closing with Escape or the close button', () => {
    const toggle = () => element(document, '#btn-toggle-layout-search');
    const panel = () => element(document, '#layout-search-panel');
    expect(panel().hidden).toBe(true);
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    click('#btn-toggle-layout-search');
    expect(panel().hidden).toBe(false);
    expect(document.activeElement).toBe(input());
    input().value = 'unsubmitted draft';
    click('#btn-close-layout-search');
    expect(panel().hidden).toBe(true);
    expect(document.activeElement).toBe(toggle());
    click('#btn-toggle-layout-search');
    expect(input().value).toBe('unsubmitted draft');
    search('serum');
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(panel().hidden).toBe(true);
    expect(document.activeElement).toBe(toggle());
    click('#btn-toggle-layout-search');
    expect(input().value).toBe('serum');
    expect(document.querySelectorAll('[data-layout-search-key]')).toHaveLength(2);
  });

  it('puts the layout search button beside download actions and starts collapsed', () => {
    click('#layout-layout-1');
    expect(element(document, '.editor-header #btn-toggle-layout-search')).toBeDefined();
    expect(element(document, '.editor-header #btn-download')).toBeDefined();
    expect(element(document, '#layout-search-panel').hidden).toBe(true);
  });

  it('keeps the selected highlight and collapsed search state when the freezer is expanded again', () => {
    search('serum');
    selectResult('sample', 'layout-1-position-1');
    click('#btn-close-layout-search');
    click('#btn-toggle-box-layout-1-box-1');
    click('#btn-toggle-box-layout-1-box-1');
    expect(element(document, '#layout-search-panel').hidden).toBe(true);
    expect(element(document, '#btn-toggle-layout-search').getAttribute('aria-expanded')).toBe('false');
    expect(element(document, '.layout-search-target').id).toBe('pos-layout-1-position-1');
    click('#btn-toggle-layout-search');
    expect(input().value).toBe('serum');
    expect(document.querySelectorAll('[data-layout-search-key][aria-pressed="true"]')).toHaveLength(1);
    expect(element(document, '.layout-search-selection').textContent).toContain('Sample: Serum');
  });

  it('treats whitespace-only search as a reset without closing the freezer path or changing saved data', () => {
    search('serum');
    selectResult('sample', 'layout-1-position-1');
    const saved = localStorage.getItem('freezer-layouts');
    search('   ');
    expect(input().value).toBe('');
    expect(document.querySelectorAll('[data-layout-search-key], .layout-search-target, .layout-search-ancestor')).toHaveLength(0);
    expect(document.querySelector('.layout-search-selection')).toBeNull();
    expect(element(document, '.layout-search [role="status"]').textContent).toBe('');
    expect(element(document, '#pos-layout-1-position-1')).toBeDefined();
    expect(element(document, '#layout-search-panel').hidden).toBe(false);
    expect(document.activeElement).toBe(input());
    expect(localStorage.getItem('freezer-layouts')).toBe(saved);
  });

  it('clears the old sample selection when a new query selects a rack', () => {
    search('serum');
    selectResult('sample', 'layout-1-position-1');
    search('rack 2');
    expect(document.querySelector('.layout-search-target')).toBeNull();
    expect(document.querySelector('.layout-search-selection')).toBeNull();
    expect(document.querySelector('[data-layout-search-key][aria-pressed="true"]')).toBeNull();
    selectResult('rack', 'layout-1-rack-2');
    expect(element(document, '.layout-search-target').id).toBe('rack-layout-1-rack-2');
    expect(document.activeElement?.id).toBe('rack-layout-1-rack-2');
    expect(document.querySelectorAll('.box-details')).toHaveLength(0);
    expect(document.querySelectorAll('.layout-search-target')).toHaveLength(1);
  });

  it('limits an open layout to its own contents and restores all-layout search on the dashboard', () => {
    const otherLayout = makeLayout('layout-2');
    otherLayout.freezerData.samples![0]!.name = 'Unique control';
    saveLayout(otherLayout);
    click('#layout-layout-1');
    search('unique control');
    expect(document.querySelectorAll('[data-layout-search-key]')).toHaveLength(0);
    expect(element(document, '.layout-search [role="status"]').textContent).toContain('No results found');
    click('#btn-back-to-layouts');
    search('unique control');
    expect(document.querySelectorAll('[data-layout-search-key]')).toHaveLength(2);
    selectResult('sample', 'layout-2-position-1', 'layout-2');
    expect(document.activeElement?.id).toBe('pos-layout-2-position-1');
  });

  it('handles a layout deleted after dashboard results were displayed', () => {
    search('serum');
    deleteLayout('layout-1');
    expect(() => selectResult('sample', 'layout-1-position-1')).not.toThrow();
    expect(document.querySelector('.freezer-editor')).toBeNull();
    expect(document.querySelectorAll('.layout-search-target')).toHaveLength(0);
    search('serum');
    expect(document.querySelectorAll('[data-layout-search-key]')).toHaveLength(0);
    expect(element(document, '.layout-search [role="status"]').textContent).toContain('No results found');
  });

  it('distinguishes identically named shelves and racks when choosing a result', () => {
    const layout = makeLayout();
    const shelf = layout.freezerData.shelves[0]!;
    shelf.name = shelf.racks[0]!.name = 'Shared name';
    saveLayout(layout);
    search('shared name');
    expect(document.querySelectorAll('[data-layout-search-key]')).toHaveLength(2);
    selectResult('shelf', shelf.id);
    expect(document.activeElement?.id).toBe(`shelf-${shelf.id}`);
    expect(document.querySelectorAll('.rack-grid')).toHaveLength(0);
    selectResult('rack', shelf.racks[0]!.id);
    expect(document.activeElement?.id).toBe(`rack-${shelf.racks[0]!.id}`);
    expect(document.querySelectorAll('.rack-grid')).toHaveLength(1);
    expect(document.querySelectorAll('[data-layout-search-key][aria-pressed="true"]')).toHaveLength(1);
  });

  it('searches all saved layouts and opens a matching item in another freezer', () => {
    saveLayout(makeLayout('layout-2'));
    search('serum');
    expect(document.querySelectorAll('[data-layout-search-key]')).toHaveLength(4);
    selectResult('sample', 'layout-2-position-2', 'layout-2');
    expect(element(document, '.layout-name-display').textContent).toContain('Freezer layout-2');
    expect(document.activeElement?.id).toBe('pos-layout-2-position-2');
    expect(element(document, '.layout-search-selection').textContent).toContain('Freezer layout-2 → Top shelf → Rack 2 → Box 2 → Position A1');
    expect(input().value).toBe('serum');
    expect(document.querySelectorAll('[data-layout-search-key]')).toHaveLength(2);
  });

  it.each([
    ['layout-1', 'layout', 'layout-1', 'freezer-title', 0],
    ['top', 'shelf', 'layout-1-shelf', 'shelf-layout-1-shelf', 1],
    ['rack 2', 'rack', 'layout-1-rack-2', 'rack-layout-1-rack-2', 2],
    ['box 2', 'box', 'layout-1-box-2', 'box-layout-1-box-2', 3],
    ['A2', 'position', 'layout-1-empty-2', 'pos-layout-1-empty-2', 3],
  ])('opens and focuses a %s result', (query, type, id, targetId, ancestors) => {
    search(query as string);
    selectResult(type as string, id as string);
    expect(document.activeElement?.id).toBe(targetId);
    expect(element(document, '.layout-search-target').id).toBe(targetId);
    expect(document.querySelectorAll('.layout-search-ancestor')).toHaveLength(ancestors as number);
  });

  it('opens a selected sample from collapsed shelves and replaces the highlighted path when switching results', () => {
    click('#layout-layout-1');
    const saved = localStorage.getItem('freezer-layouts');
    search('  SER  ');
    selectResult('sample', 'layout-1-position-2');
    expect(element(document, '.layout-search-selection').textContent).toContain('Top shelf → Rack 2 → Box 2 → Position A1');
    expect(document.querySelectorAll('.layout-search-ancestor')).toHaveLength(3);
    expect(element(document, '#rack-layout-1-rack-2').classList.contains('layout-search-ancestor')).toBe(true);
    expect(element(document, '.layout-search-target').id).toBe('pos-layout-1-position-2');
    expect(document.activeElement?.id).toBe('pos-layout-1-position-2');
    selectResult('sample', 'layout-1-position-1');
    expect(element(document, '.layout-search-target').id).toBe('pos-layout-1-position-1');
    expect(document.querySelectorAll('.layout-search-target')).toHaveLength(1);
    expect(localStorage.getItem('freezer-layouts')).toBe(saved);
  });

  it('handles no matches, clears highlights, and resets search when opening a different layout', () => {
    click('#layout-layout-1');
    search('absent');
    expect(element(document, '.layout-search [role="status"]').textContent).toContain('No results found');
    search('serum');
    selectResult('sample', 'layout-1-position-1');
    click('#btn-clear-layout-search');
    expect(input().value).toBe('');
    expect(document.querySelectorAll('.layout-search-ancestor, .layout-search-target, [data-layout-search-key]')).toHaveLength(0);
    expect(document.activeElement).toBe(input());
    search('serum');
    selectResult('sample', 'layout-1-position-1');
    saveLayout(makeLayout('layout-2'));
    click('#btn-back-to-layouts');
    expect(input().value).toBe('');
    click('#layout-layout-2');
    expect(input().value).toBe('');
    expect(document.querySelector('.layout-search-target')).toBeNull();
  });

  it('resets dashboard search when leaving Layout View', () => {
    search('serum');
    click('#btn-back');
    click('#btn-freezer-layouts');
    expect(input().value).toBe('');
    expect(document.querySelectorAll('[data-layout-search-key]')).toHaveLength(0);
  });

  it('escapes search queries and result names', () => {
    const layout = makeLayout();
    layout.freezerData.samples![0]!.name = '<img src=x onerror=alert(1)>';
    const view = parseView(FreezerEditor(layout, true, { searchQuery: '<img' }));
    expect(view.querySelector('img')).toBeNull();
    expect(view.querySelector<HTMLInputElement>('#layout-search-input')?.value).toBe('<img');
    expect(view.querySelector('.layout-search-results strong')?.textContent).toBe('Sample: <img src=x onerror=alert(1)>');
  });

  it('keeps search out of admin editing and PDF export', () => {
    const layout = makeLayout();
    expect(parseView(FreezerEditor(layout)).querySelector('.layout-search')).toBeNull();
    expect(parseView(FreezerEditor(layout, true, { exportView: true })).querySelector('.layout-search')).toBeNull();
  });
});
