import { marked } from 'marked';
import { EditorView } from '@codemirror/view';
import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './FiguresApp.module.css';
import FolderTree, { FolderTarget } from './FolderTree';
import MarkdownEditor from './MarkdownEditor';
import RightPanel from './RightPanel';
import { t } from '../i18n';
import { fetchFigures, updateFigureAPI, deleteFigureAPI } from '../services/apiFigures';
import { Figure } from '../types/figure';
import FiguresModals from './FiguresModals';

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
    const [showIndicators, setShowIndicators] = useState(true);
    const [showCounters, setShowCounters] = useState(true);

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

    useEffect(() => {
        const saved = localStorage.getItem('potion-rack-show-indicators');
        if (saved !== null) setShowIndicators(saved === 'true');
    }, []);
    useEffect(() => {
        const saved = localStorage.getItem('potion-rack-show-counters');
        if (saved !== null) setShowCounters(saved === 'true');
    }, []);

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
            // Сразу показываем контент из БД
            setEditorContent(selected.content || '');
            // Асинхронно подгружаем свежий с диска
            if ((window as any).electronAPI?.readArticle) {
                (window as any).electronAPI.readArticle(selected.folder_path || '', selected.name).then((content: string) => {
                    const cleaned = content.replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/g, '[$1 - old image]');
                    if (cleaned !== selected.content) {
                        setEditorContent(cleaned || selected.content || '');
                    }
                });
            }
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
        if (!editorContent.trim()) return;
        if ((window as any).electronAPI?.writeArticle) await (window as any).electronAPI.writeArticle(selected.folder_path || '', selected.name, editorContent);
        await updateFigureAPI(selected.id, { content: editorContent });
        await loadFigures();
    };

    const handleSelectFigure = async (id: number) => {
        // Сохраняем текущую статью перед переключением
        if (selected && editorContent !== selected.content) {
            if (editorContent.trim()) {
                if ((window as any).electronAPI?.writeArticle) {
                    await (window as any).electronAPI.writeArticle(selected.folder_path || '', selected.name, editorContent);
                }
                await updateFigureAPI(selected.id, { content: editorContent });
                // Обновляем figures в памяти сразу
                setFigures(prev => prev.map(f => f.id === selected.id ? { ...f, content: editorContent } : f));
            }
        }
        // Синхронно устанавливаем контент новой статьи
        const newFigure = figures.find(f => f.id === id);
        if (newFigure) {
            setEditorContent(newFigure.content || '');
        }
        setSelectedId(id);
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
            const slug = (figure.folder_path ? `${figure.folder_path}/` : '') + (figure.name || '');
            const safeSlug = encodeURIComponent(slug);
            let resolvedContent = content || '';

            // Шаг 1: вырезаем размеры
            const sizeMap: Record<string, { w?: string; h?: string }> = {};
            resolvedContent = resolvedContent.replace(
                /!\[([^\]]*)\]\((\.\.?\/images\/[^)]+?)\s*=\s*(\d+)?x?(\d+)?\)/g,
                (match, alt, path, w, h) => {
                    sizeMap[path] = { w, h };
                    return `![${alt}](${path})`;
                }
            );

            // Шаг 2: заменяем пути на HTTP
            resolvedContent = resolvedContent.replace(/\(\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${safeSlug}/images/`);
            resolvedContent = resolvedContent.replace(/\(\.\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${safeSlug}/images/`);

            // Шаг 3: применяем размеры
            resolvedContent = resolvedContent.replace(
                /!\[([^\]]*)\]\((http:\/\/127\.0\.0\.1:8765\/figures-data\/[^)]+?)\)/g,
                (match, alt, url) => {
                    const origPath = Object.keys(sizeMap).find(p => url.endsWith(p.replace(/^\.\.?\/images\//, '')));
                    const size = origPath ? sizeMap[origPath] : null;
                    let attrs = `src="${url}" alt="${alt}"`;
                    if (size?.w) attrs += ` width="${size.w}"`;
                    if (size?.h) attrs += ` height="${size.h}"`;
                    if (!size?.w && !size?.h) attrs += ' style="max-width:100%;max-height:500px;display:block;margin:12px auto;border-radius:6px;"';
                    return `<img ${attrs} />`;
                }
            );

            const htmlContent = marked(resolvedContent) as string;
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

    const folderStats = selectedFolder ? {
        total: allFiguresInFolder.length,
        inProgress: allFiguresInFolder.filter(f => f.status === 'in-progress').length,
        completed: allFiguresInFolder.filter(f => f.status === 'completed').length,
        subFolders: diskFolders.filter(f => f.startsWith(selectedFolder + '/')).length,
    } : null;

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
                            onSelectFigure={handleSelectFigure}
                            onSelectFolder={(path) => { setSelectedFolder(path); setSelectedId(null); }}
                            onDoubleClickFigure={(id) => { const figure = figures.find(f => f.id === id); if (figure) { setEditingFigure(figure); setModalOpen(true); } }}
                            onContextMenu={handleContextMenu} onMoveFigure={handleMoveFigure} onMoveFolder={handleMoveFolder} searchQuery={search}
                            showIndicators={showIndicators} showCounters={showCounters}
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
                <RightPanel
                    collapsed={rightPanelCollapsed}
                    selected={selected}
                    selectedFolder={selectedFolder}
                    editorContent={editorContent}
                    folderStats={folderStats}
                    filtered={filtered}
                    selectedId={selectedId}
                    infoCollapsed={infoCollapsed}
                    tocCollapsed={tocCollapsed}
                    helpCollapsed={helpCollapsed}
                    onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                    onToggleInfo={() => setInfoCollapsed(!infoCollapsed)}
                    onToggleToc={() => setTocCollapsed(!tocCollapsed)}
                    onToggleHelp={() => setHelpCollapsed(!helpCollapsed)}
                    onSelectFigure={handleSelectFigure}
                    onEditFigure={(f) => { setEditingFigure(f); setModalOpen(true); }}
                    onDeleteFigure={handleDeleteFigure}
                    onScrollToLine={handleScrollToLine}
                />
            </div>
            <FiguresModals
                modalOpen={modalOpen}
                editingFigure={editingFigure}
                newFigureFolder={newFigureFolder}
                confirmOpen={confirmOpen}
                confirmTitle={confirmTitle}
                confirmMessage={confirmMessage}
                confirmAction={confirmAction}
                contextMenu={contextMenu}
                promptOpen={promptOpen}
                promptTitle={promptTitle}
                promptDefault={promptDefault}
                promptCallback={promptCallback}
                onCloseModal={() => setModalOpen(false)}
                onCloseConfirm={() => setConfirmOpen(false)}
                onCloseContextMenu={() => setContextMenu(null)}
                onClosePrompt={() => setPromptOpen(false)}
                onConfirmPrompt={(value) => promptCallback(value)}
                onSaveFigure={loadFigures}
                onNewFigure={handleNewFigure}
                onNewFolder={handleNewFolder}
                onRename={handleRename}
                onExportPdf={handleExportPdf}
                onDeleteTarget={handleDeleteTarget}
            />
        </div>
    );
}