import styles from './FiguresApp.module.css';
import TocPanel from './TocPanel';
import { Figure } from '../services/apiFigures';
import { t } from '../i18n';

interface RightPanelProps {
    collapsed: boolean;
    selected: Figure | undefined;
    selectedFolder: string;
    editorContent: string;
    folderStats: { total: number; inProgress: number; completed: number; subFolders: number } | null;
    filtered: Figure[];
    selectedId: number | null;
    infoCollapsed: boolean;
    tocCollapsed: boolean;
    helpCollapsed: boolean;
    onToggleCollapse: () => void;
    onToggleInfo: () => void;
    onToggleToc: () => void;
    onToggleHelp: () => void;
    onSelectFigure: (id: number) => void;
    onEditFigure: (f: Figure) => void;
    onDeleteFigure: (id: number) => void;
    onScrollToLine: (line: number) => void;
    statusTag: (s: string) => string;
    statusLabel: (s: string) => string;
    materialLabel: (m: string) => string;
    formatDate: (d?: string) => string;
}

export default function RightPanel({
                                       collapsed, selected, selectedFolder, editorContent, folderStats, filtered,
                                       selectedId, infoCollapsed, tocCollapsed, helpCollapsed,
                                       onToggleCollapse, onToggleInfo, onToggleToc, onToggleHelp,
                                       onSelectFigure, onEditFigure, onDeleteFigure, onScrollToLine,
                                       statusTag, statusLabel, materialLabel, formatDate,
                                   }: RightPanelProps) {
    const $t = t();

    return (
        <div className={`${styles.rightPanel} ${collapsed ? styles.rightPanelCollapsed : styles.rightPanelExpanded}`}>
            <button className={styles.rightToggle} onClick={onToggleCollapse}>{collapsed ? '◀' : '▶'}</button>
            {!collapsed && (
                selected ? (
                    <div className={styles.rightSections}>
                        <div className={styles.collapsibleSection}>
                            <div className={styles.collapsibleHeader} onClick={onToggleInfo}>
                                <span>{$t.info}</span><span className={styles.collapsibleArrow}>{infoCollapsed ? '▸' : '▾'}</span>
                            </div>
                            {!infoCollapsed && (
                                <div className={styles.collapsibleBody}>
                                    <div className={styles.detailsGrid}>
                                        <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.status}</div><div><span className={`${styles.tag} ${statusTag(selected.status)}`}>{statusLabel(selected.status)}</span></div></div>
                                        {selected.manufacturer && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.manufacturer}</div><div className={styles.detailValue}>{selected.manufacturer}</div></div>}
                                        {selected.scale && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.scale}</div><div className={styles.detailValue}>{selected.scale}</div></div>}
                                        {selected.material && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.material}</div><div className={styles.detailValue}>{materialLabel(selected.material)}</div></div>}
                                        {selected.purchase_date && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.purchaseDate}</div><div className={styles.detailValue}>{formatDate(selected.purchase_date)}</div></div>}
                                        {selected.completed_date && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.completedDate || 'Completion date'}</div><div className={styles.detailValue}>{formatDate(selected.completed_date)}</div></div>}
                                        {selected.shop_url && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.shopUrl || 'Shop Link'}</div><div className={styles.detailValue}><a href={selected.shop_url} target="_blank" style={{ color: 'var(--link-color, var(--accent))' }}>{$t.openInShop || 'Open in shop'}</a></div></div>}
                                        {selected.folder_path && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.folder}</div><div className={styles.detailValue}>{selected.folder_path}</div></div>}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles.collapsibleSection}>
                            <div className={styles.collapsibleHeader} onClick={onToggleToc}>
                                <span>{$t.toc}</span><span className={styles.collapsibleArrow}>{tocCollapsed ? '▸' : '▾'}</span>
                            </div>
                            {!tocCollapsed && <div className={styles.collapsibleBody}><TocPanel content={editorContent} onScrollToLine={onScrollToLine} /></div>}
                        </div>
                        <div className={styles.collapsibleSection}>
                            <div className={styles.collapsibleHeader} onClick={onToggleHelp}>
                                <span>{$t.help}</span><span className={styles.collapsibleArrow}>{helpCollapsed ? '▸' : '▾'}</span>
                            </div>
                            {!helpCollapsed && (
                                <div className={styles.collapsibleBody}>
                                    <div className={styles.helpSection}><div className={styles.helpSectionTitle}>{$t.helpNavigation}</div>
                                        <div className={styles.helpKey}><span>{$t.helpMove}</span><span><kbd>↑</kbd> <kbd>↓</kbd></span></div>
                                        <div className={styles.helpKey}><span>{$t.helpExpand}</span><span><kbd>→</kbd></span></div>
                                        <div className={styles.helpKey}><span>{$t.helpCollapse}</span><span><kbd>←</kbd></span></div>
                                    </div>
                                    <div className={styles.helpSection}><div className={styles.helpSectionTitle}>{$t.helpEditor}</div>
                                        <div className={styles.helpKey}><span>Bold</span><span><kbd>⌘</kbd> <kbd>B</kbd></span></div>
                                        <div className={styles.helpKey}><span>Italic</span><span><kbd>⌘</kbd> <kbd>I</kbd></span></div>
                                        <div className={styles.helpKey}><span>Link</span><span><kbd>⌘</kbd> <kbd>U</kbd></span></div>
                                        <div className={styles.helpKey}><span>Preview</span><span><kbd>⌘</kbd> <kbd>E</kbd></span></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : selectedFolder && folderStats ? (
                    <div className={styles.folderStatsPanel}>
                        <div className={styles.folderStatsHeader}><div className={styles.folderStatsName}>{selectedFolder.split('/').pop() || selectedFolder}</div><div className={styles.folderStatsPath}>{selectedFolder}</div></div>
                        <div className={styles.statsRow}>
                            <div className={styles.statMini}><div className={styles.statMiniValue}>{folderStats.total}</div><div className={styles.statMiniLabel}>Всего</div></div>
                            <div className={styles.statMini}><div className={`${styles.statMiniValue} ${styles.statWarning}`}>{folderStats.inProgress}</div><div className={styles.statMiniLabel}>В процессе</div></div>
                            <div className={styles.statMini}><div className={`${styles.statMiniValue} ${styles.statSuccess}`}>{folderStats.completed}</div><div className={styles.statMiniLabel}>Завершено</div></div>
                            <div className={styles.statMini}><div className={`${styles.statMiniValue} ${styles.statMuted}`}>{folderStats.subFolders}</div><div className={styles.statMiniLabel}>Папок</div></div>
                        </div>
                        <div className={styles.figureList}>
                            {filtered.map(f => (
                                <div key={f.id} className={`${styles.figureCardSmall} ${selectedId === f.id ? styles.figureCardSmallSelected : ''}`} onClick={() => onSelectFigure(f.id)}>
                                    <div className={styles.figureCardSmallHeader}><div className={styles.figureCardSmallName}>{f.name}</div><span className={`${styles.figureCardSmallBadge} ${statusTag(f.status)}`}>{statusLabel(f.status)}</span></div>
                                    <div className={styles.figureCardSmallMeta}>{f.manufacturer && <span>{f.manufacturer}</span>}{f.scale && <span>{f.scale}</span>}{f.material && <span>{f.material}</span>}</div>
                                    <div className={styles.figureCardSmallActions}>
                                        <button className={styles.cardActionBtn} onClick={(e) => { e.stopPropagation(); onEditFigure(f); }}>{$t.editFigure}</button>
                                        <button className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`} onClick={(e) => { e.stopPropagation(); onDeleteFigure(f.id); }}>{$t.deleteFigure}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={styles.helpPanel}>
                        <div className={styles.helpHeader}>{$t.help}</div>
                        <div className={styles.helpSection}><div className={styles.helpSectionTitle}>{$t.helpNavigation}</div>
                            <div className={styles.helpKey}><span>{$t.helpMove}</span><span><kbd>↑</kbd> <kbd>↓</kbd></span></div>
                            <div className={styles.helpKey}><span>{$t.helpExpand}</span><span><kbd>→</kbd></span></div>
                            <div className={styles.helpKey}><span>{$t.helpCollapse}</span><span><kbd>←</kbd></span></div>
                        </div>
                        <div className={styles.helpSection}><div className={styles.helpSectionTitle}>{$t.helpEditor}</div>
                            <div className={styles.helpKey}><span>Bold</span><span><kbd>⌘</kbd> <kbd>B</kbd></span></div>
                            <div className={styles.helpKey}><span>Italic</span><span><kbd>⌘</kbd> <kbd>I</kbd></span></div>
                            <div className={styles.helpKey}><span>Link</span><span><kbd>⌘</kbd> <kbd>U</kbd></span></div>
                            <div className={styles.helpKey}><span>Preview</span><span><kbd>⌘</kbd> <kbd>E</kbd></span></div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}