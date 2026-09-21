import freezerData from './data/sample-freezer-layout.json';
import type { FreezerLayout } from './models/freezerLayout';

const layout: FreezerLayout = freezerData as FreezerLayout;

const app = document.getElementById('app');
if (app) {
  const title = document.createElement('h2');
  title.id = 'freezer-title';
  title.textContent = layout.name;

  const description = document.createElement('p');
  description.textContent = 'Front view — shelves are shown from top to bottom.';

  const freezer = document.createElement('section');
  freezer.className = 'freezer';
  freezer.setAttribute('aria-labelledby', title.id);

  for (const shelf of layout.shelves) {
    const shelfView = document.createElement('section');
    shelfView.className = 'shelf';
    shelfView.setAttribute('aria-label', shelf.name);

    const shelfTitle = document.createElement('h3');
    shelfTitle.textContent = shelf.name;
    shelfView.append(shelfTitle);

    const racks = document.createElement('ul');
    racks.className = 'racks';

    for (const rack of shelf.racks) {
      const rackView = document.createElement('li');
      rackView.className = 'rack';

      const rackTitle = document.createElement('h4');
      rackTitle.textContent = rack.name;

      const occupancy = document.createElement('p');
      const filledSlots = rack.boxSlots.filter(slot => slot.box !== null).length;
      occupancy.textContent = `${filledSlots} / ${rack.boxSlots.length} boxes filled`;

      rackView.append(rackTitle, occupancy);
      racks.append(rackView);
    }

    if (shelf.racks.length === 0) {
      const emptyShelf = document.createElement('p');
      emptyShelf.textContent = 'No racks on this shelf.';
      shelfView.append(emptyShelf);
    } else {
      shelfView.append(racks);
    }

    freezer.append(shelfView);
  }

  if (layout.shelves.length === 0) {
    const emptyFreezer = document.createElement('p');
    emptyFreezer.textContent = 'No shelves in this freezer.';
    freezer.append(emptyFreezer);
  }

  app.replaceChildren(title, description, freezer);
}
