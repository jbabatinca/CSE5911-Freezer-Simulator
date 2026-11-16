/**
 * LayoutSearchView.ts - the search UI for freezer layouts.
 * Two pieces: a toggle button (LayoutSearchButton) and the collapsible search panel
 * (LayoutSearchView) with the form, result count and result list. This file only
 * builds HTML; the click/submit handlers and the search state live in render/App.ts,
 * and the matching itself is in services/LayoutSearchService.ts.
 */
import type { LayoutSearchResult, LayoutSearchType } from '../services/LayoutSearchService.js';

// Display name shown before each result, e.g. "Rack: Rack 1".
const TYPE_LABELS: Record<LayoutSearchType, string> = {
  layout: 'Layout', shelf: 'Shelf', rack: 'Rack', box: 'Box', sample: 'Sample', position: 'Position',
};

/**
 * Renders the "Search" button that shows/hides the search panel.
 * @param open whether the panel is currently open (sets aria-expanded for screen readers)
 * @returns HTML string; the button id is btn-toggle-layout-search
 */
export function LayoutSearchButton(open = false): string {
  return `<button id="btn-toggle-layout-search" type="button" class="layout-search-toggle" aria-expanded="${open}" aria-controls="layout-search-panel">
    ${searchIcon()}<span>Search</span>
  </button>`;
}

/**
 * Renders the search panel: input form, "N results" status line, and the list of results.
 * @param query the current search text (put back into the input after each re-render)
 * @param results matches from searchLayouts()
 * @param selectedKey key of the result the user clicked, shown as "Selected: ..."; null if none
 * @param allLayouts true on the dashboard (searching every saved layout), false inside one layout (changes the help text)
 * @param open whether the panel is visible; when false it is rendered with the `hidden` attribute
 * @returns HTML string. Each result button carries data-layout-search-key for App.ts to read.
 * Accessibility: the panel is a labelled section, the form has role="search", and the result
 * count uses role="status" so screen readers announce it.
 */
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

// Magnifying-glass SVG used in the toggle button and the input. aria-hidden because it is decorative.
function searchIcon(): string {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';
}

// Escapes text before putting it in HTML (the query and layout/item names are user-typed), to prevent HTML injection.
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]!);
}
