import styles from './FiguresApp.module.css';
import { Figure } from '../types/figure';
import { statusTag, statusLabel } from '../utils/figures';
import { t } from '../i18n';

interface FolderStatsPanelProps {
    selectedFolder: string;
    folderStats: { total: number; inProgress: number; completed: number; subFolders: number };
    filtered: Figure[];
    selectedId: number | null;
    onSelectFigure: (id: number) => void;
    onEditFigure: (f: Figure) => void;
    onDeleteFigure: (id: number) => void;
}

export default function FolderStatsPanel({
                                             selectedFolder,
                                             folderStats,
                                             filtered,
                                             selectedId,
                                             onSelectFigure,
                                             onEditFigure,
                                             onDeleteFigure,
                                         }: FolderStatsPanelProps) {
    const $t = t();

    return (
        <div className={styles.folderStatsPanel}>
            <div className={styles.folderStatsHeader}>
                <div className={styles.folderStatsName}>{selectedFolder.split('/').pop() || selectedFolder}</div>
                <div className={styles.folderStatsPath}>{selectedFolder}</div>
            </div>
            <div className={styles.statsRow}>
                <div className={styles.statMini}>
                    <div className={styles.statMiniValue}>{folderStats.total}</div>
                    <div className={styles.statMiniLabel}>Всего</div>
                </div>
                <div className={styles.statMini}>
                    <div className={`${styles.statMiniValue} ${styles.statWarning}`}>{folderStats.inProgress}</div>
                    <div className={styles.statMiniLabel}>В процессе</div>
                </div>
                <div className={styles.statMini}>
                    <div className={`${styles.statMiniValue} ${styles.statSuccess}`}>{folderStats.completed}</div>
                    <div className={styles.statMiniLabel}>Завершено</div>
                </div>
                <div className={styles.statMini}>
                    <div className={`${styles.statMiniValue} ${styles.statMuted}`}>{folderStats.subFolders}</div>
                    <div className={styles.statMiniLabel}>Папок</div>
                </div>
            </div>
            <div className={styles.figureList}>
                {filtered.map(f => (
                    <div
                        key={f.id}
                        className={`${styles.figureCardSmall} ${selectedId === f.id ? styles.figureCardSmallSelected : ''}`}
                        onClick={() => onSelectFigure(f.id)}
                    >
                        <div className={styles.figureCardSmallHeader}>
                            <div className={styles.figureCardSmallName}>{f.name}</div>
                            <span className={`${styles.figureCardSmallBadge} ${statusTag(f.status)}`}>
                                {statusLabel(f.status)}
                            </span>
                        </div>
                        <div className={styles.figureCardSmallMeta}>
                            {f.manufacturer && <span>{f.manufacturer}</span>}
                            {f.scale && <span>{f.scale}</span>}
                            {f.material && <span>{f.material}</span>}
                        </div>
                        <div className={styles.figureCardSmallActions}>
                            <button className={styles.cardActionBtn} onClick={(e) => { e.stopPropagation(); onEditFigure(f); }}>
                                {$t.editFigure}
                            </button>
                            <button className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`} onClick={(e) => { e.stopPropagation(); onDeleteFigure(f.id); }}>
                                {$t.deleteFigure}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}