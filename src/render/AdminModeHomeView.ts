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
                Training Mode
            </button>
        </div>
    </div>
    `;
}
