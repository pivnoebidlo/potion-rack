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


console.log('Potion Rack starting...');

// DOM elements
const addBtn = document.getElementById('addBtn') as HTMLButtonElement;

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

// Navigation between tabs
function setupNavigation(): void {
    const navItems = document.querySelectorAll('.nav-item');
    const paintsView = document.getElementById('paints-view');
    const settingsView = document.getElementById('settings-view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Hide all views
            if (paintsView) paintsView.style.display = 'none';
            if (settingsView) settingsView.style.display = 'none';

            // Show selected view
            if (tab === 'paints' && paintsView) {
                paintsView.style.display = 'flex';
                paintsView.style.flexDirection = 'column';
                renderTable();
            } else if (tab === 'settings' && settingsView) {
                settingsView.style.display = 'flex';
                settingsView.style.flexDirection = 'column';
            } else if (tab === 'figures') {
                alert('Figures feature coming soon!');
                // Если нет отдельного views, возвращаемся к краскам
                if (paintsView) {
                    paintsView.style.display = 'flex';
                    paintsView.style.flexDirection = 'column';
                    renderTable();
                }
                const paintsNav = document.querySelector('.nav-item[data-tab="paints"]');
                if (paintsNav) paintsNav.classList.add('active');
            }
        });
    });
}

// Initialize
async function init(): Promise<void> {
    console.log('Initializing...');
    await settingsManager.initialize();

    updateUILanguage();
    await refreshFilterData();
    await initializePaintModal();
    setupSorting();
    setupSettingsPanel();
    setupNavigation();

    // Setup keyboard shortcuts
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

    console.log('Ready!');
    console.log('PaintModalManager ready:', getPaintModalManager());
}

init();

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