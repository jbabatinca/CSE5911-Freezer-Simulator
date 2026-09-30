export function UserModeHomeView(): string {
    return `
    <div class="mode-home-view">
        <h2>User Mode</h2>
        <p>Browse freezer layouts and complete training scenarios.</p>

        <div class="mode-buttons">
            <button id="btn-freezer-layouts" class="mode-button">
                Freezer Layouts
            </button>
            <button id="btn-user-training" class="mode-button">
                Training Mode
            </button>
        </div>
    </div>
    `;
}
