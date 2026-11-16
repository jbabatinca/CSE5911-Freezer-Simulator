/**
 * AdminModeHomeView.ts - home screen shown after a successful admin login.
 */

/**
 * Renders the Admin Mode landing page with buttons for Configuration Mode,
 * Question Set Creator Mode, and Progress History. Takes no arguments and
 * returns an HTML string; button clicks are handled in App.ts by element id.
 */
export function AdminModeHomeView(): string {
    return `
    <div class="mode-home-view">
        <h2>Admin Mode</h2>
        <p>Create, edit, and manage freezer layouts. Set up training scenarios.</p>

        <div class="mode-buttons">
            <button id="btn-admin-configuration" class="mode-button">
                Configuration Mode
            </button>
            <button id="btn-admin-training" class="mode-button">
                Question Set Creator Mode
            </button>
            <button id="btn-user-history" class="mode-button">
                Progress History
            </button>
        </div>
    </div>
    `;
}
