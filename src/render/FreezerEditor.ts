import type { SavedLayout } from '../models/SavedLayout.js';
import { 
  getExpandedShelfId, 
  getExpandedRackId, 
  getExpandedBoxId 
} from '../state/editorState.js';
import type { FreezerShelf, FreezerRack, FreezerBox } from '../models/freezerLayout.js';

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
        <div class="shelves-section">
          <h3>Shelves (${shelves.length}/4)</h3>
          ${renderShelves(shelves, expandedShelfId, expandedRackId, expandedBoxId)}
          ${shelves.length < 4 ? `<button id="btn-add-shelf" class="btn-add">+ Add Shelf</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderShelves(shelves: FreezerShelf[], expandedShelfId: string | null, expandedRackId: string | null, expandedBoxId: string | null): string {
  return shelves.map((shelf, idx) => `
    <div class="shelf" id="shelf-${shelf.id}">
      <div class="shelf-header">
        <button id="btn-toggle-shelf-${shelf.id}" class="btn-toggle">
          ${expandedShelfId === shelf.id ? '▼' : '▶'} ${shelf.name} (${shelf.racks.length}/6 racks)
        </button>
        <button id="btn-remove-shelf-${idx}" class="btn-remove">Remove</button>
      </div>
      
      ${expandedShelfId === shelf.id ? renderRacks(shelf.racks, expandedRackId, expandedBoxId) : ''}
    </div>
  `).join('');
}

function renderRacks(racks: FreezerRack[], expandedRackId: string | null, expandedBoxId: string | null): string {
  return `
    <div class="racks-section">
      <div class="racks-row">
        ${racks.map((rack, idx) => `
          <div class="rack" id="rack-${rack.id}">
            <button id="btn-toggle-rack-${rack.id}" class="btn-toggle">
              ${expandedRackId === rack.id ? '▼' : '▶'} ${rack.name} (${rack.boxSlots.filter(s => s.box).length}/16)
            </button>
            <button id="btn-remove-rack-${idx}" class="btn-remove">Remove</button>
            
            ${expandedRackId === rack.id ? renderBoxGrid(rack.boxSlots, expandedBoxId) : ''}
          </div>
        `).join('')}
        
        ${racks.length < 6 ? `<button id="btn-add-rack" class="btn-add">+ Add Rack</button>` : ''}
      </div>
    </div>
  `;
}

function renderBoxGrid(boxSlots: any[], expandedBoxId: string | null): string {
  return `
    <div class="boxes-grid-section">
      <div class="boxes-grid">
        ${boxSlots.map((slot, idx) => `
          <div class="box-slot" id="box-slot-${slot.row}-${slot.column}">
            ${slot.box ? `
              <div class="box" id="box-${slot.box.id}">
                <button id="btn-toggle-box-${slot.box.id}" class="btn-toggle">
                  ${expandedBoxId === slot.box.id ? '▼' : '▶'} ${slot.box.name}
                </button>
                <button id="btn-remove-box-${idx}" class="btn-remove">Remove</button>
                
                ${expandedBoxId === slot.box.id ? renderSampleGrid(slot.box.positions) : ''}
              </div>
            ` : `
              <div class="empty-slot">
                <button id="btn-add-box-${slot.row}-${slot.column}" class="btn-add">+ Add Box</button>
              </div>
            `}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderSampleGrid(positions: any[]): string {
  const grid = Array(81).fill(null); // 9x9 = 81 positions
  
  // Mark which positions have samples
  positions.forEach(pos => {
    const idx = (pos.row - 1) * 9 + (pos.column - 1);
    grid[idx] = pos;
  });

  return `
    <div class="samples-grid">
      ${grid.map((pos, idx) => {
        const row = Math.floor(idx / 9) + 1;
        const col = (idx % 9) + 1;
        const label = String.fromCharCode(64 + row) + col; // A1, A2, etc.
        
        if (pos) {
          return `
            <div class="sample" id="sample-${pos.id}">
              ${pos.label}
              <button id="btn-remove-sample-${pos.id}" class="btn-remove">X</button>
            </div>
          `;
        } else {
          return `
            <div class="empty-sample">
              <button id="btn-add-sample-${row}-${col}" class="btn-add">+</button>
            </div>
          `;
        }
      }).join('')}
    </div>
  `;
}

