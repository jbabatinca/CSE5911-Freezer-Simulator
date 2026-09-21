export function NewLayoutModal(): string {
    return `
        <div class="modal-overlay" id="new-layout-modal">
            <div class="modal-content">
                <h3>New Layout</h3>
                <button id="btn-create-new" class="modal-button">
                    Create New
                </button>
                <button id="btn-upload" class="modal-button">
                   Upload Layout
                </button>
                <button id="btn-close-modal" class="modal-button">
                    Cancel
                </button>
            </div>
        </div>
    `;
}
