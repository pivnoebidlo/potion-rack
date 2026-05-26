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

// Performance logging
const LOG_PERFORMANCE = true;

function perfLog(message: string, startTime?: number): void {
    if (!LOG_PERFORMANCE) return;
    if (startTime) {
        console.log(`⏱️ ${message}: ${(performance.now() - startTime).toFixed(2)}ms`);
    } else {
        console.log(`⏱️ ${message}`);
    }
}

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

            if (paintsView) paintsView.style.display = 'none';
            if (settingsView) settingsView.style.display = 'none';

            if (tab === 'paints' && paintsView) {
                paintsView.style.display = 'flex';
                paintsView.style.flexDirection = 'column';
                renderTable();
            } else if (tab === 'settings' && settingsView) {
                settingsView.style.display = 'flex';
                settingsView.style.flexDirection = 'column';
            } else if (tab === 'figures') {
                alert('Figures feature coming soon!');
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
    const t0 = performance.now();
    perfLog('🚀 Initialization started');

    perfLog('⏳ settingsManager.initialize()');
    const t1 = performance.now();
    await settingsManager.initialize();
    perfLog('✅ settingsManager.initialize()', t1);

    perfLog('⏳ languageSwitcher setup');
    const t2 = performance.now();
    if (languageSwitcher) languageSwitcher.value = i18n.getLanguage();
    updateUILanguage();
    perfLog('✅ languageSwitcher setup', t2);

    perfLog('⏳ loadFilterData()');
    const t3 = performance.now();
    await refreshFilterData();
    perfLog('✅ loadFilterData()', t3);

    perfLog('⏳ initializePaintModal()');
    const t4 = performance.now();
    await initializePaintModal();
    perfLog('✅ initializePaintModal()', t4);

    perfLog('⏳ setupSorting()');
    const t5 = performance.now();
    setupSorting();
    perfLog('✅ setupSorting()', t5);

    perfLog('⏳ setupSettingsPanel()');
    const t6 = performance.now();
    await setupSettingsPanel();
    perfLog('✅ setupSettingsPanel()', t6);

    perfLog('⏳ setupNavigation()');
    const t7 = performance.now();
    setupNavigation();
    perfLog('✅ setupNavigation()', t7);

    perfLog('⏳ setupKeyboardShortcuts()');
    const t8 = performance.now();
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
    perfLog('✅ setupKeyboardShortcuts()', t8);

    perfLog('⏳ renderTable()');
    const t9 = performance.now();
    await renderTable();
    perfLog('✅ renderTable()', t9);

    perfLog('⏳ paintDetails.clear()');
    const t10 = performance.now();
    // paintDetails.clear();
    perfLog('✅ paintDetails.clear()', t10);

    updateStatusMessage(t().msgReady);
    perfLog('🏁 Initialization complete', t0);
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