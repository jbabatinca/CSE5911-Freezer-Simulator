import type { SavedLayout } from '../models/SavedLayout.js';
import type { FreezerRack } from '../models/freezerLayout.js';
import {
  getExpandedShelfId,
  getExpandedRackId,
  getExpandedBoxId
} from '../state/editorState.js';

export function FreezerEditor(layout: SavedLayout): string {
  const shelves = layout.freezerData.shelves;
  const expandedShelfId = getExpandedShelfId();
  const expandedRackId = getExpandedRackId();
  const expandedBoxId = getExpandedBoxId();

  return `
    <div class="freezer-editor">
      <div class="editor-header">
        <button id="btn-back-to-layouts" class="btn-back">← Back to Layouts</button>

        <input
          type="text"
          id="layout-name-input"
          value="${layout.name}"
          placeholder="Layout name"
          class="layout-name-input"
        />
        <button id="btn-save" class="btn-save">Save</button>
        <button id="btn-download" class="btn-download">Download</button>
        <button id="btn-delete" class="btn-delete">Delete</button>
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
                      ${shelves.length < 4 ? `<button id="btn-remove-shelf-${shelfIdx}" class="btn-remove">Remove Shelf</button>` : ''}
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
                                <li class="rack" id="rack-${rack.id}">
                                  <div class="rack-info">
                                    <button id="btn-toggle-rack-${rack.id}" class="btn-toggle">
                                      ${rackExpanded ? '▼' : '▶'}
                                    </button>
                                    <h4>${rack.name}</h4>
                                    <p>${filledSlots} / ${rack.boxSlots.length} boxes filled</p>
                                    ${shelf.racks.length > 1 ? `<button id="btn-remove-rack-${shelf.racks.indexOf(rack)}" class="btn-remove">Remove</button>` : ''}
                                  </div>

                                  ${rackExpanded ? `
                                    <div class="rack-grid">
                                      ${renderBoxGrid(rack, expandedBoxId)}
                                    </div>
                                  ` : ''}
                                </li>
                              `;
                            }).join('')}
                          </ul>
                        `}
                      ${shelf.racks.length < 6 ? `<button id="btn-add-rack" class="btn-add">+ Add Rack to ${shelf.name}</button>` : ''}
                    ` : ''}
                  </section>
                `;
              }).join('')}

          ${shelves.length < 4 ? `<button id="btn-add-shelf" class="btn-add">+ Add Shelf</button>` : ''}
        </section>
      </div>
    </div>
  `;
}

function renderBoxGrid(rack: FreezerRack, expandedBoxId: string | null): string {
  let html = '<div class="box-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 10px;">';

  for (let i = 0; i < rack.boxSlots.length; i++) {
    const slot = rack.boxSlots[i]!;
    const hasBox = slot.box !== null;

    if (hasBox) {
      const boxExpanded = expandedBoxId === slot.box!.id;
      html += `
        <div class="box-container" style="border: 2px solid #4CAF50; border-radius: 4px; overflow: hidden;">
          <button id="btn-toggle-box-${slot.box!.id}" class="btn-toggle" style="width: 100%; padding: 8px; background-color: #f0f0f0; border: none; cursor: pointer; text-align: left; font-weight: bold;">
            ${boxExpanded ? '▼' : '▶'} ${slot.box!.name} (${slot.box!.positions.length}/81)
          </button>
          ${boxExpanded ? `
            <div class="box-positions-grid" style="display: grid; grid-template-columns: repeat(9, 1fr); gap: 2px; padding: 8px; background-color: #fafafa;">
              ${renderPositionGrid(slot.box!, slot.row, slot.column)}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      html += `
        <div class="box-slot empty" id="box-slot-${slot.row}-${slot.column}" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border: 2px dashed #999; border-radius: 4px; background-color: #fafafa;">
          <button id="btn-add-box-${slot.row}-${slot.column}" class="btn-add" style="background: none; border: none; cursor: pointer; font-size: 24px; color: #999;">+</button>
        </div>
      `;
    }
  }

  html += '</div>';
  return html;
}

function renderPositionGrid(box: any, boxRow: number, boxCol: number): string {
  const grid = Array(81).fill(null);

  box.positions.forEach((pos: any) => {
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
      html += `
        <div id="pos-${pos.id}" style="width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; background-color: #4CAF50; border-radius: 2px; color: white; font-size: 10px; font-weight: bold; cursor: pointer;">
          ${label}
        </div>
      `;
    } else {
      html += `
        <div style="width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd; border-radius: 2px; background-color: white;">
          <button id="btn-add-sample-${boxRow}-${boxCol}-${row}-${col}" class="btn-add" style="background: none; border: none; cursor: pointer; font-size: 12px; color: #999; width: 100%; height: 100%;">+</button>
        </div>
      `;
    }
  }

  return html;
}

