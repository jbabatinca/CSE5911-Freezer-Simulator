type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = 'freezer-theme';

function isThemePreference(value: string | null): value is ThemePreference {
    return value === 'light' || value === 'dark';
}

/** Apply the saved Light/Dark choice, defaulting to Light for new or legacy preferences. */
export function initializeTheme(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-value]');
    let preference: ThemePreference = 'light';
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (isThemePreference(saved)) preference = saved;
    } catch {
        // The theme still works when browser storage is unavailable.
    }

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
