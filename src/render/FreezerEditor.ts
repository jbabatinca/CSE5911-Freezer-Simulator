/**
 * FreezerEditor.ts - renders a saved freezer layout for editing or read-only viewing.
 * The returned HTML uses element ids/data attributes handled by the app controller.
 */
import type { SavedLayout } from '../models/SavedLayout.js';
import type { SamplePosition, FreezerBox, FreezerRack, FreezerShelf, Sample } from '../models/freezerLayout.js';
import { FREEZER_LAYOUT_LIMITS, isHexColor } from '../models/freezerLayout.js';
import { searchLayouts } from '../services/LayoutSearchService.js';
import { LayoutSearchButton, LayoutSearchView } from './LayoutSearchView.js';
import {
  getExpandedShelfIds,
  getExpandedRackId,
  getExpandedBoxId
} from '../state/editorState.js';

const DEFAULT_LAYOUT_COLOR = '#FFFFFF';

const LAYOUT_COLOR_CHOICES = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Light red', value: '#F59A9A' },
  { name: 'Red', value: '#E53935' },
  { name: 'Dark red', value: '#8E1B1B' },
  { name: 'Light orange', value: '#FFC18A' },
  { name: 'Orange', value: '#F57C00' },
  { name: 'Dark orange', value: '#914900' },
  { name: 'Light yellow', value: '#FFF1A8' },
  { name: 'Yellow', value: '#F2D21B' },
  { name: 'Dark yellow', value: '#8C7810' },
  { name: 'Light green', value: '#9BD6A9' },
  { name: 'Green', value: '#2E9D50' },
  { name: 'Dark green', value: '#18572C' },
  { name: 'Light blue', value: '#9BC7F0' },
  { name: 'Blue', value: '#2878C7' },
  { name: 'Dark blue', value: '#174477' },
  { name: 'Light indigo', value: '#B5AAE6' },
  { name: 'Indigo', value: '#5140A8' },
  { name: 'Dark indigo', value: '#2D246B' },
  { name: 'Light violet', value: '#D0A3E3' },
  { name: 'Violet', value: '#913EB8' },
  { name: 'Dark violet', value: '#4D2063' },
  { name: 'Black', value: '#000000' }
];

function renderColorPicker(kind: 'rack' | 'box', id: string, name: string, color: string, inheritsRackColor = false): string {
  const popoverId = `color-palette-${kind}-${id}`;
  return `
    <button type="button" class="layout-color-trigger ${kind}-color-trigger" popovertarget="${escapeHtml(popoverId)}" aria-label="Choose color for ${escapeHtml(name)}" title="Choose color">
      <span class="layout-color-current" style="--swatch-color: ${color}"></span>
    </button>
    <div id="${escapeHtml(popoverId)}" class="layout-color-palette" popover>
      <div class="layout-color-swatches" role="group" aria-label="Color choices for ${escapeHtml(name)}">
        ${LAYOUT_COLOR_CHOICES.map(choice => `
          <button type="button" class="layout-color-swatch" data-layout-color-kind="${kind}" data-layout-color-id="${escapeHtml(id)}" data-layout-color-value="${choice.value}" aria-label="${choice.name}" title="${choice.name}" aria-pressed="${!inheritsRackColor && color.toLowerCase() === choice.value.toLowerCase()}" style="--swatch-color: ${choice.value}"></button>
        `).join('')}
      </div>
      ${kind === 'box' ? `<button type="button" class="layout-color-inherit" data-layout-color-kind="box" data-layout-color-id="${escapeHtml(id)}" data-layout-color-value="inherit" aria-pressed="${inheritsRackColor}">Match rack color</button>` : ''}
    </div>
  `;
}

export type ExportLayout = 'current' | 'shelf-pages';

/** Optional print/export and layout-search settings for FreezerEditor. */
export interface FreezerEditorOptions {
  /** Print/PDF view: all shelves open, racks only, no box grids or controls. */
  exportView?: boolean;
  /** With exportView: 'current' (default, unchanged output) or 'shelf-pages' (one shelf per page). */
  exportLayout?: ExportLayout;
  searchQuery?: string;
  selectedSearchKey?: string | null;
  searchOpen?: boolean;
}

/** Takes a saved `layout`, optional `readOnly` flag and `options`; returns the rendered HTML markup. */
export function FreezerEditor(layout: SavedLayout, readOnly: boolean = false, options: FreezerEditorOptions = {}): string {
  const exportView = options.exportView ?? false;
  if (exportView) {
    if (options.exportLayout === 'shelf-pages') return renderShelfPageExport(layout);
    return `
      <div class="freezer-editor freezer-export">
        <h2>${escapeHtml(layout.name)}</h2>
        <section class="freezer" aria-label="${escapeHtml(layout.name)}">
          ${layout.freezerData.shelves.map(shelf => `
            <section class="shelf" aria-label="${escapeHtml(shelf.name)}">
              <div class="shelf-header"><h3>${escapeHtml(shelf.name)}</h3></div>
              <ul class="racks">
                ${shelf.racks.map(rack => {
                  const rackColor = isHexColor(rack.color) ? rack.color : DEFAULT_LAYOUT_COLOR;
                  return `
                    <li class="rack color-coded" style="--item-color: ${rackColor}; --item-foreground: ${getReadableTextColor(rackColor)}">
                      <div class="rack-info"><h4>${escapeHtml(rack.name)}</h4></div>
                    </li>`;
                }).join('')}
              </ul>
            </section>`).join('')}
        </section>
      </div>
    `;
  }
  const shelves = layout.freezerData.shelves;
  const expandedShelfIds = getExpandedShelfIds();
  const expandedRackId = getExpandedRackId();
  const expandedBoxId = getExpandedBoxId();
  const searchQuery = options.searchQuery ?? '';
  const searchResults = searchLayouts([layout], searchQuery);
  const selected = searchResults.find(result => result.key === options.selectedSearchKey);

  return `
    <div class="freezer-editor">
      <div class="editor-header">
        <button id="btn-back-to-layouts" class="btn-back">← Back to Layouts</button>

        ${readOnly ? `
          <span class="layout-name-display">${escapeHtml(layout.name)}</span>
        ` : `
          <input
            type="text"
            id="layout-name-input"
            value="${escapeHtml(layout.name)}"
            placeholder="Layout name"
            class="layout-name-input"
          />
          <button id="btn-save" class="btn-save">Save</button>
          <button id="btn-delete" class="btn-delete">Delete</button>
        `}
        ${LayoutSearchButton(options.searchOpen)}
        <button id="btn-download" class="btn-download">Download</button>
        <button id="btn-export-pdf" class="btn-download">Export to PDF</button>
      </div>

      ${LayoutSearchView(searchQuery, searchResults, selected?.key ?? null, false, options.searchOpen)}

      <div class="editor-content">
        <h2 id="freezer-title" tabindex="-1" class="${selected?.type === 'layout' ? 'layout-search-target' : ''}">${escapeHtml(layout.name)}</h2>
        <p>Front view — shelves are shown from top to bottom.</p>

        ${shelves.length > 0 ? '<button type="button" id="btn-expand-all-shelves" aria-controls="freezer-shelves">Expand All Shelves</button>' : ''}
        <section id="freezer-shelves" class="freezer" aria-labelledby="freezer-title">
          ${shelves.length === 0
            ? '<p>No shelves in this freezer.</p>'
            : shelves.map((shelf, shelfIdx) => {
                const isExpanded = expandedShelfIds.has(shelf.id);
                return `
                  <section id="shelf-${escapeHtml(shelf.id)}" data-shelf-index="${shelfIdx}" tabindex="-1" class="shelf${selected?.shelfId === shelf.id ? ' layout-search-ancestor' : ''}${selected?.type === 'shelf' && selected.shelfId === shelf.id ? ' layout-search-target' : ''}" aria-label="${escapeHtml(shelf.name)}">
                    <div class="shelf-header">
                      <button type="button" id="btn-toggle-shelf-${escapeHtml(shelf.id)}" class="btn-toggle btn-toggle-shelf" aria-label="Toggle ${escapeHtml(shelf.name)}" aria-expanded="${isExpanded}">
                        ${isExpanded ? '▼' : '▶'}
                      </button>
                      <h3>${shelf.name}</h3>
                      ${!readOnly && shelves.length < FREEZER_LAYOUT_LIMITS.maxShelvesPerFreezer ? `<button id="btn-remove-shelf-${shelfIdx}" class="btn-remove">Remove Shelf</button>` : ''}
                    </div>

                    ${isExpanded ? `
                      ${shelf.racks.length === 0
                        ? '<p>No racks on this shelf.</p>'
                        : `
                          <ul class="racks">
                            ${shelf.racks.map((rack, rackIdx) => {
                              const filledSlots = rack.boxSlots.filter(slot => slot.box !== null).length;
                              const rackExpanded = expandedRackId === rack.id;
                              const rackColor = isHexColor(rack.color) ? rack.color : DEFAULT_LAYOUT_COLOR;
                              return `
                                <li tabindex="-1" data-rack-index="${rackIdx}" class="rack color-coded${rackExpanded ? ' rack-expanded' : ''}${selected?.rackId === rack.id ? ' layout-search-ancestor' : ''}${selected?.type === 'rack' && selected.rackId === rack.id ? ' layout-search-target' : ''}" id="rack-${escapeHtml(rack.id)}" aria-label="${escapeHtml(rack.name)}" style="--item-color: ${rackColor}; --item-foreground: ${getReadableTextColor(rackColor)}">
                                  <div class="rack-info">
                                    <button id="btn-toggle-rack-${rack.id}" class="btn-toggle">
                                      ${rackExpanded ? '▼' : '▶'}
                                    </button>
                                    <h4>${rack.name}</h4>
                                    ${!readOnly ? `<button id="btn-rename-rack-${rack.id}" class="btn-rename-item" aria-label="Rename ${escapeHtml(rack.name)}">Rename</button>` : ''}
                                    ${!readOnly ? renderColorPicker('rack', rack.id, rack.name, rackColor) : ''}
                                    <p>${filledSlots} / ${rack.boxSlots.length} boxes filled</p>
                                    ${!readOnly && shelf.racks.length > 1 ? `<button id="btn-remove-rack-${shelfIdx}-${rackIdx}" class="btn-remove">Remove</button>` : ''}
                                  </div>

                                  ${rackExpanded ? `
                                    <div class="rack-grid">
                                      ${renderBoxGrid(rack, expandedBoxId, readOnly, layout.freezerData.samples ?? [], selected?.boxId ?? null, selected?.positionId ?? null, selected?.type === 'box')}
                                    </div>
                                  ` : ''}
                                </li>
                              `;
                            }).join('')}
                          </ul>
                        `}
                      ${!readOnly && shelf.racks.length < FREEZER_LAYOUT_LIMITS.maxRacksPerShelf ? `<button id="btn-add-rack-${escapeHtml(shelf.id)}" class="btn-add">+ Add Rack to ${shelf.name}</button>` : ''}
                    ` : ''}
                  </section>
                `;
              }).join('')}

          ${!readOnly && shelves.length < FREEZER_LAYOUT_LIMITS.maxShelvesPerFreezer ? `<button id="btn-add-shelf" class="btn-add">+ Add Shelf</button>` : ''}
        </section>
      </div>
    </div>
  `;
}

function renderBoxGrid(rack: FreezerRack, expandedBoxId: string | null, readOnly: boolean, samples: Sample[], selectedBoxId: string | null, selectedPositionId: string | null, highlightBox: boolean): string {
  let html = '<div class="box-grid">';

  for (let i = 0; i < rack.boxSlots.length; i++) {
    const slot = rack.boxSlots[i]!;
    const hasBox = slot.box != null;

    if (hasBox) {
      const boxExpanded = expandedBoxId === slot.box!.id;
      const boxInheritsRackColor = !isHexColor(slot.box!.color);
      const boxColor = isHexColor(slot.box!.color)
        ? slot.box!.color
        : isHexColor(rack.color) ? rack.color : DEFAULT_LAYOUT_COLOR;
      html += `
        <div id="box-${escapeHtml(slot.box!.id)}" tabindex="-1" aria-label="${escapeHtml(slot.box!.name)}" class="box-container color-coded${boxExpanded ? ' box-selected' : ''}${selectedBoxId === slot.box!.id ? ' layout-search-ancestor' : ''}${highlightBox && selectedBoxId === slot.box!.id ? ' layout-search-target' : ''}" style="position: relative; --item-color: ${boxColor}; --item-foreground: ${getReadableTextColor(boxColor)}">
          <button id="btn-toggle-box-${slot.box!.id}" class="btn-toggle box-toggle" aria-expanded="${boxExpanded}">
            ${boxExpanded ? '▼' : '▶'} ${slot.box!.name} (${slot.box!.positions.filter(p => p.sampleId).length}/${FREEZER_LAYOUT_LIMITS.maxPositionsPerBox})
          </button>
          ${!readOnly ? `<button id="btn-rename-box-${slot.box!.id}" class="btn-rename-box" aria-label="Rename ${escapeHtml(slot.box!.name)}">Rename</button>` : ''}
          ${!readOnly ? renderColorPicker('box', slot.box!.id, slot.box!.name, boxColor, boxInheritsRackColor) : ''}
          ${!readOnly ? `<button id="btn-remove-box-${slot.row}-${slot.column}" class="btn-remove-box" title="Remove box" style="position: absolute; top: 2px; right: 2px; width: 24px; height: 24px; padding: 0; font-size: 14px; min-width: auto;">✕</button>` : ''}
        </div>
      `;
    } else if (!readOnly) {
      html += `
        <div class="box-slot empty">
          <button id="btn-add-box-${slot.row}-${slot.column}" class="btn-add" aria-label="Add box at row ${slot.row}, column ${slot.column}">+</button>
        </div>
      `;
    } else {
      html += `
        <div class="box-slot empty" id="box-slot-${slot.row}-${slot.column}">
        </div>
      `;
    }
  }

  html += '</div>';

  // Use the rack's full width for samples without moving its 4×4 box slots.
  const expandedSlot = rack.boxSlots.find(slot => slot.box?.id === expandedBoxId);
  if (expandedSlot?.box) {
    const effectiveBoxColor = isHexColor(expandedSlot.box.color)
      ? expandedSlot.box.color
      : isHexColor(rack.color) ? rack.color : DEFAULT_LAYOUT_COLOR;
    html += `
      <section class="box-details" aria-label="Box positions">
        <h5>${expandedSlot.box.name} — positions</h5>
        <div class="box-positions-grid" style="--item-color: ${effectiveBoxColor}; --item-foreground: ${getReadableTextColor(effectiveBoxColor)}">
          ${renderPositionGrid(expandedSlot.box, expandedSlot.row, expandedSlot.column, readOnly, samples, selectedPositionId)}
        </div>
      </section>
    `;
  }
  return html;
}

function renderPositionGrid(box: FreezerBox, boxRow: number, boxCol: number, readOnly: boolean, samples: Sample[], selectedPositionId: string | null): string {
  const { boxRows, boxColumns } = FREEZER_LAYOUT_LIMITS;
  const grid = Array<SamplePosition | null>(boxRows * boxColumns).fill(null);
  const sampleNames = new Map(samples.map(sample => [sample.id, sample.name]));

  box.positions.forEach((pos) => {
    const idx = (pos.row - 1) * boxColumns + (pos.column - 1);
    grid[idx] = pos;
  });

  let html = '';
  for (let i = 0; i < boxRows * boxColumns; i++) {
    const pos = grid[i];
    const row = Math.floor(i / boxColumns) + 1;
    const col = (i % boxColumns) + 1;
    const label = String.fromCharCode(64 + row) + col;

    if (pos) {
      const sampleName = pos.sampleId ? sampleNames.get(pos.sampleId) ?? pos.sampleId : '';
      const filled = !!pos.sampleId;
      html += `
        <div id="pos-${escapeHtml(pos.id)}" class="box-position${filled ? ' position-filled' : ''}${selectedPositionId === pos.id ? ' layout-search-target' : ''}" style="position: relative;" tabindex="-1" aria-label="${escapeHtml(sampleName ? `${sampleName}, position ${label}` : `Position ${label}`)}" title="${escapeHtml(sampleName ? `${sampleName} — ${label}` : label)}">
          ${filled ? label : ''}
          ${!readOnly && filled ? `<button id="btn-rename-sample-${pos.sampleId}" class="btn-rename-sample" aria-label="Rename ${escapeHtml(sampleName)}" title="Rename sample">✎</button>` : ''}
          ${!readOnly && filled ? `<button id="btn-remove-sample-${pos.id}" class="btn-remove-sample" title="Remove sample" style="position: absolute; top: 1px; right: 1px; width: 18px; height: 18px; padding: 0; font-size: 12px; min-width: auto;">✕</button>` : ''}
          ${!readOnly && !filled ? `<button id="btn-assign-sample-${escapeHtml(pos.id)}" class="btn-add" aria-label="Add sample at ${label}">+</button>` : ''}
        </div>
      `;
    } else {
      html += `
        <div class="box-position">
        </div>
      `;
    }
  }

  return html;
}

/** One printed page: some racks of one shelf (or an empty shelf), with its page number. */
export interface ExportPage {
  shelf: FreezerShelf;
  racks: FreezerRack[];   // empty for an empty shelf
  continued: boolean;     // true on the 2nd+ page of a shelf
  pageNumber: number;
  totalPages: number;
}

/** Racks per printed page: a whole shelf (the schema allows at most 6 racks), so a shelf never splits. */
export const EXPORT_RACKS_PER_PAGE = FREEZER_LAYOUT_LIMITS.maxRacksPerShelf;

/** Splits every shelf into pages, in shelf order; an empty shelf still gets one page. */
export function buildShelfPages(layout: SavedLayout, racksPerPage = EXPORT_RACKS_PER_PAGE): ExportPage[] {
  const pages: Omit<ExportPage, 'pageNumber' | 'totalPages'>[] = [];
  for (const shelf of layout.freezerData.shelves) {
    if (shelf.racks.length === 0) {
      pages.push({ shelf, racks: [], continued: false });
      continue;
    }
    for (let i = 0; i < shelf.racks.length; i += racksPerPage) {
      pages.push({ shelf, racks: shelf.racks.slice(i, i + racksPerPage), continued: i > 0 });
    }
  }
  return pages.map((page, i) => ({ ...page, pageNumber: i + 1, totalPages: pages.length }));
}

function renderShelfPageExport(layout: SavedLayout): string {
  const pages = buildShelfPages(layout);
  const content = pages.length === 0
    ? `<section class="export-page"><header class="export-page-header"><h2>${escapeHtml(layout.name)}</h2></header><p class="export-empty">This freezer has no shelves.</p></section>`
    : pages.map(page => renderExportPage(layout, page)).join('');
  return `<div class="freezer-editor freezer-export-pages">${content}</div>`;
}

function renderExportPage(layout: SavedLayout, page: ExportPage): string {
  const label = `${page.shelf.name}${page.continued ? ' (continued)' : ''}`;
  return `
    <section class="export-page" aria-label="${escapeHtml(label)}">
      <header class="export-page-header">
        <h2>${escapeHtml(layout.name)}</h2>
      </header>
      <div class="freezer">
        <section class="shelf">
          <div class="shelf-header"><h3>${escapeHtml(label)}</h3></div>
          ${page.racks.length === 0
            ? '<p class="export-empty">This shelf is empty.</p>'
            : `<ul class="racks">${page.racks.map(renderExportRack).join('')}</ul>`}
        </section>
      </div>
    </section>`;
}

function renderExportRack(rack: FreezerRack): string {
  const rackColor = isHexColor(rack.color) ? rack.color : DEFAULT_LAYOUT_COLOR;
  // The CSS sizes the name so its longest word fits the rack's width.
  const longestWord = Math.max(1, ...rack.name.split(/\s+/).map(word => word.length));
  return `<li class="rack color-coded" style="--item-color: ${rackColor}; --item-foreground: ${getReadableTextColor(rackColor)}; --name-chars: ${longestWord}"><div class="rack-info"><h4>${escapeHtml(rack.name)}</h4></div></li>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!);
}

function getReadableTextColor(hexColor: string): string {
  const red = parseInt(hexColor.slice(1, 3), 16);
  const green = parseInt(hexColor.slice(3, 5), 16);
  const blue = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness > 150 ? '#18334d' : '#ffffff';
}

