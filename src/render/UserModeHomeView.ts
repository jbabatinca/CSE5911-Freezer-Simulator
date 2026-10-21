export function UserModeHomeView(): string {
    return `
    <div class="mode-home-view">
        <h2>User Mode</h2>
        <p>Practice freezer navigation with a guided tutorial.</p>

        <div class="mode-buttons">
            <button id="btn-freezer-layouts" class="mode-button">
                Layout View
            </button>
            <button id="btn-user-training" class="mode-button">
                Tutorial Mode
            </button>
        </div>
    </div>
    `;
}
