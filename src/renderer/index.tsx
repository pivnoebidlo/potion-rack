import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { i18n, t } from './i18n/index.js';
import { updateUILanguage } from './utils/languageUpdater.js';
import { settingsManager } from './modules/settings/SettingsManager.js';
import { RightPanelManager } from './ui/rightPanel.js';
import { appState } from './core/appState.js';
import { setupKeyboardShortcuts } from './core/shortcuts.js';
import {
    renderTable, initializeTableComponents, initializePaintModal, setupSorting,
    selectPreviousPaint, selectNextPaint, selectFirstPaint, selectLastPaint,
    scrollToTop, scrollToBottom, focusOnFilter, getPaintModalManager
} from './ui/tableUI.js';
import { initializeFilters, refreshFilterData, setupResetFiltersButton } from './ui/filtersUI.js';
import { setupSettingsPanel } from './ui/settingsUI.js';
import { compressImage, addPaintImage } from './services/api.js';

console.log('Potion Rack starting...');

new RightPanelManager();

function setupNavigation(): void {
    const navItems = document.querySelectorAll('.nav-item');
    const paintsView = document.getElementById('paints-view');
    const settingsView = document.getElementById('settings-view');
    const mainContainer = document.querySelector('.main-container') as HTMLElement;
    const rightPanel = document.getElementById('rightPanel') as HTMLElement;
    const resizeHandle = document.getElementById('resizeHandle') as HTMLElement;

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            if (tab === 'figures') {
                window.location.href = 'figures.html';
                return;
            }

            if (paintsView) paintsView.style.display = 'none';
            if (settingsView) settingsView.style.display = 'none';

            if (tab === 'paints') {
                if (paintsView) {
                    paintsView.style.display = 'flex';
                    paintsView.style.flexDirection = 'column';
                }
                if (mainContainer) mainContainer.style.display = 'flex';
                if (rightPanel) rightPanel.style.display = 'flex';
                if (resizeHandle) resizeHandle.style.display = 'block';
                renderTable();
            } else if (tab === 'settings') {
                if (settingsView) {
                    settingsView.style.display = 'flex';
                    settingsView.style.flexDirection = 'column';
                }
                if (mainContainer) mainContainer.style.display = 'flex';
                if (rightPanel) rightPanel.style.display = 'flex';
                if (resizeHandle) resizeHandle.style.display = 'block';
            }
        });
    });
}

async function init(): Promise<void> {
    await settingsManager.initialize();
    updateUILanguage();
    await refreshFilterData();
    await initializePaintModal();
    setupSorting();
    await setupSettingsPanel();

    const addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.onclick = () => getPaintModalManager()?.showAddModal();

    setupNavigation();

    setupKeyboardShortcuts(
        selectPreviousPaint, selectNextPaint, selectFirstPaint, selectLastPaint,
        scrollToTop, scrollToBottom, focusOnFilter,
        () => getPaintModalManager()?.showAddModal(),
        (paint) => getPaintModalManager()?.showEditModal(paint),
        async () => {
            if (appState.currentSelectedId) {
                if (confirm(t().msgDeleteConfirm)) {
                    const { deletePaintAPI } = await import('./services/api.js');
                    await deletePaintAPI(appState.currentSelectedId);
                    appState.setSelectedId(null);
                    await renderTable();
                    await refreshFilterData();
                }
            }
        },
        refreshFilterData
    );

    initializeTableComponents();
    initializeFilters(() => renderTable());
    setupResetFiltersButton();
    await renderTable();
    console.log('Ready!');
}

init();