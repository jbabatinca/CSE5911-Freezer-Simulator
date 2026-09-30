export function HomeView(): string {
    return `
    <div class="home-view">
        <h1>Welcome to Freezer Simulator</h1>
        <p>A comprehensive web-based training and management tool for research laboratory freezer systems. Administrators can create and configure custom freezer layouts and training scenarios. Users can explore freezer layouts and complete training modules.</p>

        <div class="home-buttons">
            <button id="btn-admin-mode" class="mode-button">
                Admin Mode
            </button>
            <button id="btn-user-mode" class="mode-button">
                User Mode
            </button>
        </div>
    </div>
    `;
}