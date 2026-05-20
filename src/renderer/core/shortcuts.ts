import { t } from '../i18n/index.js';
import { appState } from './appState.js';

export function setupKeyboardShortcuts(
    selectPreviousPaint: () => Promise<void>,
    selectNextPaint: () => Promise<void>,
    selectFirstPaint: () => Promise<void>,
    selectLastPaint: () => Promise<void>,
    scrollToTop: () => void,
    scrollToBottom: () => void,
    focusOnFilter: () => void,
    showAddModal: () => void,
    showEditModal: (paint: any) => void,
    deleteCurrentPaint: () => Promise<void>,
    refreshFilterData: () => Promise<void>
): void {
    document.addEventListener('keydown', async (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            await selectPreviousPaint();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            await selectNextPaint();
        } else if (e.key === 'PageUp') {
            e.preventDefault();
            scrollToTop();
        } else if (e.key === 'PageDown') {
            e.preventDefault();
            scrollToBottom();
        } else if (e.key === 'Home') {
            e.preventDefault();
            await selectFirstPaint();
        } else if (e.key === 'End') {
            e.preventDefault();
            await selectLastPaint();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            focusOnFilter();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            showAddModal();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            const paint = appState.getSelectedPaint();
            if (paint) showEditModal(paint);
        } else if (e.key === 'Delete') {
            e.preventDefault();
            await deleteCurrentPaint();
        }
    });
}