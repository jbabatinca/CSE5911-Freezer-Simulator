import { getCurrentEditingLayout, setCurrentEditingLayout } from '../state/layoutState.js';
import { isNewLayoutModalOpen } from '../state/configurationState.js';
import { LayoutDashboard } from './LayoutDashboard.js';
import { FreezerEditor } from './FreezerEditor.js';
import { NewLayoutModal } from './NewLayoutModal.js';

export function ConfigurationModeView(): string {
  const editingLayout = getCurrentEditingLayout();
  const modalOpen = isNewLayoutModalOpen();
  
  if (editingLayout) {
    return FreezerEditor(editingLayout);
  } else {
    let html = LayoutDashboard();
    if (modalOpen) {
      html += NewLayoutModal();  // Add modal to the page
    }
    return html;
  }
}
