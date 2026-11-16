import { getAllLayouts } from '../services/StorageService.js';

export function LayoutDashboard(readOnly: boolean = false, searchButton = '', searchPanel = ''): string {
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
