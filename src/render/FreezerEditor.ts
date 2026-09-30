import type { SavedLayout } from '../models/SavedLayout.js';
import type { BoxPosition, FreezerBox, FreezerRack } from '../models/freezerLayout.js';
import {
  getExpandedShelfId,
  getExpandedRackId,
  getExpandedBoxId
} from '../state/editorState.js';

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
                              return `
                                <li class="rack${rackExpanded ? ' rack-expanded' : ''}" id="rack-${rack.id}">
                                  <div class="rack-info">
                                    <button id="btn-toggle-rack-${rack.id}" class="btn-toggle">
                                      ${rackExpanded ? '▼' : '▶'}
                                    </button>
                                    <h4>${rack.name}</h4>
                                    <p>${filledSlots} / ${rack.boxSlots.length} boxes filled</p>
                                    ${!readOnly && shelf.racks.length > 1 ? `<button id="btn-remove-rack-${shelf.racks.indexOf(rack)}" class="btn-remove">Remove</button>` : ''}
                                  </div>

                                  ${rackExpanded ? `
                                    <div class="rack-grid">
                                      ${renderBoxGrid(rack, expandedBoxId, layout.freezerData.samples ?? [])}
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

function renderBoxGrid(rack: FreezerRack, expandedBoxId: string | null, samples: SavedLayout['freezerData']['samples']): string {
  let html = '<div class="box-grid">';

  for (let i = 0; i < rack.boxSlots.length; i++) {
    const slot = rack.boxSlots[i]!;
    const hasBox = slot.box !== null;

    if (hasBox) {
      const boxExpanded = expandedBoxId === slot.box!.id;
      html += `
        <div class="box-container${boxExpanded ? ' box-selected' : ''}" style="position: relative;">
          <button id="btn-toggle-box-${slot.box!.id}" class="btn-toggle box-toggle" aria-expanded="${boxExpanded}">
            ${boxExpanded ? '▼' : '▶'} ${slot.box!.name} (${slot.box!.positions.length}/81)
          </button>
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
    html += `
      <section class="box-details" aria-label="Box positions">
        <h5>${expandedSlot.box.name} — positions</h5>
        <div class="box-positions-grid">
          ${renderPositionGrid(expandedSlot.box, expandedSlot.row, expandedSlot.column, samples)}
        </div>
      </section>
    `;
  }
  return html;
}

function renderPositionGrid(box: FreezerBox, boxRow: number, boxCol: number, readOnly: boolean = false, samples: SavedLayout['freezerData']['samples']): string {
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
      const sampleName = pos.sampleId ? sampleNames.get(pos.sampleId) : undefined;
      html += sampleName || pos.sampleId
        ? `
          <div id="pos-${pos.id}" class="box-position position-filled" style="position: relative;" title="${escapeHtml(sampleName ?? pos.sampleId!)}" aria-label="${label}: ${escapeHtml(sampleName ?? pos.sampleId!)}">
            ${label}
            ${!readOnly ? `<button id="btn-remove-sample-${pos.id}" class="btn-remove-sample" title="Remove sample" style="position: absolute; top: 1px; right: 1px; width: 18px; height: 18px; padding: 0; font-size: 12px; min-width: auto;">✕</button>` : ''}
        </div>
        `
        : `
          <button id="btn-assign-specimen-${pos.id}" class="box-position position-filled btn-assign-specimen" aria-label="Assign specimen to ${label}" title="Assign specimen">
            ${label} +
          </button>
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

