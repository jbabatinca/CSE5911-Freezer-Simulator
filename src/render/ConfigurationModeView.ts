/**
 * ConfigurationModeView.ts - view for creating and editing freezer layouts.
 * Chooses between the layout dashboard (list of saved layouts) and the
 * FreezerEditor. Also reused read-only so regular users can browse layouts.
 */
import { getCurrentEditingLayout, setCurrentEditingLayout } from '../state/layoutState.js';
import { isNewLayoutModalOpen } from '../state/configurationState.js';
import { LayoutDashboard } from './LayoutDashboard.js';
import { FreezerEditor } from './FreezerEditor.js';
import type { FreezerEditorOptions } from './FreezerEditor.js';
import { NewLayoutModal } from './NewLayoutModal.js';
import { getAllLayouts } from '../services/StorageService.js';
import { searchLayouts } from '../services/LayoutSearchService.js';
import { LayoutSearchButton, LayoutSearchView } from './LayoutSearchView.js';

/**
 * Renders Configuration Mode: the editor if a layout is open, otherwise the layout dashboard.
 * @param readOnly when true, editing controls and the "new layout" modal are hidden (User Mode's layouts view)
 * @param options search state passed down from App.ts (searchQuery, selectedSearchKey, searchOpen),
 *                forwarded to the editor and to the dashboard's layout search panel
 * @returns HTML string for the main content area
 */
export function ConfigurationModeView(readOnly: boolean = false, options: FreezerEditorOptions = {}): string {
  const editingLayout = getCurrentEditingLayout();
  const modalOpen = isNewLayoutModalOpen();
  
  // A layout that is open for editing takes priority over the dashboard.
  if (editingLayout) {
    return FreezerEditor(editingLayout, readOnly, options);
  } else {
    const query = options.searchQuery ?? '';
    let html = LayoutDashboard(readOnly, LayoutSearchButton(options.searchOpen),
      LayoutSearchView(query, searchLayouts(getAllLayouts(), query), options.selectedSearchKey ?? null, true, options.searchOpen));
    if (modalOpen && !readOnly) {
      html += NewLayoutModal();  // Add modal to the page
    }
    return html;
  }
}
