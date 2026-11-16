/** LayoutDashboard.ts - renders saved freezer buttons and optional search controls for viewing or editing. */
import { getAllLayouts } from '../services/StorageService.js';

/** Takes a read-only flag and optional search button/panel HTML, and returns dashboard HTML with Add Freezer in edit mode. */
export function LayoutDashboard(readOnly: boolean = false, searchButton = '', searchPanel = ''): string {
  // Search fragments are supplied by the caller; App.ts handles actions using the rendered button ids.
  const layouts = getAllLayouts();
  console.log('Layouts for dashboard:', layouts);

  let buttonsHtml = '';

  if (readOnly) {
    // Read-only mode: only show existing layouts
    for (let i = 0; i < layouts.length; i++) {
      const layout = layouts[i]!;
      buttonsHtml += `<button id="layout-${layout.id}" class="layout-button layout-slot">
        ${layout.name}
      </button>`;
    }
  } else {
    // Edit mode: show layouts and create buttons
    for (const layout of layouts) {
      buttonsHtml += `<button id="layout-${layout.id}" class="layout-button layout-slot">
        ${layout.name}
      </button>`;
    }
    buttonsHtml += `<button id="btn-add-freezer" class="layout-button new-layout-btn">
      + Add Freezer
    </button>`;
  }

  return `
    <div class="layout-dashboard">
      <div class="layout-dashboard-header">
        <h2>Freezer Layouts</h2>
        ${searchButton}
      </div>
      ${searchPanel}
      <div class="layout-grid">
        ${buttonsHtml}
      </div>
    </div>
  `;
}
