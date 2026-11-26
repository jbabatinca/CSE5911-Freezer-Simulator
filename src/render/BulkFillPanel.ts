import type { SavedLayout } from '../models/SavedLayout.js';
import { FREEZER_LAYOUT_LIMITS } from '../models/freezerLayout.js';
import { positionLabel, currentNames } from '../services/BulkFillService.js';
import { getBulkFill } from '../state/BulkFillState.js';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]!);
}

export function BulkFillPanel(layout: SavedLayout): string {
  const s = getBulkFill();
  if (!s.open) return '';
  const shelves = layout.freezerData.shelves;
  const racks = shelves[s.shelfIndex]?.racks ?? [];
  const boxes = racks[s.rackIndex]?.boxSlots.filter(slot => slot.box).map(slot => slot.box!) ?? [];
  const isRack = s.tab === 'rack';
  const rows = isRack ? FREEZER_LAYOUT_LIMITS.rackRows : FREEZER_LAYOUT_LIMITS.boxRows;
  const cols = isRack ? FREEZER_LAYOUT_LIMITS.rackColumns : FREEZER_LAYOUT_LIMITS.boxColumns;

  const option = (value: string | number, label: string, selected: boolean) =>
    `<option value="${value}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`;

  const current = currentNames(layout, s.tab, s.shelfIndex, s.rackIndex, s.boxId);

  let grid = `<div class="bulk-fill-grid" style="grid-template-columns: 2rem repeat(${cols}, 1fr)"><span></span>`;
  for (let c = 1; c <= cols; c++) grid += `<span class="bulk-fill-head">${c}</span>`;
  for (let r = 1; r <= rows; r++) {
    grid += `<span class="bulk-fill-head">${String.fromCharCode(64 + r)}</span>`;
    for (let c = 1; c <= cols; c++) {
      const value = s.cells[`${r}-${c}`] ?? current[`${r}-${c}`] ?? '';
      grid += `<input class="bulk-fill-cell" data-row="${r}" data-column="${c}"
                 aria-label="${positionLabel(r, c)}" placeholder="${positionLabel(r, c)}"
                 value="${escapeHtml(value)}">`;
    }
  }
  grid += '</div>';

  const targetName = isRack ? (racks[s.rackIndex]?.name ?? 'rack') : (boxes.find(b => b.id === s.boxId)?.name ?? 'box');

  return `
    <section class="bulk-fill-panel" aria-label="Bulk fill">
      <div class="bulk-fill-tabs">
        <button id="btn-bulk-tab-rack" aria-pressed="${isRack}">Fill rack with boxes</button>
        <button id="btn-bulk-tab-box" aria-pressed="${!isRack}">Fill box with samples</button>
        <button id="btn-bulk-close" aria-label="Close bulk fill">✕</button>
      </div>
      <div class="bulk-fill-targets">
        <label>Shelf <select id="bulk-shelf">${shelves.map((sh, i) => option(i, sh.name ?? `Shelf ${i + 1}`, i === s.shelfIndex)).join('')}</select></label>
        <label>Rack <select id="bulk-rack">${racks.map((rk, i) => option(i, rk.name, i === s.rackIndex)).join('')}</select></label>
        ${isRack ? '' : `<label>Box <select id="bulk-box">${boxes.map(b => option(b.id, b.name, b.id === s.boxId)).join('')}</select></label>`}
      </div>
      ${grid}
      <div class="bulk-fill-actions">
        <button id="btn-bulk-clear">Clear</button>
        <button id="btn-bulk-apply" class="btn-primary">Update ${escapeHtml(targetName)}</button>      </div>
    </section>`;
}
