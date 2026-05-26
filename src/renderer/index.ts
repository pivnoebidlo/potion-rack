// Imports
import { i18n, t, Language } from './i18n/index.js';
import { updateUILanguage } from './utils/languageUpdater.js';
import { settingsManager } from './modules/settings/SettingsManager.js';
import { RightPanelManager } from './ui/rightPanel.js';
import { appState } from './core/appState.js';
import { setupKeyboardShortcuts } from './core/shortcuts.js';
import {
    renderTable,
    initializeTableComponents,
    initializePaintModal,
    setupSorting,
    selectPreviousPaint,
    selectNextPaint,
    selectFirstPaint,
    selectLastPaint,
    scrollToTop,
    scrollToBottom,
    focusOnFilter,
    getPaintModalManager
} from './ui/tableUI.js';
import {
    initializeFilters,
    refreshFilterData,
    setupResetFiltersButton
} from './ui/filtersUI.js';
import { setupSettingsPanel } from './ui/settingsUI.js';
import { compressImage, addPaintImage } from './services/api.js';
import { FiguresApp } from './modules/figures/index.js';

console.log('Potion Rack starting...');

// DOM elements
const tableBody = document.getElementById('tableBody') as HTMLElement;
const statusMessage = document.getElementById('statusMessage') as HTMLElement;
const addBtn = document.getElementById('addBtn') as HTMLButtonElement;
const detailsContent = document.getElementById('detailsContent') as HTMLElement;
const languageSwitcher = document.getElementById('languageSwitcher') as HTMLSelectElement;

// Initialize right panel
new RightPanelManager();

// Initialize components
initializeTableComponents();
initializeFilters(() => renderTable());
setupResetFiltersButton();

// Setup add button directly
if (addBtn) {
    addBtn.onclick = () => {
        console.log('Add button clicked');
        const manager = getPaintModalManager();
        if (manager) {
            manager.showAddModal();
        } else {
            console.error('PaintModalManager not initialized');
            alert('Please wait, initializing...');
        }
    };
}

// Figures App
let figuresApp: FiguresApp | null = null;
const figuresSidebar = document.getElementById('figures-sidebar') as HTMLElement;
const figuresGridContainer = document.getElementById('figures-grid-container') as HTMLElement;

// Create figure-editor-container if not exists
let figureEditorContainer = document.getElementById('figure-editor-container') as HTMLElement;
if (!figureEditorContainer) {
    console.log('Creating figure-editor-container dynamically');
    figureEditorContainer = document.createElement('div');
    figureEditorContainer.id = 'figure-editor-container';
    figureEditorContainer.className = 'figure-editor-container';
    const editorView = document.getElementById('figures-editor-view');
    if (editorView) {
        editorView.appendChild(figureEditorContainer);
    } else {
        console.error('figures-editor-view not found');
    }
}

const addFigureSidebarBtn = document.getElementById('addFigureSidebarBtn') as HTMLElement;

// Debug output
console.log('Figures grid container:', figuresGridContainer);
console.log('Figure editor container:', figureEditorContainer);
console.log('Add figure button:', addFigureSidebarBtn);

if (figuresGridContainer && figureEditorContainer) {
    figuresApp = new FiguresApp(figuresGridContainer, figureEditorContainer);
    console.log('FiguresApp initialized');
} else {
    console.error('FiguresApp not initialized: missing containers');
}

if (addFigureSidebarBtn && figuresApp) {
    addFigureSidebarBtn.onclick = () => {
        console.log('Add figure button clicked');
        figuresApp.showAddModal();
    };
} else {
    console.error('Add button or FiguresApp not ready');
}

// Navigation between tabs
function setupNavigation(): void {
    const navItems = document.querySelectorAll('.nav-item');
    const paintsView = document.getElementById('paints-view');
    const figuresSidebar = document.getElementById('figures-sidebar');
    const figuresEditorView = document.getElementById('figures-editor-view');
    const settingsView = document.getElementById('settings-view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Hide all views
            if (paintsView) paintsView.style.display = 'none';
            if (figuresEditorView) figuresEditorView.style.display = 'none';
            if (settingsView) settingsView.style.display = 'none';
            if (figuresSidebar) figuresSidebar.style.display = 'none';

            if (tab === 'paints' && paintsView) {
                paintsView.style.display = 'flex';
                paintsView.style.flexDirection = 'column';
                if (figuresSidebar) figuresSidebar.style.display = 'none';
                renderTable();
            } else if (tab === 'figures' && figuresEditorView && figuresSidebar) {
                figuresSidebar.style.display = 'flex';
                figuresSidebar.style.flexDirection = 'column';
                figuresEditorView.style.display = 'flex';
                figuresEditorView.style.flexDirection = 'column';
            } else if (tab === 'settings' && settingsView) {
                settingsView.style.display = 'flex';
                settingsView.style.flexDirection = 'column';
                if (figuresSidebar) figuresSidebar.style.display = 'none';
            }
        });
    });
}

// Global paste handler for images
document.addEventListener('paste', async (e) => {
    const currentPaintId = appState.currentSelectedId;
    if (!currentPaintId) {
        console.log('📋 Paste ignored: no paint selected');
        return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;

    console.log(`📋 Pasting ${imageItems.length} image(s) to paint ${currentPaintId}`);

    for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
            try {
                updateStatusMessage('Uploading image...');

                const compressedImage = await compressImage(file, 800, 800, 0.7);
                await addPaintImage(currentPaintId, compressedImage, file.name);

                updateStatusMessage('Image uploaded ✓');

                await renderTable();

                if (currentPaintId === appState.currentSelectedId) {
                    const { paintDetails, getBaseColorName } = await import('./ui/tableUI.js');
                    if (paintDetails) {
                        await paintDetails.loadPaint(currentPaintId, getBaseColorName);
                    }
                }
            } catch (err) {
                console.error('Failed to paste image:', err);
                updateStatusMessage('Failed to upload image');
            }
        }
    }
});

// Helper
function updateStatusMessage(message: string): void {
    const statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    setTimeout(() => {
        if (statusMessage.textContent === message) {
            statusMessage.style.display = 'none';
        }
    }, 3000);
}

// Initialize
async function init(): Promise<void> {
    console.log('Initializing...');
    await settingsManager.initialize();

    if (languageSwitcher) languageSwitcher.value = i18n.getLanguage();
    updateUILanguage();
    await refreshFilterData();
    await initializePaintModal();
    setupSorting();
    await setupSettingsPanel();
    setupNavigation();

    setupKeyboardShortcuts(
        selectPreviousPaint,
        selectNextPaint,
        selectFirstPaint,
        selectLastPaint,
        scrollToTop,
        scrollToBottom,
        focusOnFilter,
        () => getPaintModalManager()?.showAddModal(),
        (paint) => getPaintModalManager()?.showEditModal(paint),
        async () => {
            if (appState.currentSelectedId) {
                if (confirm(t().msgDeleteConfirm)) {
                    const { deletePaintAPI } = await import('./services/api.js');
                    await deletePaintAPI(appState.currentSelectedId);
                    appState.setSelectedId(null);
                    await renderTable();
                    updateStatusMessage(t().msgPaintDeleted);
                    await refreshFilterData();
                }
            } else {
                alert(t().msgSelectFirst);
            }
        },
        refreshFilterData
    );

    await renderTable();
    updateStatusMessage(t().msgReady);
    console.log('Ready!');
    console.log('PaintModalManager ready:', getPaintModalManager());
}

init();