/** themeState.ts - restores and applies the browser's Light/Dark theme choice and wires theme buttons. */
type ThemePreference = 'light' | 'dark';

// 'freezer-theme' stores a plain 'light' or 'dark' string, not JSON.
const STORAGE_KEY = 'freezer-theme';

/** Checks a stored string (or null) and returns whether it is a supported theme preference. */
function isThemePreference(value: string | null): value is ThemePreference {
    return value === 'light' || value === 'dark';
}

/** Takes no arguments, restores the saved theme and registers button listeners, and returns nothing. */
export function initializeTheme(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-value]');
    let preference: ThemePreference = 'light';
    // Missing, invalid, or legacy choices fall back to Light; storage access is optional.
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (isThemePreference(saved)) preference = saved;
    } catch {
        // The theme still works when browser storage is unavailable.
    }

    // Reflect the current choice in both CSS's data-theme selector and accessible button states.
    function applyTheme(): void {
        document.documentElement.dataset.theme = preference;
        buttons.forEach(button => {
            button.setAttribute('aria-pressed', String(button.getAttribute('data-theme-value') === preference));
        });
    }

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const value = button.getAttribute('data-theme-value');
            if (!isThemePreference(value)) return;
            preference = value;
            applyTheme();
            try {
                localStorage.setItem(STORAGE_KEY, preference);
            } catch {
                // Keep the selection for this visit even if it cannot be saved.
            }
        });
    });
    applyTheme();
}
