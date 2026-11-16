/**
 * Navigation.ts - renders navigation buttons appropriate to the current app mode.
 * Button actions are handled by the app controller.
 */
import { isAdminAuthenticated } from '../state/authState.js';
import type { Mode } from '../state/modeState.js';

/** Renders navigation for `mode` and returns its HTML markup. */
export function Navigation(mode: Mode): string {
    const isAdmin = isAdminAuthenticated();

    // Home modes: show Home button (and Settings/Logout for admin)
    if (mode === 'admin-home') {
        return `
        <nav class="navigation">
            <button id="btn-home" class="nav-button">
                Home
            </button>
            <button id="btn-admin-settings" class="nav-button">
                Settings
            </button>
            <button id="btn-logout" class="nav-button">
                Logout
            </button>
        </nav>
        `;
    }

    if (mode === 'user-home') {
        return `
        <nav class="navigation">
            <button id="btn-home" class="nav-button">
                Home
            </button>
        </nav>
        `;
    }

    // All other modes: show Back button only
    return `
    <nav class="navigation">
        <button id="btn-back" class="nav-button">
            ← Back
        </button>
    </nav>
    `;
}
