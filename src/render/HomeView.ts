/**
 * HomeView.ts - the app's landing page, shown first and via the Home button.
 */

/**
 * Renders the welcome page and its role options. App.ts opens the admin
 * password modal for lab managers and user home for student workers and staff.
 */
export function HomeView(): string {
    return `
    <div class="home-view">
        <h1>Welcome to Freezer Tag</h1>
        <p>Freezer Tag is a web-based training simulator for the College of Nursing. Lab managers can build virtual freezer layouts and create custom training exercises. Student workers and staff can practice navigating shelves, racks, and boxes to find sample locations before using the real freezer.</p>
        <p>Choose your role to get started.</p>

        <div class="home-buttons">
            <button id="btn-admin-mode" class="mode-button">
                Lab Manager
            </button>
            <button id="btn-user-mode" class="mode-button">
                Student Worker
            </button>
        </div>
    </div>
    `;
}
