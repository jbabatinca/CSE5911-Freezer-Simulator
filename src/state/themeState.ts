type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'freezer-theme';

function isThemePreference(value: string | null): value is ThemePreference {
    return value === 'system' || value === 'light' || value === 'dark';
}

/** Apply a saved theme across the app, following system changes in System mode. */
export function initializeTheme(): void {
    const select = document.getElementById('theme-select') as HTMLSelectElement | null;
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    let preference: ThemePreference = 'system';
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (isThemePreference(saved)) preference = saved;
    } catch {
        // The theme still works when browser storage is unavailable.
    }

    function applyTheme(): void {
        document.documentElement.dataset.theme = preference === 'system'
            ? system.matches ? 'dark' : 'light'
            : preference;
        if (select) select.value = preference;
    }

    select?.addEventListener('change', () => {
        if (!isThemePreference(select.value)) return;
        preference = select.value;
        applyTheme();
        try {
            localStorage.setItem(STORAGE_KEY, preference);
        } catch {
            // Keep the selection for this visit even if it cannot be saved.
        }
    });
    system.addEventListener('change', applyTheme);
    applyTheme();
}
