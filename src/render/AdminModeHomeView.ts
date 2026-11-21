/**
 * AdminModeHomeView.ts - home screen shown after a successful admin login.
 */

/**
 * Renders the Lab Manager landing page with buttons for Configuration Mode,
 * Question Set Creator Mode, and Progress History. Takes no arguments and
 * returns an HTML string; button clicks are handled in App.ts by element id.
 */
export function AdminModeHomeView(): string {
    return `
    <div class="mode-home-view">
        <h2>Lab Manager</h2>
        <p>Create and edit virtual freezer layouts, build custom training question sets, and review training results in Progress History.</p>

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
