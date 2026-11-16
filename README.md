# CSE5911-Capstone-Project
Web-based freezer navigation and training simulator for research laboratory staff and student workers.

Run locally with `npm install`, then `npm start`. Open the localhost URL printed
in the terminal and keep the server running while using the app. Stop it with
Ctrl+C.

The development server uses `.parcel-dev` so production builds in `dist` do not
overwrite its assets. `npm run build` generates the GitHub Pages build with its
deployment-specific URL prefix.

User Mode includes a Training Mode picker for saved question sets, with answer
checking, three-miss reveals, scoring, restart, and changing sets. See
[Training Mode](docs/training-mode.md) for the rules, shared target resolver, and
verification commands.

## Layout search

In **User Mode → Layout View**, search across all saved layouts by layout,
freezer, shelf, rack, box, or sample name, or by a position such as A1. Click the
**Search** button at the top to open the search bar (beside **Download** and
**Export to PDF** inside a layout). Enter all or part of a name, then select
**Find** or press Enter. Search ignores capitalization and surrounding spaces.
Click **Search** again, the close button, or press Escape in the search panel to
hide it. Closing and reopening preserves the current search and highlighting.

Results show their type and full location, starting with the layout name. Select
a result to open its layout, expand its path, highlight the item and its ancestors,
and focus the item. Samples stored in multiple positions have a result for each
location. Searching inside an open layout covers that layout only. **Clear**
removes the search and highlighting; leaving the layout resets the search.
Training questions and PDF exports keep their existing behavior.

## Application themes

- Use the **sun** icon in the application header to switch to **Light Mode**.
- Use the **moon** icon to switch to **Dark Mode**.
- The active theme's icon is highlighted.
- Your selected preference is saved in browser storage and restored after reloading.
- Light Mode is the default for new visits and older System preferences.
- System Mode is not available; device/browser theme changes do not change your selection.
- Theme switching still works when browser storage is unavailable, but the preference cannot be saved.
- Themes apply across home screens, navigation, dialogs, forms, freezer layouts, question sets, and training results.
- Switching themes during training preserves progress and keeps expanded racks and boxes open.

## Testing

Run unit and integration tests with `npm test -- --run`.

For browser regression tests, install Chromium once with
`npx playwright install chromium`, then run `npm run test:browser`.
The runner starts the app automatically and checks the training workflow,
Ohio State theme, physical freezer grids, saved colors, and page overflow in
light and dark mode at 360px and 1100px. To use an installed Chrome or Edge
instead, set `PLAYWRIGHT_CHANNEL` to `chrome` or `msedge`.
