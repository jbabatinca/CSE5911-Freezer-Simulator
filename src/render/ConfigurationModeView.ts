import { getCurrentEditingLayout, setCurrentEditingLayout } from '../state/layoutState.js';
import { isNewLayoutModalOpen } from '../state/configurationState.js';
import { LayoutDashboard } from './LayoutDashboard.js';
import { FreezerEditor } from './FreezerEditor.js';
import type { FreezerEditorOptions } from './FreezerEditor.js';
import { NewLayoutModal } from './NewLayoutModal.js';
import { getAllLayouts } from '../services/StorageService.js';
import { searchLayouts } from '../services/LayoutSearchService.js';
import { LayoutSearchButton, LayoutSearchView } from './LayoutSearchView.js';

export function ConfigurationModeView(readOnly: boolean = false, options: FreezerEditorOptions = {}): string {
  const editingLayout = getCurrentEditingLayout();
  const modalOpen = isNewLayoutModalOpen();

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
