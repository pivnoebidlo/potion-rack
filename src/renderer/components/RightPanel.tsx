import styles from './FiguresApp.module.css';
import TocPanel from './TocPanel';
import { t } from '../i18n';
import { Figure } from '../types/figure';
import HelpSection from './HelpSection';
import FolderStatsPanel from './FolderStatsPanel';
import FigureInfoPanel from './FigureInfoPanel';

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
}

export default function RightPanel({
                                       collapsed, selected, selectedFolder, editorContent, folderStats, filtered,
                                       selectedId, infoCollapsed, tocCollapsed, helpCollapsed,
                                       onToggleCollapse, onToggleInfo, onToggleToc, onToggleHelp,
                                       onSelectFigure, onEditFigure, onDeleteFigure, onScrollToLine,
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
                                    <FigureInfoPanel selected={selected} />
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
                                    <HelpSection />
                                </div>
                            )}
                        </div>
                    </div>
                ) : selectedFolder && folderStats ? (
                    <FolderStatsPanel
                        selectedFolder={selectedFolder}
                        folderStats={folderStats}
                        filtered={filtered}
                        selectedId={selectedId}
                        onSelectFigure={onSelectFigure}
                        onEditFigure={onEditFigure}
                        onDeleteFigure={onDeleteFigure}
                    />
                ) : (
                    <div className={styles.helpPanel}>
                        <div className={styles.helpHeader}>{$t.help}</div>
                        <HelpSection />
                    </div>
                )
            )}
        </div>
    );
}