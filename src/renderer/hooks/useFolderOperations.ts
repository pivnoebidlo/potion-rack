import { useCallback } from 'react';
import { Figure } from '../types/figure';

interface UseFolderOperationsProps {
    figures: Figure[];
    selectedFolder: string;
    selectedId: number | null;
    loadDiskFolders: () => Promise<void>;
    loadFigures: () => Promise<void>;
    updateFigure: (id: number, data: Partial<Figure>) => Promise<void>;
    setSelectedFolder: (path: string) => void;
    setSelectedId: (id: number | null) => void;
    t: (key: string) => string;
}

export function useFolderOperations({
                                        figures, selectedFolder, selectedId,
                                        loadDiskFolders, loadFigures, updateFigure,
                                        setSelectedFolder, setSelectedId,
                                        t
                                    }: UseFolderOperationsProps) {

    const handleMoveFigure = useCallback(async (figureId: number, figureName: string, oldFolderPath: string, newFolderPath: string) => {
        const duplicate = figures.find(f =>
            f.name === figureName &&
            f.folder_path === newFolderPath &&
            f.id !== figureId
        );
        if (duplicate) {
            alert(t('figureDuplicateMove') || `Figure "${figureName}" already exists in the target folder.`);
            return;
        }

        try {
            await (window as any).electronAPI?.moveFigure(oldFolderPath, figureName, newFolderPath);
            await updateFigure(figureId, { folder_path: newFolderPath || null });
            if (selectedId === figureId) setSelectedId(null);
            await loadDiskFolders();
            await loadFigures();
        } catch (err) { console.error('Failed to move figure:', err); }
    }, [figures, selectedId, loadDiskFolders, loadFigures, updateFigure, setSelectedId, t]);

    const handleMoveFolder = useCallback(async (oldPath: string, newPath: string) => {
        if (oldPath === newPath) {
            alert(t('cannotMoveFolderIntoItself') || 'Cannot move a folder into itself.');
            return;
        }

        const sourceFigures = figures.filter(f =>
            f.folder_path === oldPath || f.folder_path?.startsWith(oldPath + '/')
        );
        const targetFigureNames = new Set(
            figures
                .filter(f =>
                    f.folder_path === newPath || f.folder_path?.startsWith(newPath + '/')
                )
                .map(f => f.name)
        );

        const duplicates = sourceFigures.filter(f => targetFigureNames.has(f.name));
        if (duplicates.length > 0) {
            alert((t('cannotMoveFolderDuplicates') || 'Cannot move folder: duplicate figures:') + ' ' + duplicates.map(f => f.name).join(', '));
            return;
        }

        try {
            await (window as any).electronAPI?.moveFolder(oldPath, newPath);
            const figsToUpdate = figures.filter(f => f.folder_path === oldPath || f.folder_path?.startsWith(oldPath + '/'));
            for (const fig of figsToUpdate) {
                const updatedPath = fig.folder_path === oldPath ? newPath : newPath + fig.folder_path!.substring(oldPath.length);
                await updateFigure(fig.id, { folder_path: updatedPath });
            }
            if (selectedFolder === oldPath || selectedFolder?.startsWith(oldPath + '/')) {
                const updatedSelected = selectedFolder === oldPath ? newPath : newPath + selectedFolder.substring(oldPath.length);
                setSelectedFolder(updatedSelected);
            }
            await loadDiskFolders();
            await loadFigures();
        } catch (err) { console.error('Failed to move folder:', err); }
    }, [figures, selectedFolder, loadDiskFolders, loadFigures, updateFigure, setSelectedFolder, t]);

    return { handleMoveFigure, handleMoveFolder };
}