import {getCurrentMode, setMode } from '../state/modeState.js';
import { HomeView } from './HomeView.js';
import { ConfigurationModeView } from './ConfigurationModeView.js';
import { TrainingModeView } from './TrainingModeView.js';
import { Navigation } from './Navigation.js';
import { openNewLayoutModal, closeNewLayoutModal } from '../state/configurationState.js';
import { createNewEmptyLayout, getCurrentEditingLayout, setCurrentEditingLayout } from '../state/layoutState.js';
import { deleteLayout, generateLayoutId, getLayout, saveLayout } from '../services/StorageService.js';
import type { SavedLayout } from '../models/SavedLayout.js';
import { 
  addShelf, removeShelf, 
  addRack, removeRack, 
  addBox, removeBox, 
  addSample, removeSample 
} from '../services/FreezerService.js';
import { 
  getExpandedShelfId, setExpandedShelfId,
  getExpandedRackId, setExpandedRackId,
  getExpandedBoxId, setExpandedBoxId
} from '../state/editorState.js';


export function App(): void {
    const app = document.getElementById('app');
    if (!app) return;

    render();

    function render(): void {
        if (!app) return;  // Add this check
        const mode = getCurrentMode();
        let html = '';


        //Show navigation on all screens except home
        if (mode !== 'home') {
            html += Navigation();
        }

        // Show content based on the current mode
        if (mode === 'home') {
            html += HomeView();
        } else if (mode === 'configuration') {
            html += ConfigurationModeView();
        } else if (mode === 'training') {
            html += TrainingModeView();
        }

        app.innerHTML = html;
        attachEventListeners();
    }

    function attachEventListeners(): void {
        // Home screen buttons
        const btnConfiguration = document.getElementById('btn-configuration');
        const btnTraining = document.getElementById('btn-training');

        // Navigation button
        const btnHome = document.getElementById('btn-home');

        if (btnConfiguration) {
            btnConfiguration.addEventListener('click', () => {
                setMode('configuration');
                render();
            });
        }

        if (btnTraining) {
            btnTraining.addEventListener('click', () => {
                setMode('training');
                render();
            });
        }

        if (btnHome) {
            btnHome.addEventListener('click', () => {
                setMode('home');
                render();
            });
        }

        // Configuration mode - New Layout button
        const btnNewLayout = document.getElementById('btn-new-layout');
        if (btnNewLayout) {
            btnNewLayout.addEventListener('click', () => {
                openNewLayoutModal();
                render();
            });
        }

        // Configuration mode - Modal close button
        const btnCloseModal = document.getElementById('btn-close-modal');
        if (btnCloseModal) {
            btnCloseModal.addEventListener('click', () => {
                closeNewLayoutModal();
                render();
            });
        }

        // Configuration mode - Create New button
        const btnCreateNew = document.getElementById('btn-create-new');
        if (btnCreateNew) {
            btnCreateNew.addEventListener('click', () => {
                // Create new empty layout
                const newLayout = createNewEmptyLayout();
                setCurrentEditingLayout(newLayout);
                closeNewLayoutModal();
                render();
            });
        }

        // Configuration mode - Upload button
        const btnUpload = document.getElementById('btn-upload');
        if (btnUpload) {
            btnUpload.addEventListener('click', () => {
                // Create hidden file input
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.json';
                
                fileInput.addEventListener('change', (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    
                    // Read the file
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const json = JSON.parse(event.target?.result as string);
                            
                            // Validate it has the required freezer structure
                            if (!json.schemaVersion || !json.id || !json.name || !json.shelves) {
                                alert('Invalid freezer layout file');
                                return;
                            }
                            
                            // Create SavedLayout from uploaded data
                            const uploadedLayout: SavedLayout = {
                                id: generateLayoutId(),
                                name: json.name,
                                freezerData: json,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };
                            
                            // Open in editor
                            setCurrentEditingLayout(uploadedLayout);
                            closeNewLayoutModal();
                            render();
                        } catch (error) {
                            alert('Error reading file: ' + error);
                        }
                    };
                    reader.readAsText(file);
                });
                
                // Trigger file picker
                fileInput.click();
            });
        }


        // Configuration mode - Save button in FreezerEditor
        const btnSave = document.getElementById('btn-save');
        if (btnSave) {
            btnSave.addEventListener('click', () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) {
                    console.log('No layout to save');
                    return;
                }
                
                // Get updated name from input
                const nameInput = document.getElementById('layout-name-input') as HTMLInputElement;
                if (nameInput) {
                    currentLayout.name = nameInput.value || 'Unnamed Layout';
                }
                
                // Update timestamp
                currentLayout.updatedAt = new Date().toISOString();
                
                // Save to localStorage
                console.log('Saving layout:', currentLayout);  // Debug log
                saveLayout(currentLayout);
                
                // Check if it saved
                const saved = getLayout(currentLayout.id);
                console.log('Verified saved:', saved);  // Debug log
                
                alert('Layout saved!');
                render();
            });
        }

        // FreezerEditor - Download button
        const btnDownload = document.getElementById('btn-download');
        if (btnDownload) {
            btnDownload.addEventListener('click', () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                
                // Convert to JSON
                const json = JSON.stringify(currentLayout.freezerData, null, 2);
                
                // Create download link
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${currentLayout.name}.json`;
                link.click();
                URL.revokeObjectURL(url);
            });
        }

        // FreezerEditor - Delete button
        const btnDelete = document.getElementById('btn-delete');
        if (btnDelete) {
            btnDelete.addEventListener('click', () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                
                if (confirm(`Delete "${currentLayout.name}"? This cannot be undone.`)) {
                    deleteLayout(currentLayout.id);
                    setCurrentEditingLayout(null);
                    render();  // Re-render to show updated dashboard
                }
            });
        }

        // FreezerEditor - Back to Layouts button
        const btnBackToLayouts = document.getElementById('btn-back-to-layouts');
        if (btnBackToLayouts) {
            btnBackToLayouts.addEventListener('click', () => {
                setCurrentEditingLayout(null);  // Clear editing
                render();  // Show dashboard
            });
        }
        // Configuration mode - Any New Layout button (multiple could exist)
        document.querySelectorAll('[id^="btn-new-layout"], [id^="btn-add-layout"]').forEach(btn => {
        btn.addEventListener('click', () => {
            openNewLayoutModal();
            render();
        });
        });

        // Configuration mode - Click on existing layout to open in editor
        document.querySelectorAll('[id^="layout-"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const layoutId = btn.id.replace('layout-', '');
            const layout = getLayout(layoutId);
            if (layout) {
            setCurrentEditingLayout(layout);
            render();
            }
        });
        });

        // ===== SHELF BUTTONS =====
        const btnAddShelf = document.getElementById('btn-add-shelf');
        if (btnAddShelf) {
            btnAddShelf.addEventListener('click', () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                addShelf(currentLayout);
                render();
            });
        }

        // Toggle Shelf
        document.querySelectorAll('[id^="btn-toggle-shelf-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const shelfId = btn.id.replace('btn-toggle-shelf-', '');
                const isExpanded = getExpandedShelfId() === shelfId;
                setExpandedShelfId(isExpanded ? null : shelfId);
                render();
            });
        });

        // Remove Shelf
        document.querySelectorAll('[id^="btn-remove-shelf-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.id.replace('btn-remove-shelf-', ''));
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout || !confirm('Remove shelf?')) return;
                removeShelf(currentLayout, index);
                render();
            });
        });

        // ===== RACK BUTTONS =====
        const btnAddRack = document.getElementById('btn-add-rack');
        if (btnAddRack) {
            btnAddRack.addEventListener('click', () => {
                const currentLayout = getCurrentEditingLayout();
                const expandedShelfId = getExpandedShelfId();
                if (!currentLayout || !expandedShelfId) return;
                addRack(currentLayout, expandedShelfId);
                render();
            });
        }

        // Toggle Rack
        document.querySelectorAll('[id^="btn-toggle-rack-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const rackId = btn.id.replace('btn-toggle-rack-', '');
                const isExpanded = getExpandedRackId() === rackId;
                setExpandedRackId(isExpanded ? null : rackId);
                render();
            });
        });

        // Remove Rack
        document.querySelectorAll('[id^="btn-remove-rack-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.id.replace('btn-remove-rack-', ''));
                const currentLayout = getCurrentEditingLayout();
                const expandedShelfId = getExpandedShelfId();
                if (!currentLayout || !expandedShelfId || !confirm('Remove rack?')) return;
                
                // Find shelf index
                const shelfIndex = currentLayout.freezerData.shelves.findIndex(s => s.id === expandedShelfId);
                if (shelfIndex >= 0) {
                    removeRack(currentLayout, shelfIndex, index);
                }
                render();
            });
        });

        // ===== BOX BUTTONS =====
        // Add Box
        document.querySelectorAll('[id^="btn-add-box-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const coords = btn.id.replace('btn-add-box-', '').split('-');
                const row = parseInt(coords[0]!);
                const column = parseInt(coords[1]!);
                const currentLayout = getCurrentEditingLayout();
                const expandedShelfId = getExpandedShelfId();
                const expandedRackId = getExpandedRackId();
                if (!currentLayout || !expandedShelfId || !expandedRackId) return;
                
                const shelfIndex = currentLayout.freezerData.shelves.findIndex(s => s.id === expandedShelfId);
                const rackIndex = currentLayout.freezerData.shelves[shelfIndex]?.racks.findIndex(r => r.id === expandedRackId) ?? -1;
                
                if (shelfIndex >= 0 && rackIndex >= 0) {
                    addBox(currentLayout, shelfIndex, rackIndex, row, column);
                }
                render();
            });
        });

        // Toggle Box
        document.querySelectorAll('[id^="btn-toggle-box-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const boxId = btn.id.replace('btn-toggle-box-', '');
                const isExpanded = getExpandedBoxId() === boxId;
                setExpandedBoxId(isExpanded ? null : boxId);
                render();
            });
        });

        // Remove Box
        document.querySelectorAll('[id^="btn-remove-box-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.id.replace('btn-remove-box-', ''));
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                
                // This is tricky - we need to find which box was removed
                // For now, use the expanded shelf/rack and find the box
                // TODO: Better way to track box position
            });
        });

        // ===== SAMPLE BUTTONS =====
        // Add Sample
        document.querySelectorAll('[id^="btn-add-sample-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const coords = btn.id.replace('btn-add-sample-', '').split('-');
                const boxRow = parseInt(coords[0]!);
                const boxCol = parseInt(coords[1]!);
                const sampleRow = parseInt(coords[2]!);
                const sampleCol = parseInt(coords[3]!);
                const currentLayout = getCurrentEditingLayout();
                const expandedShelfId = getExpandedShelfId();
                const expandedRackId = getExpandedRackId();

                if (!currentLayout || !expandedShelfId || !expandedRackId) return;

                const shelfIndex = currentLayout.freezerData.shelves.findIndex(s => s.id === expandedShelfId);
                const rackIndex = currentLayout.freezerData.shelves[shelfIndex]?.racks.findIndex(r => r.id === expandedRackId) ?? -1;

                if (shelfIndex >= 0 && rackIndex >= 0) {
                    addSample(currentLayout, shelfIndex, rackIndex, boxRow, boxCol, sampleRow, sampleCol);
                    render();
                }
            });
        });

        // Remove Sample
        document.querySelectorAll('[id^="btn-remove-sample-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const sampleId = btn.id.replace('btn-remove-sample-', '');
                // TODO: Remove sample logic
            });
        });

    }
}
