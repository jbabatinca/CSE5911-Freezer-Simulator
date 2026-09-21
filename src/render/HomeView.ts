export function HomeView(): string {
    return `
    <div class="home-view">
        <h1>Welcome to Freezer Simulator</h1>
        <p>A web-based training tool for research laboratory staff and student workers.</p>

        <div class="home-buttons">
            <button id="btn-configuration" class="mode-button">
                Enter Configuration Mode
            </button>
            <button id="btn-training" class="mode-button">
                Enter Training Mode
            </button>
        </div>
    </div>
    `;
}