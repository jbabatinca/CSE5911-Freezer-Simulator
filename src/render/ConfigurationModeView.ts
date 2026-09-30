import { getCurrentEditingLayout, setCurrentEditingLayout } from '../state/layoutState.js';
import { isNewLayoutModalOpen } from '../state/configurationState.js';
import { LayoutDashboard } from './LayoutDashboard.js';
import { FreezerEditor } from './FreezerEditor.js';
import { NewLayoutModal } from './NewLayoutModal.js';

export function ConfigurationModeView(readOnly: boolean = false): string {
  const editingLayout = getCurrentEditingLayout();
  const modalOpen = isNewLayoutModalOpen();

  if (editingLayout) {
    return FreezerEditor(editingLayout, readOnly);
  } else {
    let html = LayoutDashboard(readOnly);
    if (modalOpen && !readOnly) {
      html += NewLayoutModal();  // Add modal to the page
    }
    return html;
  }
}
