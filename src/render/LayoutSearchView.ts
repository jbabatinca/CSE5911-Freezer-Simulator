import type { LayoutSearchResult, LayoutSearchType } from '../services/LayoutSearchService.js';

const TYPE_LABELS: Record<LayoutSearchType, string> = {
  layout: 'Layout', shelf: 'Shelf', rack: 'Rack', box: 'Box', sample: 'Sample', position: 'Position',
};

export function LayoutSearchButton(open = false): string {
  return `<button id="btn-toggle-layout-search" type="button" class="layout-search-toggle" aria-expanded="${open}" aria-controls="layout-search-panel">
    ${searchIcon()}<span>Search</span>
  </button>`;
}

export function LayoutSearchView(query: string, results: LayoutSearchResult[], selectedKey: string | null, allLayouts = false, open = false): string {
  const selected = results.find(result => result.key === selectedKey);
  return `
    <section id="layout-search-panel" class="layout-search" aria-labelledby="layout-search-title" ${open ? '' : 'hidden'}>
      <h3 id="layout-search-title" class="layout-search-label">Find in freezer layouts</h3>
      <form id="layout-search-form" role="search">
        <label for="layout-search-input" class="layout-search-label">Name or position</label>
        <div class="layout-search-controls">
          <div class="layout-search-field">
            ${searchIcon()}
            <input id="layout-search-input" type="search" value="${escapeHtml(query)}" placeholder="Search layouts, shelves, racks, boxes, samples…" aria-describedby="layout-search-help">
          </div>
          <button type="submit" class="layout-search-submit">Find</button>
          <button id="btn-clear-layout-search" type="button">Clear</button>
          <button id="btn-close-layout-search" type="button" aria-label="Close search" title="Close search">×</button>
        </div>
      </form>
      <p id="layout-search-help">Search ${allLayouts ? 'all saved layouts' : 'this layout'} for layouts, shelves, racks, boxes, samples, or positions. Select a result to open and highlight it.</p>
      <p role="status">${!query.trim() ? '' : results.length === 0
        ? `No results found for “${escapeHtml(query)}”.`
        : `${results.length} result${results.length === 1 ? '' : 's'}.`}</p>
      ${results.length > 0 ? `
        <ul class="layout-search-results" aria-label="Search results">
          ${results.map(result => `
            <li><button type="button" data-layout-search-key="${escapeHtml(result.key)}" aria-pressed="${result.key === selectedKey}">
              <strong>${TYPE_LABELS[result.type]}: ${escapeHtml(result.name)}</strong>
              <span>${escapeHtml(result.path)}</span>
            </button></li>
          `).join('')}
        </ul>
      ` : ''}
      ${selected ? `<p class="layout-search-selection">Selected: <strong>${TYPE_LABELS[selected.type]}: ${escapeHtml(selected.name)}</strong> — ${escapeHtml(selected.path)}</p>` : ''}
    </section>
  `;
}

function searchIcon(): string {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]!);
}
