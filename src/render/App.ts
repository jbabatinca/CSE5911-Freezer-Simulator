/**
 * App.ts - the main application controller and the biggest file in the UI.
 * App() draws the whole screen for the current Mode (see state/modeState.ts) into the
 * #app element, then attaches click/input handlers to the freshly drawn elements.
 * Pattern used throughout: change some state -> call render() -> the page is rebuilt.
 * Buttons are found by element id (e.g. "btn-add-shelf") or data-* attribute; ids that
 * carry a payload use a prefix, e.g. "btn-toggle-shelf-<id>" or "btn-add-box-<row>-<col>".
 */
import {getCurrentMode, setMode, getShowAdminPasswordModal, setShowAdminPasswordModal, getShowAdminSettingsModal, setShowAdminSettingsModal, goBack } from '../state/modeState.js';
import { HomeView } from './HomeView.js';
import { AdminModeHomeView } from './AdminModeHomeView.js';
import { UserModeHomeView } from './UserModeHomeView.js';
import { ConfigurationModeView } from './ConfigurationModeView.js';
import { TutorialTrainingModeView, startTrainingTutorial, answerTrainingTarget, toggleTrainingRack, toggleTrainingBox } from './TutorialTrainingModeView.js';
import {
    QuestionSetCreatorView,
    startQuestionSetCreation,
    editQuestionSet,
    cancelQuestionSetEditing,
    setQuestionSetName,
    setQuestionSetDescription,
    setQuestionSetTimeLimit,
    formatTimeLimitSeconds,
    setQuestionSetLayout,
    addQuestionToSet,
    toggleQuestionEditor,
    updateQuestionInSet,
    removeQuestionFromSet,
    moveQuestionInSet,
    saveQuestionSetDraft,
    removeSavedQuestionSet
} from './QuestionSetCreatorView.js';
import { advanceQuestionSetRun, refreshQuestionSetTimer, renderUserQuestionSetView, startQuestionSetRun, submitQuestionSetAnswer, toggleUserQuestionSetBox, toggleUserQuestionSetRack } from './QuestionSetRunView.js';
import { Navigation } from './Navigation.js';
import { AdminPasswordModal } from './AdminPasswordModal.js';
import { AdminSettingsModal } from './AdminSettingsModal.js';
import { openNewLayoutModal, closeNewLayoutModal } from '../state/configurationState.js';
import { createNewEmptyLayout, getCurrentEditingLayout, setCurrentEditingLayout } from '../state/layoutState.js';
import { deleteLayout, generateLayoutId, getAllLayouts, getLayout, saveLayout } from '../services/StorageService.js';
import type { SavedLayout } from '../models/SavedLayout.js';
import type { FreezerShelf } from '../models/freezerLayout.js';
import type { QuestionTargetType } from '../models/QuestionSet.js';
import { 
  addShelf, removeShelf, 
        addRack, removeRack, renameRack, setRackColor,
    addBox, removeBox, setBoxColor,
    assignSampleToPosition, renameBox, renameSample, removeSampleFromPosition
} from '../services/FreezerService.js';
import {
  getExpandedShelfIds, setExpandedShelfId, expandShelves, collapseShelf,
  getExpandedRackId, setExpandedRackId,
  getExpandedBoxId, setExpandedBoxId
} from '../state/editorState.js';
import { validateFreezerLayout } from '../services/LayoutValidator.js';
import { FreezerEditor, type ExportLayout } from './FreezerEditor.js';
import { ProgressHistoryView } from './ProgressHistoryView.js';
import { clearAttempts } from '../services/AttemptHistoryService.js';
import { initializeAuth, isAdminAuthenticated, authenticateAdmin, logout, switchToUserMode, changeAdminPassword } from '../state/authState.js';
import { searchLayouts } from '../services/LayoutSearchService.js';
import { getExportLayoutPreference, setExportLayoutPreference } from '../state/exportState.js';
import { moveRack, moveBox, pasteShelf, pasteRack, pasteBox } from '../services/FreezerService.js';
import { getClipboard, setClipboard } from '../state/editorState.js';

function getRackIndexes(button: Element): { shelfIndex: number; rackIndex: number } {
    return {
        shelfIndex: Number(button.closest('[data-shelf-index]')?.getAttribute('data-shelf-index') ?? -1),
        rackIndex: Number(button.closest('[data-rack-index]')?.getAttribute('data-rack-index') ?? -1),
    };
}

function closeShelf(shelf: FreezerShelf): void {
    collapseShelf(shelf.id);
    if (shelf.racks.some(rack => rack.id === getExpandedRackId())) setExpandedRackId(null);
}

/**
 * Opens a small modal <dialog> asking the user to type a name (used for renaming and naming new items).
 * @param title heading text; @param label text for the input label; @param submitLabel text on the save button
 * @param initialValue pre-filled (and pre-selected) text, default empty
 * @returns a Promise resolving to the trimmed name, or null if the user cancels or submits an empty name.
 * A custom dialog is used instead of window.prompt() so it can be styled and made accessible.
 */
function requestName(title: string, label: string, submitLabel: string, initialValue = ''): Promise<string | null> {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'name-entry-dialog';
        dialog.innerHTML = `
            <form class="name-entry-form">
                <h2>${title}</h2>
                <label for="name-entry-input">${label}</label>
                <input id="name-entry-input" name="name" type="text" maxlength="120" required autofocus>
                <div class="name-entry-actions">
                    <button type="button" class="btn-cancel">Cancel</button>
                    <button type="submit" class="btn-save">${submitLabel}</button>
                </div>
            </form>
        `;

        const form = dialog.querySelector('form')!;
        const input = dialog.querySelector('input')!;
        input.value = initialValue;
        form.addEventListener('submit', event => {
            event.preventDefault();
            const name = input.value.trim();
            if (name) dialog.close(name);
        });
        dialog.querySelector('.btn-cancel')!.addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => {
            const name = dialog.returnValue.trim();
            dialog.remove();
            resolve(name || null);
        }, { once: true });

        document.body.append(dialog);
        dialog.showModal();
        input.focus();
        if (initialValue) input.select();
    });
}

/** Opens a modal asking which PDF layout to use; resolves to the choice, or null if cancelled. */
function requestExportLayout(initial: ExportLayout): Promise<ExportLayout | null> {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'name-entry-dialog';
        dialog.innerHTML = `
            <form class="name-entry-form">
                <h2>Export to PDF</h2>
                <label><input type="radio" name="export-layout" value="current"${initial === 'current' ? ' checked' : ''}> Current layout</label>
                <label><input type="radio" name="export-layout" value="shelf-pages"${initial === 'shelf-pages' ? ' checked' : ''}> One shelf per page</label>
                <div class="name-entry-actions">
                    <button type="button" class="btn-cancel">Cancel</button>
                    <button type="submit" class="btn-save">Export</button>
                </div>
            </form>
        `;
        const form = dialog.querySelector('form')!;
        form.addEventListener('submit', event => {
            event.preventDefault();
            dialog.close(new FormData(form).get('export-layout') === 'shelf-pages' ? 'shelf-pages' : 'current');
        });
        dialog.querySelector('.btn-cancel')!.addEventListener('click', () => dialog.close());
        dialog.addEventListener('close', () => {
            const value = dialog.returnValue;
            dialog.remove();
            resolve(value === 'current' || value === 'shelf-pages' ? value : null);
        }, { once: true });
        document.body.append(dialog);
        dialog.showModal();
    });
}

/**
 * Starts the app: loads saved auth state, draws the first screen, and starts the
 * timer that keeps a running question set's countdown live.
 * Takes no arguments and returns nothing. Does nothing if there is no #app element.
 * Everything else (render, attachEventListeners) is nested here so it can share
 * the `app` element and the selected-question-set variable.
 */
export function App(): void {
    const app = document.getElementById('app');
    if (!app) return;
    // Which saved question set the user has opened (null = none). Only lives for this session.
    let selectedUserQuestionSetId: string | null = null;
    let searchLayout: SavedLayout | null = null;
    let searchMode: 'configuration' | 'freezer-layouts' | null = null;
    let layoutSearchQuery = '';
    let selectedSearchKey: string | null = null;
    let layoutSearchOpen = false;

    initializeAuth();
    render();

    // Keeps the custom-training countdown live and restarts the set when it expires.
    // Polls every 250 ms; only re-renders when refreshQuestionSetTimer() reports a change.
    window.setInterval(() => {
        if (getCurrentMode() !== 'question-set-user') return;
        if (refreshQuestionSetTimer()) {
            render();
            document.getElementById('question-set-feedback')?.focus();
        }
    }, 250);

    // ----- drag/drop + cut/copy/paste helpers -----
    let dragging: { kind: 'rack'; id: string; shelfId: string }
        | { kind: 'box'; rackId: string; row: number; column: number }
        | null = null;

    function showEditorMessage(message: string): void {
        const el = document.getElementById('editor-message');
        if (el) el.textContent = message;
        else alert(message);
    }

    // Saves and re-renders after a successful move/paste; shows the message (and changes nothing) otherwise.
    function finishEdit(result: { ok: boolean; message?: string }, layout: SavedLayout): void {
        if (!result.ok) { showEditorMessage(result.message ?? 'That action is not allowed.'); return; }
        layout.updatedAt = new Date().toISOString();
        saveLayout(layout);
        render();
    }

    // Where the mouse currently is, stored as ids (not elements) because render() replaces the DOM.
    let hover: { shelfId?: string; rackId?: string; row?: number; column?: number } = {};
    document.addEventListener('mouseover', event => {
        const el = event.target as HTMLElement;
        const slotEl = el.closest<HTMLElement>('.box-slot.empty[data-row]');
        hover = {
            ...(el.closest<HTMLElement>('[data-shelf-id]') ? { shelfId: el.closest<HTMLElement>('[data-shelf-id]')!.dataset.shelfId! } : {}),
            ...(el.closest<HTMLElement>('[data-rack-id]') ? { rackId: el.closest<HTMLElement>('[data-rack-id]')!.dataset.rackId! } : {}),
            ...(slotEl ? { row: Number(slotEl.dataset.row), column: Number(slotEl.dataset.column) } : {})
        };
    });

    function pasteFromClipboard(): void {
        const target = getCurrentEditingLayout();
        const clip = getClipboard();
        if (!target || !clip) return;

        // The item may come from another freezer; load that layout from storage.
        const source = clip.layoutId === target.id ? target : getLayout(clip.layoutId);
        if (!source) { showEditorMessage('The freezer you copied from no longer exists.'); return; }

        const expandedShelves = getExpandedShelfIds();
        const shelfId = hover.shelfId ?? (expandedShelves.size === 1 ? expandedShelves.values().next().value : undefined);
        let result;
        if (clip.kind === 'shelf') {
            if (!shelfId) { showEditorMessage('Hover over the shelf you want to paste onto. Create one first with + Add Shelf.'); return; }
            const destination = target.freezerData.shelves.find(s => s.id === shelfId);
            if (destination && destination.racks.length > 0 && !confirm(`Replace everything on "${destination.name}"?`)) return;
            result = pasteShelf(source, target, clip.id, shelfId, clip.mode);
        } else if (clip.kind === 'rack') {
            if (!shelfId) { showEditorMessage('Hover over the shelf you want to paste into.'); return; }
            result = pasteRack(source, target, shelfId, clip.id, clip.mode);
        } else {
            const rackId = hover.rackId ?? getExpandedRackId();
            if (!rackId) { showEditorMessage('Hover over the rack you want to paste into.'); return; }
            result = pasteBox(source, target, rackId, clip.id, clip.mode, hover.row, hover.column);
        }

        if (result.ok) {
            if (clip.mode === 'cut') setClipboard(null);   // a cut can only be pasted once
            if (source !== target) {                       // a cut removed it from the other freezer, so save that one too
                source.updatedAt = new Date().toISOString();
                saveLayout(source);
            }
        }
        finishEdit(result, target);
    }


    // Remember the last clicked box/rack/shelf. Focus can't be used: render() rebuilds the DOM and drops it.
    let selectedItem: { kind: 'shelf' | 'rack' | 'box'; id: string } | null = null;
    document.addEventListener('click', event => {
        const el = event.target as HTMLElement;
        if (el.closest('input, textarea, select, .btn-remove, .btn-remove-box')) return;
        const boxEl = el.closest<HTMLElement>('[data-box-id]');
        const rackEl = el.closest<HTMLElement>('[data-rack-id]');
        const shelfEl = el.closest<HTMLElement>('[data-shelf-id]');
        selectedItem = boxEl ? { kind: 'box', id: boxEl.dataset.boxId! }
                     : rackEl ? { kind: 'rack', id: rackEl.dataset.rackId! }
                     : shelfEl ? { kind: 'shelf', id: shelfEl.dataset.shelfId! } : null;
    }, true);

    document.addEventListener('keydown', event => {
        if (!(event.ctrlKey || event.metaKey)) return;
        const key = event.key.toLowerCase();
        if (key !== 'x' && key !== 'c' && key !== 'v') return;
        const active = document.activeElement as HTMLElement | null;
        if (active?.matches('input, textarea, select, [contenteditable="true"]')) return;  // keep normal text copy/paste
        if (!document.getElementById('btn-save')) return;                                  // only in the editable editor

        if (key === 'v') {
            if (!getClipboard()) return;
            event.preventDefault();
            pasteFromClipboard();
            return;
        }

        // Cut/copy act on the last clicked box, else rack, else shelf.
        const layoutId = getCurrentEditingLayout()?.id;
        const target = selectedItem;
        if (!target || !layoutId) return;
        event.preventDefault();
        setClipboard({ ...target, mode: key === 'x' ? 'cut' : 'copy', layoutId });
        showEditorMessage(
            target.kind === 'shelf'
                ? `${key === 'x' ? 'Cut' : 'Copied'} shelf contents. Hover over another shelf and press Ctrl+V to paste onto it.`
                : `${key === 'x' ? 'Cut' : 'Copied'} ${target.kind}. Expand the destination and press Ctrl+V.`
        );
    });

    // Rebuilds the entire page HTML for the current mode and re-attaches listeners.
    // The whole #app is replaced each time, so listeners must be re-added every render.
    function render(): void {
        if (!app) return;
        const mode = getCurrentMode();
        const isAdmin = isAdminAuthenticated();
        const activeSearchMode = mode === 'freezer-layouts' || (mode === 'configuration' && isAdmin) ? mode : null;
        const currentSearchLayout = activeSearchMode ? getCurrentEditingLayout() : null;
        if (!activeSearchMode || activeSearchMode !== searchMode || currentSearchLayout !== searchLayout) {
            searchMode = activeSearchMode;
            searchLayout = currentSearchLayout;
            layoutSearchQuery = '';
            selectedSearchKey = null;
            layoutSearchOpen = false;
        }
        const showPasswordModal = getShowAdminPasswordModal();
        const showSettingsModal = getShowAdminSettingsModal();
        let html = '';

        // Show navigation on all screens except the main home
        if (mode !== 'home') {
            html += Navigation(mode);
        }

        // Show content based on the current mode
        // 'configuration' only renders for an authenticated admin; 'training' shows the
        // question-set creator for admins and the tutorial for everyone else.
        if (mode === 'home') {
            html += HomeView();
        } else if (mode === 'admin-home') {
            html += AdminModeHomeView();
        } else if (mode === 'user-home') {
            html += UserModeHomeView();
        } else if (activeSearchMode) {
            html += ConfigurationModeView(activeSearchMode === 'freezer-layouts', {
                searchQuery: layoutSearchQuery,
                selectedSearchKey,
                searchOpen: layoutSearchOpen,
            });
        } else if (mode === 'training') {
            html += isAdmin ? QuestionSetCreatorView() : TutorialTrainingModeView();
        } else if (mode === 'question-set-user') {
            html += renderUserQuestionSetView(selectedUserQuestionSetId ?? '');
        } else if (mode === 'progress-history') {
            html += ProgressHistoryView();
        }

        // Show modals if needed
        if (showPasswordModal) {
            html += AdminPasswordModal();
        }

        if (showSettingsModal && isAdmin) {
            html += AdminSettingsModal();
        }

        app.innerHTML = html;
        attachEventListeners();
    }

    // Wires up every button/input on the page that was just rendered. Each handler
    // follows: read the clicked element -> update state or the layout -> render().
    // Sections below: home, navigation, login modals, admin/user home, question-set
    // run and creator, tutorial, layout dashboard, then editor (shelves, racks, boxes, samples).
    function attachEventListeners(): void {
        // Keep the admin's draft name through renders caused by searching or editing.
        const layoutNameInput = document.getElementById('layout-name-input') as HTMLInputElement | null;
        layoutNameInput?.addEventListener('input', () => {
            const layout = getCurrentEditingLayout();
            if (layout) layout.name = layoutNameInput.value;
        });

        const searchToggle = document.getElementById('btn-toggle-layout-search');
        const searchPanel = document.getElementById('layout-search-panel');
        function setSearchOpen(open: boolean): void {
            layoutSearchOpen = open;
            if (searchPanel) searchPanel.hidden = !open;
            searchToggle?.setAttribute('aria-expanded', String(open));
            (open ? document.getElementById('layout-search-input') : searchToggle)?.focus();
        }
        searchToggle?.addEventListener('click', () => setSearchOpen(!layoutSearchOpen));
        document.getElementById('btn-close-layout-search')?.addEventListener('click', () => setSearchOpen(false));
        searchPanel?.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setSearchOpen(false);
            }
        });

        const searchForm = document.getElementById('layout-search-form');
        searchForm?.addEventListener('submit', event => {
            event.preventDefault();
            const input = document.getElementById('layout-search-input') as HTMLInputElement;
            layoutSearchQuery = input.value.trim();
            selectedSearchKey = null;
            render();
            document.getElementById('layout-search-input')?.focus();
        });

        document.getElementById('btn-clear-layout-search')?.addEventListener('click', () => {
            layoutSearchQuery = '';
            selectedSearchKey = null;
            render();
            document.getElementById('layout-search-input')?.focus();
        });

        document.querySelectorAll<HTMLElement>('[data-layout-search-key]').forEach(button => {
            button.addEventListener('click', () => {
                const currentLayout = getCurrentEditingLayout();
                const layouts = currentLayout ? [currentLayout] : getAllLayouts();
                const result = searchLayouts(layouts, layoutSearchQuery)
                    .find(item => item.key === button.dataset.layoutSearchKey);
                if (!result) return;
                const layout = layouts.find(item => item.id === result.layoutId);
                if (!layout) return;
                searchLayout = layout;
                setCurrentEditingLayout(layout);
                selectedSearchKey = result.key;
                setExpandedShelfId(result.shelfId);
                setExpandedRackId(result.rackId);
                setExpandedBoxId(result.boxId);
                render();
                const targetId = result.positionId ? `pos-${result.positionId}`
                    : result.boxId ? `box-${result.boxId}`
                    : result.rackId ? `rack-${result.rackId}`
                    : result.shelfId ? `shelf-${result.shelfId}` : 'freezer-title';
                const target = document.getElementById(targetId);
                target?.focus({ preventScroll: true });
                target?.scrollIntoView?.({ block: 'center', inline: 'nearest' });
            });
        });

        // Home screen buttons
        const btnAdminMode = document.getElementById('btn-admin-mode');
        const btnUserMode = document.getElementById('btn-user-mode');

        // Navigation buttons
        const btnBack = document.getElementById('btn-back');
        const btnHome = document.getElementById('btn-home');
        const btnLogout = document.getElementById('btn-logout');
        const btnAdminSettings = document.getElementById('btn-admin-settings');

        // Password modal buttons
        const btnAdminLogin = document.getElementById('btn-admin-login');
        const btnCancelAdmin = document.getElementById('btn-cancel-admin');
        const passwordInput = document.getElementById('admin-password-input') as HTMLInputElement;

        // Settings modal buttons
        const btnChangePassword = document.getElementById('btn-change-password');
        const btnCloseSettings = document.getElementById('btn-close-settings');

        if (btnAdminMode) {
            btnAdminMode.addEventListener('click', () => {
                setShowAdminPasswordModal(true);
                render();
            });
        }

        if (btnUserMode) {
            btnUserMode.addEventListener('click', () => {
                switchToUserMode();
                setMode('user-home');
                render();
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', () => {
                goBack();
                setShowAdminPasswordModal(false);
                setShowAdminSettingsModal(false);
                render();
            });
        }

        if (btnHome) {
            btnHome.addEventListener('click', () => {
                setMode('home');
                setShowAdminPasswordModal(false);
                setShowAdminSettingsModal(false);
                render();
            });
        }

        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                logout();
                setMode('home');
                setShowAdminPasswordModal(false);
                setShowAdminSettingsModal(false);
                render();
            });
        }

        if (btnAdminSettings) {
            btnAdminSettings.addEventListener('click', () => {
                setShowAdminSettingsModal(true);
                render();
            });
        }

        // Admin login: on a correct password go to admin home, otherwise show an inline error
        if (btnAdminLogin) {
            btnAdminLogin.addEventListener('click', () => {
                if (authenticateAdmin(passwordInput.value)) {
                    setShowAdminPasswordModal(false);
                    setMode('admin-home');
                    render();
                } else {
                    const errorDiv = document.getElementById('admin-password-error');
                    if (errorDiv) {
                        errorDiv.textContent = 'Incorrect password';
                        errorDiv.style.display = 'block';
                    }
                }
            });
        }

        if (btnCancelAdmin) {
            btnCancelAdmin.addEventListener('click', () => {
                setShowAdminPasswordModal(false);
                render();
            });
        }

        // Allow Enter key in password input
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    btnAdminLogin?.click();
                }
            });
        }

        // Change-password form validation order: all fields filled -> new passwords match
        // -> current password correct. On success the modal closes after 1.5 s so the message is readable.
        if (btnChangePassword) {
            btnChangePassword.addEventListener('click', () => {
                const currentPwdInput = document.getElementById('current-password-input') as HTMLInputElement;
                const newPwdInput = document.getElementById('new-password-input') as HTMLInputElement;
                const confirmPwdInput = document.getElementById('confirm-password-input') as HTMLInputElement;
                const messageDiv = document.getElementById('settings-message');

                if (!currentPwdInput.value || !newPwdInput.value || !confirmPwdInput.value) {
                    if (messageDiv) {
                        messageDiv.textContent = 'All fields are required';
                        messageDiv.style.color = 'red';
                    }
                    return;
                }

                if (newPwdInput.value !== confirmPwdInput.value) {
                    if (messageDiv) {
                        messageDiv.textContent = 'New passwords do not match';
                        messageDiv.style.color = 'red';
                    }
                    return;
                }

                if (changeAdminPassword(currentPwdInput.value, newPwdInput.value)) {
                    if (messageDiv) {
                        messageDiv.textContent = 'Password changed successfully';
                        messageDiv.style.color = 'green';
                    }
                    setTimeout(() => {
                        setShowAdminSettingsModal(false);
                        render();
                    }, 1500);
                } else {
                    if (messageDiv) {
                        messageDiv.textContent = 'Current password is incorrect';
                        messageDiv.style.color = 'red';
                    }
                }
            });
        }

        if (btnCloseSettings) {
            btnCloseSettings.addEventListener('click', () => {
                setShowAdminSettingsModal(false);
                render();
            });
        }

        // Admin home buttons
        const btnAdminConfiguration = document.getElementById('btn-admin-configuration');
        const btnAdminTraining = document.getElementById('btn-admin-training');

        if (btnAdminConfiguration) {
            btnAdminConfiguration.addEventListener('click', () => {
                setMode('configuration');
                render();
            });
        }

        if (btnAdminTraining) {
            btnAdminTraining.addEventListener('click', () => {
                setMode('training');
                render();
            });
        }

        // User home buttons
        const btnFreezerLayouts = document.getElementById('btn-freezer-layouts');
        const btnUserTraining = document.getElementById('btn-user-training');

        if (btnFreezerLayouts) {
            btnFreezerLayouts.addEventListener('click', () => {
                setMode('freezer-layouts');
                render();
            });
        }

        if (btnUserTraining) {
            btnUserTraining.addEventListener('click', () => {
                startTrainingTutorial();
                setMode('training');
                render();
            });
        }

        // Progress History: open the screen (button exists on both admin and user home) and clear saved attempts
        document.getElementById('btn-user-history')?.addEventListener('click', () => {
            setMode('progress-history');
            render();
        });

        document.getElementById('btn-clear-history')?.addEventListener('click', () => {
            if (confirm('Clear all saved attempts? This cannot be undone.')) {
                clearAttempts();
                render();
            }
        });

        // User picks a saved question set from the dropdown; the Open button stays disabled until one is chosen.
        const userQuestionSetSelect = document.getElementById('user-question-set-select') as HTMLSelectElement | null;
        const btnOpenQuestionSet = document.getElementById('btn-open-question-set') as HTMLButtonElement | null;
        if (userQuestionSetSelect && btnOpenQuestionSet) {
            userQuestionSetSelect.addEventListener('change', () => {
                btnOpenQuestionSet.disabled = !userQuestionSetSelect.value;
            });
            btnOpenQuestionSet.addEventListener('click', () => {
                if (!userQuestionSetSelect.value) return;
                selectedUserQuestionSetId = userQuestionSetSelect.value;
                startQuestionSetRun(selectedUserQuestionSetId);
                setMode('question-set-user');
                render();
                // Move keyboard/screen-reader focus to the question after the page is rebuilt (accessibility)
                document.getElementById('question-set-question-panel')?.focus();
            });
        }

        // Running a question set: answer buttons carry the chosen target id in data-question-set-answer
        document.querySelectorAll('[data-question-set-answer]').forEach(button => {
            button.addEventListener('click', () => {
                submitQuestionSetAnswer(button.getAttribute('data-question-set-answer') ?? '');
                render();
                document.getElementById('question-set-feedback')?.focus();
            });
        });

        document.getElementById('btn-question-set-next')?.addEventListener('click', () => {
            advanceQuestionSetRun();
            render();
            (document.getElementById('question-set-question-panel') ?? document.getElementById('question-set-completion'))?.focus();
        });

        document.getElementById('btn-question-set-change')?.addEventListener('click', () => {
            selectedUserQuestionSetId = null;
            setMode('user-home');
            render();
            document.getElementById('user-question-set-select')?.focus();
        });

        // Expand/collapse racks and boxes in the freezer view shown while answering
        document.querySelectorAll('[data-question-set-toggle-rack]').forEach(button => {
            button.addEventListener('click', () => {
                toggleUserQuestionSetRack(button.getAttribute('data-question-set-toggle-rack') ?? '');
                render();
            });
        });

        document.querySelectorAll('[data-question-set-toggle-box]').forEach(button => {
            button.addEventListener('click', () => {
                toggleUserQuestionSetBox(button.getAttribute('data-question-set-toggle-box') ?? '');
                render();
            });
        });

        const btnQuestionSetRestart = document.getElementById('btn-question-set-restart');
        if (btnQuestionSetRestart && selectedUserQuestionSetId) {
            btnQuestionSetRestart.addEventListener('click', () => {
                startQuestionSetRun(selectedUserQuestionSetId!);
                render();
                document.getElementById('question-set-question-panel')?.focus();
            });
        }

        // Question set creator (admin): create, edit, delete sets and edit their fields.
        const btnQuestionSetNew = document.getElementById('btn-question-set-new');
        if (btnQuestionSetNew) {
            btnQuestionSetNew.addEventListener('click', () => {
                startQuestionSetCreation();
                render();
            });
        }

        document.querySelectorAll('[data-question-set-edit]').forEach(button => {
            button.addEventListener('click', () => {
                editQuestionSet(button.getAttribute('data-question-set-edit') ?? '');
                render();
            });
        });

        document.querySelectorAll('[data-question-set-delete]').forEach(button => {
            button.addEventListener('click', () => {
                const questionSetId = button.getAttribute('data-question-set-delete') ?? '';
                if (!questionSetId || !confirm('Delete this question set?')) return;
                removeSavedQuestionSet(questionSetId);
                render();
            });
        });

        const btnQuestionSetCancel = document.getElementById('btn-question-set-cancel');
        if (btnQuestionSetCancel) {
            btnQuestionSetCancel.addEventListener('click', () => {
                cancelQuestionSetEditing();
                render();
            });
        }

        // Name/description update the draft on every keystroke WITHOUT re-rendering,
        // so the input keeps focus and the cursor position while typing.
        const questionSetName = document.getElementById('question-set-name') as HTMLInputElement | null;
        questionSetName?.addEventListener('input', () => setQuestionSetName(questionSetName.value));

        const questionSetDescription = document.getElementById('question-set-description') as HTMLTextAreaElement | null;
        questionSetDescription?.addEventListener('input', () => setQuestionSetDescription(questionSetDescription.value));

        const questionSetTimeMinutes = document.getElementById('question-set-time-minutes') as HTMLInputElement | null;
        questionSetTimeMinutes?.addEventListener('input', () => setQuestionSetTimeLimit('minutes', questionSetTimeMinutes.value));
        const questionSetTimeSeconds = document.getElementById('question-set-time-seconds') as HTMLInputElement | null;
        questionSetTimeSeconds?.addEventListener('input', () => setQuestionSetTimeLimit('seconds', questionSetTimeSeconds.value));
        questionSetTimeSeconds?.addEventListener('blur', () => {
            questionSetTimeSeconds.value = formatTimeLimitSeconds(questionSetTimeSeconds.value);
            setQuestionSetTimeLimit('seconds', questionSetTimeSeconds.value);
        });

        // Changing the layout re-renders because the available targets depend on the chosen layout
        const questionSetLayout = document.getElementById('question-set-layout') as HTMLSelectElement | null;
        questionSetLayout?.addEventListener('change', () => {
            setQuestionSetLayout(questionSetLayout.value);
            render();
        });

        const btnQuestionSetAdd = document.getElementById('btn-question-set-add');
        if (btnQuestionSetAdd) {
            btnQuestionSetAdd.addEventListener('click', () => {
                addQuestionToSet();
                render();
            });
        }

        // Per-question controls; the question id is stored in the data-question-* attribute value.
        document.querySelectorAll('[data-question-toggle]').forEach(button => {
            button.addEventListener('click', () => {
                toggleQuestionEditor(button.getAttribute('data-question-toggle') ?? '');
                render();
            });
        });

        // Prompt text: no re-render, so typing isn't interrupted
        document.querySelectorAll('[data-question-prompt]').forEach(input => {
            input.addEventListener('input', () => {
                updateQuestionInSet(input.getAttribute('data-question-prompt') ?? '', { prompt: (input as HTMLInputElement).value });
            });
        });

        // Target type (shelf/rack/box...) changes which targets can be picked, so re-render
        document.querySelectorAll('[data-question-type]').forEach(select => {
            select.addEventListener('change', () => {
                updateQuestionInSet(select.getAttribute('data-question-type') ?? '', {
                    targetType: (select as HTMLSelectElement).value as QuestionTargetType
                });
                render();
            });
        });

        document.querySelectorAll('[data-question-target]').forEach(select => {
            select.addEventListener('change', () => {
                updateQuestionInSet(select.getAttribute('data-question-target') ?? '', { targetId: (select as HTMLSelectElement).value });
            });
        });

        // Reorder: data-question-move is "up" or "down"; the question id is in data-question-id
        document.querySelectorAll('[data-question-move]').forEach(button => {
            button.addEventListener('click', () => {
                moveQuestionInSet(button.getAttribute('data-question-id') ?? '', button.getAttribute('data-question-move') === 'up' ? -1 : 1);
                render();
            });
        });

        document.querySelectorAll('[data-question-remove]').forEach(button => {
            button.addEventListener('click', () => {
                removeQuestionFromSet(button.getAttribute('data-question-remove') ?? '');
                render();
            });
        });

        const btnQuestionSetSave = document.getElementById('btn-question-set-save');
        if (btnQuestionSetSave) {
            btnQuestionSetSave.addEventListener('click', () => {
                saveQuestionSetDraft();
                render();
            });
        }

        // Tutorial training (non-admin "training" mode): click a freezer target to answer the current question
        document.querySelectorAll('[data-training-target]').forEach(button => {
            button.addEventListener('click', () => {
                answerTrainingTarget(button.getAttribute('data-training-target') ?? '');
                render();
                const questionPanel = document.getElementById('training-question-panel');
                questionPanel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                questionPanel?.focus({ preventScroll: true });
            });
        });

        document.querySelectorAll('[data-training-toggle-rack]').forEach(button => {
            button.addEventListener('click', () => {
                toggleTrainingRack(button.getAttribute('data-training-toggle-rack') ?? '');
                render();
            });
        });

        document.querySelectorAll('[data-training-toggle-box]').forEach(button => {
            button.addEventListener('click', () => {
                toggleTrainingBox(button.getAttribute('data-training-toggle-box') ?? '');
                render();
            });
        });

        const btnTutorialRestart = document.getElementById('btn-tutorial-restart');
        if (btnTutorialRestart) {
            btnTutorialRestart.addEventListener('click', () => {
                startTrainingTutorial();
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
        // Flow: pick a .json file -> parse -> validate against the schema (first 5 errors shown)
        // -> wrap as a SavedLayout with a fresh id and timestamps -> open in the editor.
        // It is NOT saved to localStorage until the user clicks Save in the editor.
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
                            const result = validateFreezerLayout(json);
                            if (!result.ok) {
                                alert('Invalid freezer layout file:\n' + result.errors.slice(0, 5).join('\n'));
                                return;
                            }
                            
                            // Create SavedLayout from uploaded data
                            const uploadedLayout: SavedLayout = {
                                id: generateLayoutId(),
                                name: json.name,
                                freezerData: result.layout,
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
        // Saves the layout being edited to localStorage via StorageService (falls back to "Unnamed Layout" if the name is blank).
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
        // Downloads only freezerData (not the id/timestamps) as "<layout name>.json", so it can be re-uploaded later.
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

        // FreezerEditor - Export to PDF button
        // Renders a read-only, print-friendly copy (exportView: true) into a temporary #print-root
        // div and opens the browser print dialog (user chooses "Save as PDF"). The div is removed after printing.
        const btnExportPdf = document.getElementById('btn-export-pdf');
        if (btnExportPdf) {
                btnExportPdf.addEventListener('click', async () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;

                const exportLayout = await requestExportLayout(getExportLayoutPreference());
                if (!exportLayout) return; // cancelled
                setExportLayoutPreference(exportLayout);

                const printRoot = document.createElement('div');
                printRoot.id = 'print-root';
                printRoot.innerHTML = FreezerEditor(currentLayout, true, { exportView: true, exportLayout });
                document.body.appendChild(printRoot);

                window.addEventListener('afterprint', () => printRoot.remove(), { once: true });
                window.print();
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
        // [id^="..."] matches every element whose id STARTS WITH the prefix.
        document.querySelectorAll('[id^="btn-add-freezer"]').forEach(btn => {
        btn.addEventListener('click', () => {
            openNewLayoutModal();
            render();
        });
        });

        // Configuration mode - Click on existing layout to open in editor
        // Layout cards have id "layout-<layoutId>"; the id after the prefix is looked up in storage.
        document.querySelectorAll('.layout-button[id^="layout-"]').forEach(btn => {
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
        document.getElementById('btn-expand-all-shelves')?.addEventListener('click', () => {
            const currentLayout = getCurrentEditingLayout();
            if (!currentLayout) return;
            const shelfIds = currentLayout.freezerData.shelves.map(shelf => shelf.id);
            const expandedShelfIds = getExpandedShelfIds();
            if (shelfIds.every(id => expandedShelfIds.has(id))) {
                setExpandedShelfId(null);
            } else {
                expandShelves(shelfIds);
            }
            render();
            document.getElementById('btn-expand-all-shelves')?.focus();
        });

        const btnAddShelf = document.getElementById('btn-add-shelf');
        if (btnAddShelf) {
            btnAddShelf.addEventListener('click', () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                addShelf(currentLayout);
                render();
            });
        }

        // Toggle only the selected shelf.
        document.querySelectorAll('[id^="btn-toggle-shelf-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const shelfId = btn.id.replace('btn-toggle-shelf-', '');
                const shelf = getCurrentEditingLayout()?.freezerData.shelves.find(item => item.id === shelfId);
                if (!shelf) return;
                if (getExpandedShelfIds().has(shelfId)) {
                    closeShelf(shelf);
                } else {
                    expandShelves([shelfId]);
                }
                render();
                document.getElementById(btn.id)?.focus();
            });
        });

        // Remove Shelf
        // The id suffix here is the shelf's INDEX in the shelves array, not its id.
        document.querySelectorAll('[id^="btn-remove-shelf-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.id.replace('btn-remove-shelf-', ''));
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                const shelf = currentLayout.freezerData.shelves[index];
                if (!shelf || !confirm('Remove shelf?')) return;
                closeShelf(shelf);
                removeShelf(currentLayout, index);
                render();
            });
        });

        // ===== RACK BUTTONS =====
        document.querySelectorAll('[id^="btn-add-rack-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                const shelfId = btn.id.slice('btn-add-rack-'.length);
                addRack(currentLayout, shelfId);
                render();
            });
        });

        // Toggle Rack
        document.querySelectorAll('[id^="btn-toggle-rack-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const rackId = btn.id.replace('btn-toggle-rack-', '');
                const isExpanded = getExpandedRackId() === rackId;
                setExpandedRackId(isExpanded ? null : rackId);
                render();
            });
        });

        // Rename Rack (asks for the new name, then auto-saves the layout)
        document.querySelectorAll('[id^="btn-rename-rack-"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                const rackId = btn.id.replace('btn-rename-rack-', '');
                const rack = currentLayout.freezerData.shelves
                    .flatMap(shelf => shelf.racks)
                    .find(item => item.id === rackId);
                if (!rack) return;

                const rackName = await requestName('Rename rack', 'Rack name', 'Save name', rack.name);
                if (!rackName) return;
                renameRack(currentLayout, rackId, rackName);
                currentLayout.updatedAt = new Date().toISOString();
                saveLayout(currentLayout);
                render();
            });
        });

        // Color picker buttons for racks and boxes. Attributes: data-layout-color-kind ("rack" | "box"),
        // data-layout-color-id (the item's id), data-layout-color-value (a hex color, or "inherit" for boxes
        // meaning "use the rack's color"). Auto-saves the layout.
        document.querySelectorAll('[data-layout-color-kind]').forEach(button => {
            button.addEventListener('click', () => {
                const currentLayout = getCurrentEditingLayout();
                const kind = button.getAttribute('data-layout-color-kind');
                const itemId = button.getAttribute('data-layout-color-id');
                const colorValue = button.getAttribute('data-layout-color-value');
                if (!currentLayout || !itemId || !colorValue) return;

                if (kind === 'rack') {
                    setRackColor(currentLayout, itemId, colorValue);
                } else if (kind === 'box') {
                    setBoxColor(currentLayout, itemId, colorValue === 'inherit' ? null : colorValue);
                } else {
                    return;
                }

                currentLayout.updatedAt = new Date().toISOString();
                saveLayout(currentLayout);
                render();
            });
        });

        // Remove Rack from the shelf containing the clicked button.
        document.querySelectorAll('[id^="btn-remove-rack-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                const { shelfIndex, rackIndex } = getRackIndexes(btn);
                const rack = currentLayout.freezerData.shelves[shelfIndex]?.racks[rackIndex];
                if (!rack || !confirm('Remove rack?')) return;
                if (rack.id === getExpandedRackId()) setExpandedRackId(null);
                removeRack(currentLayout, shelfIndex, rackIndex);
                render();
            });
        });

        // ===== BOX BUTTONS =====
        // Add Box
        // Button id is "btn-add-box-<row>-<column>" (the empty slot's grid position).
        document.querySelectorAll('[id^="btn-add-box-"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const coords = btn.id.replace('btn-add-box-', '').split('-');
                const row = parseInt(coords[0]!);
                const column = parseInt(coords[1]!);
                const currentLayout = getCurrentEditingLayout();
                const { shelfIndex, rackIndex } = getRackIndexes(btn);
                if (!currentLayout || shelfIndex < 0 || rackIndex < 0) return;
                const boxName = await requestName('Add box', 'Box name', 'Create box', `Box ${row}-${column}`);
                if (!boxName) return;
                addBox(currentLayout, shelfIndex, rackIndex, row, column, boxName);
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

        // Rename Box (asks for the new name, then auto-saves the layout)
        document.querySelectorAll('[id^="btn-rename-box-"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                const boxId = btn.id.replace('btn-rename-box-', '');
                const box = currentLayout.freezerData.shelves
                    .flatMap(shelf => shelf.racks)
                    .flatMap(rack => rack.boxSlots)
                    .find(slot => slot.box?.id === boxId)?.box;
                if (!box) return;

                const boxName = await requestName('Rename box', 'Box name', 'Save name', box.name);
                if (!boxName) return;
                renameBox(currentLayout, boxId, boxName);
                currentLayout.updatedAt = new Date().toISOString();
                saveLayout(currentLayout);
                render();
            });
        });

        // Remove Box
        // Button id is "btn-remove-box-<row>-<column>"; asks for confirmation because the box's samples are deleted too.
        document.querySelectorAll('[id^="btn-remove-box-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const coords = btn.id.replace('btn-remove-box-', '').split('-');
                const row = parseInt(coords[0]!);
                const column = parseInt(coords[1]!);
                const currentLayout = getCurrentEditingLayout();
                const { shelfIndex, rackIndex } = getRackIndexes(btn);
                if (!currentLayout || shelfIndex < 0 || rackIndex < 0) return;
                if (!confirm('Remove this box and all its samples?')) return;
                removeBox(currentLayout, shelfIndex, rackIndex, row, column);
                render();
            });
        });

        // Assign a new sample to an existing empty position (suffix is the position id)
        document.querySelectorAll('[id^="btn-assign-sample-"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                const sampleName = await requestName('Add sample', 'Sample name', 'Add sample');
                if (!currentLayout || !sampleName) return;
                const positionId = btn.id.replace('btn-assign-sample-', '');
                assignSampleToPosition(currentLayout, positionId, sampleName);
                currentLayout.updatedAt = new Date().toISOString();
                saveLayout(currentLayout);
                render();
            });
        });

        // Rename a sample (suffix is the sample id; falls back to showing the id if the sample record is missing)
        document.querySelectorAll('[id^="btn-rename-sample-"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                const sampleId = btn.id.replace('btn-rename-sample-', '');
                const sample = currentLayout.freezerData.samples?.find(item => item.id === sampleId);

                const sampleName = await requestName('Rename sample', 'Sample name', 'Save name', sample?.name ?? sampleId);
                if (!sampleName) return;
                renameSample(currentLayout, sampleId, sampleName);
                currentLayout.updatedAt = new Date().toISOString();
                saveLayout(currentLayout);
                render();
            });
        });

        // Remove Sample
        // The id suffix is the position id. The position stays in the box; only its sample is cleared.
        document.querySelectorAll('[id^="btn-remove-sample-"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const positionId = btn.id.replace('btn-remove-sample-', '');
                const currentLayout = getCurrentEditingLayout();
                if (!currentLayout) return;
                if (!confirm('Remove this sample?')) return;

                removeSampleFromPosition(currentLayout, positionId);
                currentLayout.updatedAt = new Date().toISOString();
                saveLayout(currentLayout);
                render();
            });
        });

        // ===== DRAG & DROP: reorder racks, move/swap boxes =====
        document.querySelectorAll<HTMLElement>('[data-rack-id]').forEach(rackEl => {
            const rackId = rackEl.dataset.rackId!;
            const shelfId = rackEl.closest<HTMLElement>('[data-shelf-id]')?.dataset.shelfId;
            if (!shelfId) return;

            rackEl.addEventListener('dragstart', e => {
                if ((e.target as HTMLElement).closest('[data-box-id]')) return;   // a box is being dragged, not the rack
                dragging = { kind: 'rack', id: rackId, shelfId };
                e.dataTransfer?.setData('text/plain', rackId);
                rackEl.classList.add('dragging');
            });
            rackEl.addEventListener('dragend', () => { dragging = null; rackEl.classList.remove('dragging'); });
            rackEl.addEventListener('dragover', e => {
                if (dragging?.kind === 'rack' && dragging.shelfId === shelfId) {
                    e.preventDefault();
                    rackEl.classList.add('drop-target');
                }
            });
            rackEl.addEventListener('dragleave', () => rackEl.classList.remove('drop-target'));
            rackEl.addEventListener('drop', e => {
                if (dragging?.kind !== 'rack' || dragging.shelfId !== shelfId) return;
                e.preventDefault();
                const layout = getCurrentEditingLayout();
                if (!layout) return;
                const { rackIndex } = getRackIndexes(rackEl);
                rackEl.classList.remove('drop-target');
                finishEdit(moveRack(layout, shelfId, dragging.id, rackIndex), layout);
                dragging = null;
            });
        });

        document.querySelectorAll<HTMLElement>('.box-container[data-box-id]').forEach(boxEl => {
            boxEl.addEventListener('dragstart', e => {
                const rackId = boxEl.closest<HTMLElement>('[data-rack-id]')?.dataset.rackId;
                if (!rackId) return;
                dragging = { kind: 'box', rackId, row: Number(boxEl.dataset.row), column: Number(boxEl.dataset.column) };
                e.dataTransfer?.setData('text/plain', boxEl.dataset.boxId!);
                boxEl.classList.add('dragging');
            });
            boxEl.addEventListener('dragend', () => { dragging = null; boxEl.classList.remove('dragging'); });
        });

        // Any slot (filled or empty) is a drop target for a box.
        document.querySelectorAll<HTMLElement>('[data-rack-id] .box-grid [data-row]').forEach(slotEl => {
            const rackId = slotEl.closest<HTMLElement>('[data-rack-id]')?.dataset.rackId;
            slotEl.addEventListener('dragover', e => {
                if (dragging?.kind === 'box' && dragging.rackId === rackId) {
                    e.preventDefault();
                    slotEl.classList.add('drop-target');
                }
            });
            slotEl.addEventListener('dragleave', () => slotEl.classList.remove('drop-target'));
            slotEl.addEventListener('drop', e => {
                if (dragging?.kind !== 'box' || dragging.rackId !== rackId) return;
                e.preventDefault();
                e.stopPropagation();
                const layout = getCurrentEditingLayout();
                if (!layout) return;
                slotEl.classList.remove('drop-target');
                finishEdit(moveBox(layout, rackId, dragging.row, dragging.column, Number(slotEl.dataset.row), Number(slotEl.dataset.column)), layout);
                dragging = null;
            });
        });
    }
}
