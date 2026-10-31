import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeTheme } from '../../src/state/themeState.js';

describe('Theme preference', () => {
  const system = { matches: false, addEventListener: vi.fn() };
  const theme = () => document.documentElement.dataset.theme;
  const select = () => document.getElementById('theme-select') as HTMLSelectElement;
  function choose(value: string) {
    select().value = value;
    select().dispatchEvent(new Event('change'));
  }
  function changeSystem(dark: boolean) {
    system.matches = dark;
    const onChange = system.addEventListener.mock.calls[0]![1] as () => void;
    onChange();
  }

  beforeEach(() => {
    localStorage.clear();
    system.matches = false;
    system.addEventListener.mockClear();
    vi.stubGlobal('matchMedia', vi.fn(() => system));
    document.body.innerHTML = `<select id="theme-select">
      <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
    </select>`;
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([false, true])('follows the system on first visit (dark = %s)', dark => {
    system.matches = dark;
    initializeTheme();
    expect(theme()).toBe(dark ? 'dark' : 'light');
    expect(select().value).toBe('system');
  });

  it.each(['light', 'dark'])('restores saved %s mode even with the opposite system preference', saved => {
    localStorage.setItem('freezer-theme', saved);
    system.matches = saved !== 'dark';
    initializeTheme();
    expect(theme()).toBe(saved);
    expect(select().value).toBe(saved);
  });

  it('saves manual choices and follows system changes only after returning to System', () => {
    initializeTheme();
    changeSystem(true);
    expect(theme()).toBe('dark');
    choose('light');
    expect(localStorage.getItem('freezer-theme')).toBe('light');
    changeSystem(true);
    expect(theme()).toBe('light');
    choose('system');
    expect(localStorage.getItem('freezer-theme')).toBe('system');
    expect(theme()).toBe('dark');
    changeSystem(false);
    expect(theme()).toBe('light');
  });

  it('ignores an invalid saved theme and follows the system', () => {
    localStorage.setItem('freezer-theme', 'invalid');
    system.matches = true;
    initializeTheme();
    expect(theme()).toBe('dark');
    expect(select().value).toBe('system');
  });

  it('still applies the system theme if storage cannot be read', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    system.matches = true;
    expect(() => initializeTheme()).not.toThrow();
    expect(theme()).toBe('dark');
  });

  it('still switches themes if storage cannot be written', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    initializeTheme();
    choose('dark');
    expect(theme()).toBe('dark');
    expect(select().value).toBe('dark');
  });
});
