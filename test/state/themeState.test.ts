import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeTheme } from '../../src/state/themeState.js';

describe('Theme preference', () => {
  const theme = () => document.documentElement.dataset.theme;
  const button = (value: string) => document.querySelector<HTMLButtonElement>(`[data-theme-value="${value}"]`)!;
  function choose(value: string) {
    button(value).click();
  }

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn(() => { throw new Error('System theme must not be used'); }));
    document.body.innerHTML = `<button data-theme-value="light" aria-pressed="true"></button>
      <button data-theme-value="dark" aria-pressed="false"></button>`;
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('defaults to Light without checking the system preference', () => {
    initializeTheme();
    expect(theme()).toBe('light');
    expect(button('light').getAttribute('aria-pressed')).toBe('true');
    expect(button('dark').getAttribute('aria-pressed')).toBe('false');
    expect(window.matchMedia).not.toHaveBeenCalled();
  });

  it.each(['light', 'dark'])('restores saved %s mode and selects the matching icon', saved => {
    localStorage.setItem('freezer-theme', saved);
    initializeTheme();
    expect(theme()).toBe(saved);
    expect(button(saved).getAttribute('aria-pressed')).toBe('true');
    expect(button(saved === 'light' ? 'dark' : 'light').getAttribute('aria-pressed')).toBe('false');
  });

  it('saves icon choices and keeps exactly one mode selected', () => {
    initializeTheme();
    choose('dark');
    expect(theme()).toBe('dark');
    expect(localStorage.getItem('freezer-theme')).toBe('dark');
    expect(button('dark').getAttribute('aria-pressed')).toBe('true');
    expect(button('light').getAttribute('aria-pressed')).toBe('false');
    choose('light');
    expect(localStorage.getItem('freezer-theme')).toBe('light');
    expect(theme()).toBe('light');
    expect(button('light').getAttribute('aria-pressed')).toBe('true');
    expect(button('dark').getAttribute('aria-pressed')).toBe('false');
  });

  it.each(['system', 'invalid'])('defaults to Light for saved preference "%s"', saved => {
    localStorage.setItem('freezer-theme', saved);
    initializeTheme();
    expect(theme()).toBe('light');
    expect(button('light').getAttribute('aria-pressed')).toBe('true');
  });

  it('still defaults to Light if storage cannot be read', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    expect(() => initializeTheme()).not.toThrow();
    expect(theme()).toBe('light');
  });

  it('still switches themes if storage cannot be written', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    initializeTheme();
    choose('dark');
    expect(theme()).toBe('dark');
    expect(button('dark').getAttribute('aria-pressed')).toBe('true');
  });
});
