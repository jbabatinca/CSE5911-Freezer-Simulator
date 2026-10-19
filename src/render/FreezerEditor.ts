import type { SavedLayout } from '../models/SavedLayout.js';
import type { BoxPosition, FreezerBox, FreezerRack } from '../models/freezerLayout.js';
import {
  getExpandedShelfId,
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

export function FreezerEditor(layout: SavedLayout, readOnly: boolean = false): string {
  const shelves = layout.freezerData.shelves;
  const expandedShelfId = getExpandedShelfId();
  const expandedRackId = getExpandedRackId();
  const expandedBoxId = getExpandedBoxId();

  return `
    <div class="freezer-editor">
      <div class="editor-header">
        <button id="btn-back-to-layouts" class="btn-back">← Back to Layouts</button>

        ${readOnly ? `
          <span class="layout-name-display">${layout.name}</span>
        ` : `
          <input
            type="text"
            id="layout-name-input"
            value="${layout.name}"
            placeholder="Layout name"
            class="layout-name-input"
          />
          <button id="btn-save" class="btn-save">Save</button>
          <button id="btn-delete" class="btn-delete">Delete</button>
        `}
        <button id="btn-download" class="btn-download">Download</button>
      </div>

      <div class="editor-content">
        <h2 id="freezer-title">${layout.name}</h2>
        <p>Front view — shelves are shown from top to bottom.</p>

        <section class="freezer" aria-labelledby="freezer-title">
          ${shelves.length === 0
            ? '<p>No shelves in this freezer.</p>'
            : shelves.map((shelf, shelfIdx) => {
                const isExpanded = expandedShelfId === shelf.id;
                return `
                  <section class="shelf" aria-label="${shelf.name}">
                    <div class="shelf-header">
                      <button id="btn-toggle-shelf-${shelf.id}" class="btn-toggle">
                        ${isExpanded ? '▼' : '▶'}
                      </button>
                      <h3>${shelf.name}</h3>
                      ${!readOnly && shelves.length < 4 ? `<button id="btn-remove-shelf-${shelfIdx}" class="btn-remove">Remove Shelf</button>` : ''}
                    </div>

                    ${isExpanded ? `
                      ${shelf.racks.length === 0
                        ? '<p>No racks on this shelf.</p>'
                        : `
                          <ul class="racks">
                            ${shelf.racks.map((rack) => {
                              const filledSlots = rack.boxSlots.filter(slot => slot.box !== null).length;
                              const rackExpanded = expandedRackId === rack.id;
                              const rackColor = isHexColor(rack.color) ? rack.color : DEFAULT_LAYOUT_COLOR;
                              return `
                                <li class="rack color-coded${rackExpanded ? ' rack-expanded' : ''}" id="rack-${rack.id}" style="--item-color: ${rackColor}; --item-foreground: ${getReadableTextColor(rackColor)}">
                                  <div class="rack-info">
                                    <button id="btn-toggle-rack-${rack.id}" class="btn-toggle">
                                      ${rackExpanded ? '▼' : '▶'}
                                    </button>
                                    <h4>${rack.name}</h4>
                                    ${!readOnly ? `<button id="btn-rename-rack-${rack.id}" class="btn-rename-item" aria-label="Rename ${escapeHtml(rack.name)}">Rename</button>` : ''}
                                    ${!readOnly ? renderColorPicker('rack', rack.id, rack.name, rackColor) : ''}
                                    <p>${filledSlots} / ${rack.boxSlots.length} boxes filled</p>
                                    ${!readOnly && shelf.racks.length > 1 ? `<button id="btn-remove-rack-${shelf.racks.indexOf(rack)}" class="btn-remove">Remove</button>` : ''}
                                  </div>

                                  ${rackExpanded ? `
                                    <div class="rack-grid">
                                      ${renderBoxGrid(rack, expandedBoxId, readOnly, layout.freezerData.samples ?? [])}
                                    </div>
                                  ` : ''}
                                </li>
                              `;
                            }).join('')}
                          </ul>
                        `}
                      ${!readOnly && shelf.racks.length < 6 ? `<button id="btn-add-rack" class="btn-add">+ Add Rack to ${shelf.name}</button>` : ''}
                    ` : ''}
                  </section>
                `;
              }).join('')}

          ${!readOnly && shelves.length < 4 ? `<button id="btn-add-shelf" class="btn-add">+ Add Shelf</button>` : ''}
        </section>
      </div>
    </div>
  `;
}

function renderBoxGrid(rack: FreezerRack, expandedBoxId: string | null, readOnly: boolean, samples: SavedLayout['freezerData']['samples']): string {
  let html = '<div class="box-grid">';

  for (let i = 0; i < rack.boxSlots.length; i++) {
    const slot = rack.boxSlots[i]!;
    const hasBox = slot.box !== null;

    if (hasBox) {
      const boxExpanded = expandedBoxId === slot.box!.id;
      const boxInheritsRackColor = !isHexColor(slot.box!.color);
      const boxColor = isHexColor(slot.box!.color)
        ? slot.box!.color
        : isHexColor(rack.color) ? rack.color : DEFAULT_LAYOUT_COLOR;
      html += `
        <div class="box-container color-coded${boxExpanded ? ' box-selected' : ''}" style="position: relative; --item-color: ${boxColor}; --item-foreground: ${getReadableTextColor(boxColor)}">
          <button id="btn-toggle-box-${slot.box!.id}" class="btn-toggle box-toggle" aria-expanded="${boxExpanded}">
            ${boxExpanded ? '▼' : '▶'} ${slot.box!.name} (${slot.box!.positions.length}/81)
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
          ${renderPositionGrid(expandedSlot.box, expandedSlot.row, expandedSlot.column, readOnly, samples)}
        </div>
      </section>
    `;
  }
  return html;
}

function renderPositionGrid(box: FreezerBox, boxRow: number, boxCol: number, readOnly: boolean, samples: SavedLayout['freezerData']['samples']): string {
  const grid = Array<BoxPosition | null>(81).fill(null);
  const sampleNames = new Map(samples.map(sample => [sample.id, sample.name]));

  box.positions.forEach((pos) => {
    const idx = (pos.row - 1) * 9 + (pos.column - 1);
    grid[idx] = pos;
  });

  let html = '';
  for (let i = 0; i < 81; i++) {
    const pos = grid[i];
    const row = Math.floor(i / 9) + 1;
    const col = (i % 9) + 1;
    const label = String.fromCharCode(64 + row) + col;

    if (pos) {
      const sampleName = pos.sampleId ? sampleNames.get(pos.sampleId) ?? pos.sampleId : '';
      html += `
        <div id="pos-${pos.id}" class="box-position position-filled" style="position: relative;">
          ${label}
          ${!readOnly && pos.sampleId ? `<button id="btn-rename-sample-${pos.sampleId}" class="btn-rename-sample" aria-label="Rename ${escapeHtml(sampleName)}" title="Rename specimen">✎</button>` : ''}
          ${!readOnly ? `<button id="btn-remove-sample-${pos.id}" class="btn-remove-sample" title="Remove sample" style="position: absolute; top: 1px; right: 1px; width: 18px; height: 18px; padding: 0; font-size: 12px; min-width: auto;">✕</button>` : ''}
        </div>
      `;
    } else if (!readOnly) {
      html += `
        <div class="box-position">
          <button id="btn-add-sample-${boxRow}-${boxCol}-${row}-${col}" class="btn-add" aria-label="Add sample at ${label}">+</button>
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!);
}

function isHexColor(value: string | undefined): value is string {
  return value !== undefined && /^#[0-9a-fA-F]{6}$/.test(value);
}

function getReadableTextColor(hexColor: string): string {
  const red = parseInt(hexColor.slice(1, 3), 16);
  const green = parseInt(hexColor.slice(3, 5), 16);
  const blue = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness > 150 ? '#18334d' : '#ffffff';
}

