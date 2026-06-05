import { useEffect, useRef } from 'react';
import styles from './ContextMenu.module.css';
import { FolderTarget } from './FolderTree';
import { t } from '../i18n';

interface ContextMenuProps {
    x: number;
    y: number;
    target: FolderTarget;
    onClose: () => void;
    onNewFigure: (folderPath: string) => void;
    onNewFolder: (parentPath: string) => void;
    onRename: (target: FolderTarget) => void;
    onExportPdf?: (target: FolderTarget) => void;
    onDelete: (target: FolderTarget) => void;
}

export default function ContextMenu({ x, y, target, onClose, onNewFigure, onNewFolder, onRename, onExportPdf, onDelete }: ContextMenuProps) {
    const $t = t();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    const isFolder = target.type === 'folder' || target.type === 'root';
    const isFigure = target.type === 'figure';
    const isRoot = target.type === 'root';

    const menuWidth = 200;
    const menuHeight = isRoot ? 80 : isFigure ? 165 : 130;
    const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
    const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

    return (
        <div
            ref={menuRef}
            className={styles.menu}
            style={{ left: adjustedX, top: adjustedY }}
        >
            {(isFolder || isRoot) && (
                <>
                    <div className={styles.item} onClick={() => { onNewFigure(target.path); onClose(); }}>
                        {$t.newFigure}
                    </div>
                    <div className={styles.item} onClick={() => { onNewFolder(target.path); onClose(); }}>
                        {$t.newFolder}
                    </div>
                </>
            )}

            <div className={styles.divider} />

            {isFigure && (
                <>
                    <div className={styles.item} onClick={() => { console.log('Export PDF clicked', target); onExportPdf?.(target); onClose(); }}>
                        📄 {$t.exportPdf || 'Export to PDF'}
                    </div>
                    <div className={styles.divider} />
                </>
            )}

            {!isRoot && (
                <>
                    <div className={styles.item} onClick={() => { onRename(target); onClose(); }}>
                        {$t.rename}
                    </div>
                    <div className={styles.divider} />
                </>
            )}

            {!isRoot && (
                <div className={`${styles.item} ${styles.danger}`} onClick={() => { onDelete(target); onClose(); }}>
                    {isFolder ? $t.deleteFolder : $t.deleteFigure}
                </div>
            )}
        </div>
    );
}