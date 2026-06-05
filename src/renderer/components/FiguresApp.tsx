import { marked } from 'marked';
import { EditorView } from '@codemirror/view';
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchFigures, updateFigureAPI, deleteFigureAPI, createFigureAPI, Figure } from '../services/apiFigures';
import styles from './FiguresApp.module.css';
import FigureModal from './FigureModal';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import FolderTree, { FolderTarget } from './FolderTree';
import ContextMenu from './ContextMenu';
import MarkdownEditor from './MarkdownEditor';
import TocPanel from './TocPanel';
import { t } from '../i18n';

export default function FiguresApp() {
    const $t = t();
    const [figures, setFigures] = useState<Figure[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<string>('');
    const [editorContent, setEditorContent] = useState('');
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingFigure, setEditingFigure] = useState<Figure | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: FolderTarget } | null>(null);
    const [newFigureFolder, setNewFigureFolder] = useState<string>('');
    const [promptOpen, setPromptOpen] = useState(false);
    const [promptTitle, setPromptTitle] = useState('');
    const [promptDefault, setPromptDefault] = useState('');
    const [promptCallback, setPromptCallback] = useState<(value: string) => void>(() => {});
    const [diskFolders, setDiskFolders] = useState<string[]>([]);
    const [infoCollapsed, setInfoCollapsed] = useState(false);
    const [tocCollapsed, setTocCollapsed] = useState(false);
    const [helpCollapsed, setHelpCollapsed] = useState(true);

    const editorViewRef = useRef<EditorView | null>(null);

    const loadFigures = useCallback(async () => { try { setFigures(await fetchFigures()); } catch (err) { console.error(err); } }, []);
    useEffect(() => { loadFigures(); }, [loadFigures]);

    const loadDiskFolders = async () => {
        try {
            const api = (window as any).electronAPI;
            if (api?.listFolders) { const folders = await api.listFolders(); setDiskFolders(folders.map((f: any) => f.path)); }
        } catch (err) { console.error('Failed to load folders:', err); }
    };
    useEffect(() => { loadDiskFolders(); }, []);

    const selected = figures.find(f => f.id === selectedId);

    const allFiguresInFolder = selectedFolder
        ? figures.filter(f => f.folder_path === selectedFolder || f.folder_path?.startsWith(selectedFolder + '/'))
        : [];

    const filtered = allFiguresInFolder.filter(f => {
        if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    useEffect(() => {
        if (selected) {
            if ((window as any).electronAPI?.readArticle) {
                (window as any).electronAPI.readArticle(selected.folder_path || '', selected.name).then((content: string) => {
                    const cleaned = content.replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/g, '[$1 - old image]');
                    setEditorContent(cleaned || selected.content || '');
                });
            } else { setEditorContent(selected.content || ''); }
        }
    }, [selected]);

    useEffect(() => {
        const hkd = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if ((e.target as HTMLElement).closest('.cm-editor')) return;
            if ((e.target as HTMLElement).closest('.cm-content')) return;
            if (document.getElementById('figure-modal-overlay')) return;
        };
        window.addEventListener('keydown', hkd); return () => window.removeEventListener('keydown', hkd);
    }, []);

    const handleSave = async () => {
        if (!selected) return;
        if ((window as any).electronAPI?.writeArticle) await (window as any).electronAPI.writeArticle(selected.folder_path || '', selected.name, editorContent);
        await updateFigureAPI(selected.id, { content: editorContent });
        await loadFigures();
    };

    const navigateTo = (page: string) => { if (page === 'paints') window.location.href = 'paints.html'; else if (page === 'settings') window.location.href = 'settings.html'; else window.location.href = 'figures.html'; };

    const handleDeleteFigure = (id: number) => {
        setConfirmTitle($t.deleteFigure); setConfirmMessage($t.deleteFigureConfirm);
        setConfirmAction(() => async () => {
            const figure = figures.find(f => f.id === id);
            if (figure && (window as any).electronAPI?.deleteArticle) await (window as any).electronAPI.deleteArticle(figure.folder_path || '', figure.name);
            await deleteFigureAPI(id); setSelectedId(null); await loadFigures(); setConfirmOpen(false);
        });
        setConfirmOpen(true);
    };

    const handleContextMenu = (e: React.MouseEvent, target: FolderTarget) => setContextMenu({ x: e.clientX, y: e.clientY, target });

    const handleNewFigure = (folderPath: string) => { setNewFigureFolder(folderPath); setEditingFigure(null); setModalOpen(true); };

    const handleNewFolder = async (parentPath: string) => {
        setPromptTitle($t.newFolder); setPromptDefault('');
        setPromptCallback(() => async (name: string) => {
            if (!name) return;
            const fullPath = parentPath ? `${parentPath}/${name}` : name;
            try { await (window as any).electronAPI?.createFolder(fullPath); await loadDiskFolders(); await loadFigures(); }
            catch (err) { console.error('Failed to create folder:', err); }
        });
        setPromptOpen(true);
    };

    const handleRename = async (target: FolderTarget) => {
        if (target.type === 'folder') {
            const currentName = target.path.split('/').pop() || '';
            setPromptTitle($t.renameFolder); setPromptDefault(currentName);
            setPromptCallback(() => async (newName: string) => {
                if (!newName || newName === currentName) return;
                try {
                    const parts = target.path.split('/'); parts[parts.length - 1] = newName; const newPath = parts.join('/');
                    await (window as any).electronAPI?.renameFolder(target.path, newPath);
                    const figsToUpdate = figures.filter(f => f.folder_path === target.path || f.folder_path?.startsWith(target.path + '/'));
                    for (const fig of figsToUpdate) {
                        const updatedPath = fig.folder_path === target.path ? newPath : newPath + fig.folder_path!.substring(target.path.length);
                        await updateFigureAPI(fig.id, { folder_path: updatedPath });
                    }
                    if (selectedFolder === target.path || selectedFolder?.startsWith(target.path + '/')) {
                        const updatedSelected = selectedFolder === target.path ? newPath : newPath + selectedFolder.substring(target.path.length);
                        setSelectedFolder(updatedSelected);
                    }
                    await loadDiskFolders(); await loadFigures();
                } catch (err) { console.error('Failed to rename folder:', err); }
            });
            setPromptOpen(true);
        } else if (target.type === 'figure' && target.figureId) {
            const figure = figures.find(f => f.id === target.figureId);
            if (!figure) return;
            setPromptTitle($t.renameFigure); setPromptDefault(figure.name);
            setPromptCallback(() => async (newName: string) => {
                if (!newName || newName === figure.name) return;
                try {
                    await (window as any).electronAPI?.renameFigureFolder(figure.folder_path || '', figure.name, newName);
                    await updateFigureAPI(figure.id, { name: newName });
                    await loadFigures();
                } catch (err) { console.error('Failed to rename figure:', err); }
            });
            setPromptOpen(true);
        }
    };

    const handleDeleteTarget = (target: FolderTarget) => {
        if (target.type === 'folder') {
            setConfirmTitle($t.deleteFolderTitle); setConfirmMessage($t.deleteFolderConfirm.replace('{path}', target.path));
            setConfirmAction(() => async () => {
                const figsInFolder = figures.filter(f => f.folder_path === target.path || f.folder_path?.startsWith(target.path + '/'));
                for (const fig of figsInFolder) {
                    if ((window as any).electronAPI?.deleteArticle) await (window as any).electronAPI.deleteArticle(fig.folder_path || '', fig.name);
                    await deleteFigureAPI(fig.id);
                }
                await (window as any).electronAPI?.deleteFolder?.(target.path);
                setConfirmOpen(false); setSelectedId(null); setSelectedFolder('');
                await loadDiskFolders(); await loadFigures();
            });
            setConfirmOpen(true);
        } else if (target.type === 'figure' && target.figureId) handleDeleteFigure(target.figureId);
    };

    const handleMoveFigure = async (figureId: number, figureName: string, oldFolderPath: string, newFolderPath: string) => {
        try {
            await (window as any).electronAPI?.moveFigure(oldFolderPath, figureName, newFolderPath);
            await updateFigureAPI(figureId, { folder_path: newFolderPath || null });
            if (selectedId === figureId) setSelectedId(null);
            await loadDiskFolders(); await loadFigures();
        } catch (err) { console.error('Failed to move figure:', err); }
    };

    const handleExportPdf = async (target: FolderTarget) => {
        if (target.type !== 'figure' || !target.figureId) return;
        const figure = figures.find(f => f.id === target.figureId);
        if (!figure) return;
        try {
            const content = await (window as any).electronAPI?.readArticle(figure.folder_path || '', figure.name);
            const slug = (figure.folder_path ? `${figure.folder_path}/` : '') + figure.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/gi, '');
            const resolvedContent = (content || '').replace(/\(\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${slug}/images/`).replace(/\(\.\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${slug}/images/`);
            const htmlContent = marked(resolvedContent);
            await (window as any).electronAPI?.exportPdf(figure.folder_path || '', figure.name, htmlContent);
        } catch (err) { console.error('Export PDF failed:', err); }
    };

    const handleMoveFolder = async (oldPath: string, newPath: string) => {
        try {
            await (window as any).electronAPI?.moveFolder(oldPath, newPath);
            const figsToUpdate = figures.filter(f => f.folder_path === oldPath || f.folder_path?.startsWith(oldPath + '/'));
            for (const fig of figsToUpdate) {
                const updatedPath = fig.folder_path === oldPath ? newPath : newPath + fig.folder_path!.substring(oldPath.length);
                await updateFigureAPI(fig.id, { folder_path: updatedPath });
            }
            if (selectedFolder === oldPath || selectedFolder?.startsWith(oldPath + '/')) {
                const updatedSelected = selectedFolder === oldPath ? newPath : newPath + selectedFolder.substring(oldPath.length);
                setSelectedFolder(updatedSelected);
            }
            await loadDiskFolders(); await loadFigures();
        } catch (err) { console.error('Failed to move folder:', err); }
    };

    const handleScrollToLine = (line: number) => {
        const view = editorViewRef.current;
        if (!view) return;
        const pos = view.state.doc.line(line).from;
        view.dispatch({ selection: { anchor: pos, head: pos } });
        view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
        view.focus();
    };

    const statusTag = (s: string) => { if (s === 'draft') return styles.tagNew; if (s === 'in-progress') return styles.tagProgress; if (s === 'completed') return styles.tagDone; return ''; };
    const statusLabel = (s: string) => { if (s === 'draft') return $t.draft; if (s === 'in-progress') return $t.inProgress; if (s === 'completed') return $t.completed; return s; };

    const folderStats = selectedFolder ? {
        total: allFiguresInFolder.length,
        inProgress: allFiguresInFolder.filter(f => f.status === 'in-progress').length,
        completed: allFiguresInFolder.filter(f => f.status === 'completed').length,
        subFolders: diskFolders.filter(f => f.startsWith(selectedFolder + '/')).length,
    } : null;

    console.log('RENDER — selectedId:', selectedId, 'selectedFolder:', selectedFolder);
    return (
        <div className={styles.root}>
            <div className={styles.sidebar}>
                <div className={styles.sidebarItem} onClick={() => navigateTo('paints')}>🎨</div>
                <div className={`${styles.sidebarItem} ${styles.sidebarItemActive}`}>🧩</div>
                <div className={styles.sidebarItem} onClick={() => navigateTo('settings')}>⚙️</div>
            </div>
            <div className={styles.main}>
                <div className={`${styles.leftPanel} ${leftPanelCollapsed ? styles.leftPanelCollapsed : styles.leftPanelExpanded}`}>
                    <button className={styles.leftToggle} onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}>{leftPanelCollapsed ? '▶' : '◀'}</button>
                    {!leftPanelCollapsed && (<>
                        <div className={styles.panelHeader}>
                            <input className={styles.searchInput} placeholder={$t.search + '...'} value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <FolderTree
                            figures={figures} diskFolders={diskFolders} selectedId={selectedId} selectedFolder={selectedFolder}
                            onSelectFigure={(id) => setSelectedId(id)}
                            onSelectFolder={(path) => { setSelectedFolder(path); setSelectedId(null); }}
                            onDoubleClickFigure={(id) => { const figure = figures.find(f => f.id === id); if (figure) { setEditingFigure(figure); setModalOpen(true); } }}
                            onContextMenu={handleContextMenu} onMoveFigure={handleMoveFigure} onMoveFolder={handleMoveFolder} searchQuery={search}
                        />
                    </>)}
                </div>
                <div className={styles.centerPanel}>
                    {selected ? (
                        <>
                            <div className={styles.centerHeader}><div className={styles.centerTitle}>{selected.name}</div></div>
                            <MarkdownEditor content={editorContent} onChange={setEditorContent} onSave={handleSave}
                                            figureName={selected?.name} folderPath={selected?.folder_path || ''} editorViewRef={editorViewRef} />
                        </>
                    ) : (
                        <div className={styles.centerEmpty}>{$t.selectFigure}</div>
                    )}
                </div>
                <div className={styles.resizeHandle} />
                <div className={`${styles.rightPanel} ${rightPanelCollapsed ? styles.rightPanelCollapsed : styles.rightPanelExpanded}`}>
                    <button className={styles.rightToggle} onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}>{rightPanelCollapsed ? '◀' : '▶'}</button>
                    {!rightPanelCollapsed && (
                        selected ? (
                            <div className={styles.rightSections}>
                                <div className={styles.collapsibleSection}>
                                    <div className={styles.collapsibleHeader} onClick={() => setInfoCollapsed(!infoCollapsed)}>
                                        <span>{$t.info}</span><span className={styles.collapsibleArrow}>{infoCollapsed ? '▸' : '▾'}</span>
                                    </div>
                                    {!infoCollapsed && (
                                        <div className={styles.collapsibleBody}>
                                            <div className={styles.detailsGrid}>
                                                <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.status}</div><div><span className={`${styles.tag} ${statusTag(selected.status)}`}>{statusLabel(selected.status)}</span></div></div>
                                                {selected.manufacturer && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.manufacturer}</div><div className={styles.detailValue}>{selected.manufacturer}</div></div>}
                                                {selected.scale && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.scale}</div><div className={styles.detailValue}>{selected.scale}</div></div>}
                                                {selected.material && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.material}</div><div className={styles.detailValue}>{selected.material}</div></div>}
                                                {selected.folder_path && <div className={styles.detailItem}><div className={styles.detailLabel}>{$t.folder}</div><div className={styles.detailValue}>{selected.folder_path}</div></div>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.collapsibleSection}>
                                    <div className={styles.collapsibleHeader} onClick={() => setTocCollapsed(!tocCollapsed)}>
                                        <span>{$t.toc}</span><span className={styles.collapsibleArrow}>{tocCollapsed ? '▸' : '▾'}</span>
                                    </div>
                                    {!tocCollapsed && <div className={styles.collapsibleBody}><TocPanel content={editorContent} onScrollToLine={handleScrollToLine} /></div>}
                                </div>
                                <div className={styles.collapsibleSection}>
                                    <div className={styles.collapsibleHeader} onClick={() => setHelpCollapsed(!helpCollapsed)}>
                                        <span>{$t.help}</span><span className={styles.collapsibleArrow}>{helpCollapsed ? '▸' : '▾'}</span>
                                    </div>
                                    {!helpCollapsed && (
                                        <div className={styles.collapsibleBody}>
                                            <div className={styles.helpSection}><div className={styles.helpSectionTitle}>Навигация</div>
                                                <div className={styles.helpKey}><span>{$t.helpMove}</span><span><kbd>↑</kbd> <kbd>↓</kbd></span></div>
                                                <div className={styles.helpKey}><span>{$t.helpExpand}</span><span><kbd>→</kbd></span></div>
                                                <div className={styles.helpKey}><span>{$t.helpCollapse}</span><span><kbd>←</kbd></span></div>
                                            </div>
                                            <div className={styles.helpSection}><div className={styles.helpSectionTitle}>Редактор</div>
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
                                        <div key={f.id} className={`${styles.figureCardSmall} ${selectedId === f.id ? styles.figureCardSmallSelected : ''}`} onClick={() => setSelectedId(f.id)}>
                                            <div className={styles.figureCardSmallHeader}><div className={styles.figureCardSmallName}>{f.name}</div><span className={`${styles.figureCardSmallBadge} ${statusTag(f.status)}`}>{statusLabel(f.status)}</span></div>
                                            <div className={styles.figureCardSmallMeta}>{f.manufacturer && <span>{f.manufacturer}</span>}{f.scale && <span>{f.scale}</span>}{f.material && <span>{f.material}</span>}</div>
                                            <div className={styles.figureCardSmallActions}>
                                                <button className={styles.cardActionBtn} onClick={(e) => { e.stopPropagation(); setEditingFigure(f); setModalOpen(true); }}>{$t.editFigure}</button>
                                                <button className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`} onClick={(e) => { e.stopPropagation(); handleDeleteFigure(f.id); }}>{$t.deleteFigure}</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.helpPanel}>
                                <div className={styles.helpHeader}>{$t.help}</div>
                                <div className={styles.helpSection}>
                                    <div className={styles.helpSectionTitle}>{$t.helpNavigation}</div>
                                    <div className={styles.helpKey}><span>{$t.helpMove}</span><span><kbd>↑</kbd> <kbd>↓</kbd></span></div>
                                    <div className={styles.helpKey}><span>{$t.helpExpand}</span><span><kbd>→</kbd></span></div>
                                    <div className={styles.helpKey}><span>{$t.helpCollapse}</span><span><kbd>←</kbd></span></div>
                                </div>
                                <div className={styles.helpSection}>
                                    <div className={styles.helpSectionTitle}>{$t.helpEditor}</div>
                                    <div className={styles.helpKey}><span>Bold</span><span><kbd>⌘</kbd> <kbd>B</kbd></span></div>
                                    <div className={styles.helpKey}><span>Italic</span><span><kbd>⌘</kbd> <kbd>I</kbd></span></div>
                                    <div className={styles.helpKey}><span>Link</span><span><kbd>⌘</kbd> <kbd>U</kbd></span></div>
                                    <div className={styles.helpKey}><span>Preview</span><span><kbd>⌘</kbd> <kbd>E</kbd></span></div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
            {modalOpen && <FigureModal figure={editingFigure} onSave={async (data) => { if (editingFigure) { await updateFigureAPI(editingFigure.id, data); } else { await createFigureAPI({ ...data, folder_path: newFigureFolder } as any); } await loadFigures(); }} onClose={() => setModalOpen(false)} />}
            {confirmOpen && <ConfirmModal title={confirmTitle} message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />}
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} target={contextMenu.target} onClose={() => setContextMenu(null)} onNewFigure={handleNewFigure} onNewFolder={handleNewFolder} onRename={handleRename} onExportPdf={handleExportPdf} onDelete={handleDeleteTarget} />}
            {promptOpen && <PromptModal title={promptTitle} defaultValue={promptDefault} onConfirm={(value) => { setPromptOpen(false); promptCallback(value); }} onCancel={() => setPromptOpen(false)} />}
        </div>
    );
}