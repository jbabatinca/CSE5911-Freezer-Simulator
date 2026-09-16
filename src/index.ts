import freezerData from './data/sample-freezer-layout.json';
import type { FreezerLayout } from './models/freezerLayout';

const layout: FreezerLayout = freezerData as FreezerLayout;

console.log("Freezer Navigation app started!");
console.log("Loaded freezer:", layout.name);

const app = document.getElementById('app');
if (app) {
  let html = `<h2>${layout.name}</h2>`;
  html += `<p>ID: ${layout.id}</p>`;
  html += `<p>Schema: ${layout.schemaVersion}</p>`;

  layout.shelves.forEach((shelf, shelfIdx) => {
    html += `<h3>Shelf ${shelfIdx + 1}: ${shelf.name}</h3>`;

    shelf.racks.forEach((rack, rackIdx) => {
      const filledSlots = rack.boxSlots.filter(s => s.box !== null).length;
      html += `<p>Rack ${rackIdx + 1}: ${rack.name} (${filledSlots}/16 boxes filled)</p>`;

      html += `<ul>`;
      rack.boxSlots.forEach(slot => {
        const label = slot.box ? slot.box.name : 'empty';
        html += `<li>[${slot.row},${slot.column}] ${label}</li>`;
      });
      html += `</ul>`;
    });
  });

  app.innerHTML = html;
}
