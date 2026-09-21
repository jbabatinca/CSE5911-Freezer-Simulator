import { getAllLayouts } from '../services/StorageService.js';

export function LayoutDashboard(): string {
  const layouts = getAllLayouts();
  console.log('Layouts for dashboard:', layouts);
  
  let buttonsHtml = '';
  
  // Show up to 5 slots
  for (let i = 0; i < 5; i++) {
    if (i < layouts.length) {
      // Show saved layout
      const layout = layouts[i]!;
      buttonsHtml += `<button id="layout-${layout.id}" class="layout-button layout-slot">
        ${layout.name}
      </button>`;
    } else if (i === layouts.length) {
      // First empty slot after layouts = "New Layout"
      buttonsHtml += `<button id="btn-new-layout-${i}" class="layout-button new-layout-btn">
        New Layout
      </button>`;
    } else {
      // Rest are "+"
      buttonsHtml += `<button id="btn-add-layout-${i}" class="layout-button plus-btn">
        +
      </button>`;
    }
  }
  
  return `
    <div class="layout-dashboard">
      <h2>Freezer Layouts</h2>
      <div class="layout-grid">
        ${buttonsHtml}
      </div>
    </div>
  `;
}
