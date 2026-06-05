import { useState, useEffect, useCallback } from 'react';
import { fetchFigures, updateFigureAPI, deleteFigureAPI, createFigureAPI, Figure } from '../services/apiFigures';
import styles from './FiguresApp.module.css';
import FigureModal from './FigureModal';
import ConfirmModal from './ConfirmModal';
import PromptModal from './PromptModal';
import FolderTree, { FolderTarget } from './FolderTree';
import ContextMenu from './ContextMenu';
import MarkdownEditor from './MarkdownEditor';
import placeholderImg from '../images/placeholder.png';
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
    const [images, setImages] = useState<any[]>([]);
    const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
    const [hoverMain, setHoverMain] = useState(false);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        target: FolderTarget;
    } | null>(null);
    const [newFigureFolder, setNewFigureFolder] = useState<string>('');
    const [promptOpen, setPromptOpen] = useState(false);
    const [promptTitle, setPromptTitle] = useState('');
    const [promptDefault, setPromptDefault] = useState('');
    const [promptCallback, setPromptCallback] = useState<(value: string) => void>(() => {});
    const [diskFolders, setDiskFolders] = useState<string[]>([]);

    const loadFigures = useCallback(async () => { try { setFigures(await fetchFigures()); } catch (err) { console.error(err); } }, []);
    useEffect(() => { loadFigures(); }, [loadFigures]);

    const loadDiskFolders = async () => {
        try {
            const api = (window as any).electronAPI;
            if (api?.listFolders) {
                const folders = await api.listFolders();
                setDiskFolders(folders.map((f: any) => f.path));
            }
        } catch (err) {
            console.error('Failed to load folders:', err);
        }
    };
    useEffect(() => { loadDiskFolders(); }, []);

    const filtered = figures.filter(f => {
        if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedFolder && f.folder_path !== selectedFolder) return false;
        return true;
    });

    const selected = figures.find(f => f.id === selectedId);

    useEffect(() => {
        if (selected) {
            if ((window as any).electronAPI?.readArticle) {
                (window as any).electronAPI.readArticle(selected.folder_path || '', selected.name).then((content: string) => {
                    const cleaned = content.replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/g, '[$1 - old image]');
                    setEditorContent(cleaned || selected.content || '');
                });
            } else {
                setEditorContent(selected.content || '');
            }
        }
    }, [selected]);

    useEffect(() => {
        // Временно отключено для отладки
        const handleKeyDown = (e: KeyboardEvent) => {};
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSave = async () => {
        if (!selected) return;
        if ((window as any).electronAPI?.writeArticle) {
            await (window as any).electronAPI.writeArticle(selected.folder_path || '', selected.name, editorContent);
        }
        await updateFigureAPI(selected.id, { content: editorContent });
        await loadFigures();
    };

    const navigateTo = (page: string) => { if (page === 'paints') window.location.href = 'paints.html'; else if (page === 'settings') window.location.href = 'settings.html'; else window.location.href = 'figures.html'; };

    const handleDeleteFigure = (id: number) => {
        setConfirmTitle($t.deleteFigure); setConfirmMessage($t.deleteFigureConfirm);
        setConfirmAction(() => async () => {
            const figure = figures.find(f => f.id === id);
            if (figure && (window as any).electronAPI?.deleteArticle) {
                await (window as any).electronAPI.deleteArticle(figure.folder_path || '', figure.name);
            }
            await deleteFigureAPI(id);
            setSelectedId(null);
            await loadFigures();
            setConfirmOpen(false);
        });
        setConfirmOpen(true);
    };

    const handleContextMenu = (e: React.MouseEvent, target: FolderTarget) => {
        setContextMenu({ x: e.clientX, y: e.clientY, target });
    };

    const handleNewFigure = (folderPath: string) => {
        setNewFigureFolder(folderPath);
        setEditingFigure(null);
        setModalOpen(true);
    };

    const handleNewFolder = async (parentPath: string) => {
        setPromptTitle($t.newFolder);
        setPromptDefault('');
        setPromptCallback(() => async (name: string) => {
            if (!name) return;
            const fullPath = parentPath ? `${parentPath}/${name}` : name;
            try {
                await (window as any).electronAPI?.createFolder(fullPath);
                await loadDiskFolders();
                await loadFigures();
            } catch (err) {
                console.error('Failed to create folder:', err);
            }
        });
        setPromptOpen(true);
    };

    const handleRename = async (target: FolderTarget) => {
        if (target.type === 'folder') {
            const currentName = target.path.split('/').pop() || '';
            setPromptTitle($t.renameFolder);
            setPromptDefault(currentName);
            setPromptCallback(() => async (newName: string) => {
                if (!newName || newName === currentName) return;
                try {
                    const parts = target.path.split('/');
                    parts[parts.length - 1] = newName;
                    const newPath = parts.join('/');

                    // Переименовываем папку на диске
                    await (window as any).electronAPI?.renameFolder(target.path, newPath);

                    // Обновляем folder_path у ВСЕХ фигурок, чей путь начинается с target.path
                    const figsToUpdate = figures.filter(f =>
                        f.folder_path === target.path || f.folder_path?.startsWith(target.path + '/')
                    );
                    for (const fig of figsToUpdate) {
                        const updatedPath = fig.folder_path === target.path
                            ? newPath
                            : newPath + fig.folder_path!.substring(target.path.length);
                        await updateFigureAPI(fig.id, { folder_path: updatedPath });
                    }

                    if (selectedFolder === target.path || selectedFolder?.startsWith(target.path + '/')) {
                        const updatedSelected = selectedFolder === target.path
                            ? newPath
                            : newPath + selectedFolder.substring(target.path.length);
                        setSelectedFolder(updatedSelected);
                    }

                    await loadDiskFolders();
                    await loadFigures();
                } catch (err) {
                    console.error('Failed to rename folder:', err);
                }
            });
            setPromptOpen(true);
        }
    };

    const handleDeleteTarget = (target: FolderTarget) => {
        if (target.type === 'folder') {
            setConfirmTitle($t.deleteFolderTitle);
            setConfirmMessage($t.deleteFolderConfirm.replace('{path}', target.path));
            setConfirmAction(() => async () => {
                // Найти ВСЕ фигурки в этой папке и всех вложенных
                const figsToDelete = figures.filter(f =>
                    f.folder_path === target.path || f.folder_path?.startsWith(target.path + '/')
                );

                // Удалить статьи с диска
                for (const fig of figsToDelete) {
                    if ((window as any).electronAPI?.deleteArticle) {
                        await (window as any).electronAPI.deleteArticle(fig.folder_path || '', fig.name);
                    }
                    await deleteFigureAPI(fig.id);
                }

                // Удалить папку с диска (рекурсивно)
                await (window as any).electronAPI?.deleteFolder?.(target.path);

                // Сбросить выбор, если был выбран элемент внутри удаляемой папки
                if (selectedFolder === target.path || selectedFolder?.startsWith(target.path + '/')) {
                    setSelectedFolder('');
                }
                if (selected && (selected.folder_path === target.path || selected.folder_path?.startsWith(target.path + '/'))) {
                    setSelectedId(null);
                }

                setConfirmOpen(false);
                await loadDiskFolders();
                await loadFigures();
            });
            setConfirmOpen(true);
        } else if (target.type === 'figure' && target.figureId) {
            handleDeleteFigure(target.figureId);
        }
    };

    const statusTag = (s: string) => { if (s === 'draft') return styles.tagNew; if (s === 'in-progress') return styles.tagProgress; if (s === 'completed') return styles.tagDone; return ''; };
    const statusLabel = (s: string) => { if (s === 'draft') return $t.draft; if (s === 'in-progress') return $t.inProgress; if (s === 'completed') return $t.completed; return s; };

    const loadImages = useCallback(async (figureId: number) => { try { const res = await fetch(`http://127.0.0.1:8765/api/figures/${figureId}/images`); const data = await res.json(); setImages(data); setSelectedImageId(data.length > 0 ? data[0].id : null); } catch (err) { console.error(err); } }, []);
    useEffect(() => { if (selectedId) loadImages(selectedId); else { setImages([]); setSelectedImageId(null); } }, [selectedId, loadImages]);

    const handleUploadImage = async (file: File) => { if (!selectedId) return; const r = new FileReader(); r.onload = async () => { const b64 = r.result as string; await fetch(`http://127.0.0.1:8765/api/figures/${selectedId}/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_data: b64.split(',')[1], content_type: file.type, filename: file.name }) }); await loadImages(selectedId); }; r.readAsDataURL(file); };

    const handleDeleteImage = (imgId: number) => { setConfirmTitle($t.deletePhoto); setConfirmMessage($t.deletePhotoConfirm); setConfirmAction(() => async () => { await fetch(`http://127.0.0.1:8765/api/figures/${selectedId}/images/${imgId}`, { method: 'DELETE' }); await loadImages(selectedId!); setConfirmOpen(false); }); setConfirmOpen(true); };

    const handleSetPrimary = async (imgId: number) => { if (!selectedId) return; await fetch(`http://127.0.0.1:8765/api/figures/${selectedId}/images/${imgId}/primary`, { method: 'PUT' }); await loadImages(selectedId); };

    useEffect(() => { const hp = (e: ClipboardEvent) => { if (!selectedId) return; const items = e.clipboardData?.items; if (!items) return; for (const item of Array.from(items)) { if (item.type.startsWith('image/')) { e.preventDefault(); const f = item.getAsFile(); if (f) handleUploadImage(f); return; } } }; document.addEventListener('paste', hp); return () => document.removeEventListener('paste', hp); }, [selectedId]);
    console.log('RENDER — selectedId:', selectedId, 'selectedFolder:', selectedFolder);
    return (
        <div className={styles.root}>
            <div className={styles.sidebar}><div className={styles.sidebarItem} onClick={() => navigateTo('paints')}>🎨</div><div className={`${styles.sidebarItem} ${styles.sidebarItemActive}`}>🧩</div><div className={styles.sidebarItem} onClick={() => navigateTo('settings')}>⚙️</div></div>
            <div className={styles.main}>
                <div className={`${styles.leftPanel} ${leftPanelCollapsed ? styles.leftPanelCollapsed : styles.leftPanelExpanded}`}>
                    <button className={styles.leftToggle} onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}>{leftPanelCollapsed ? '▶' : '◀'}</button>
                    {!leftPanelCollapsed && (<>
                        <div className={styles.panelHeader}>
                            <input className={styles.searchInput} placeholder={$t.search + '...'} value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <FolderTree
                            figures={figures}
                            diskFolders={diskFolders}
                            selectedId={selectedId}
                            selectedFolder={selectedFolder}
                            onSelectFigure={(id) => {
                                console.log('onSelectFigure called with id:', id);
                                setSelectedId(id);
                            }}
                            onSelectFolder={(path) => {
                                console.log('onSelectFolder called with path:', path);
                                setSelectedFolder(path);
                                setSelectedId(null);
                            }}
                            onDoubleClickFigure={(id) => {
                                const figure = figures.find(f => f.id === id);
                                if (figure) {
                                    setEditingFigure(figure);
                                    setModalOpen(true);
                                }
                            }}
                            onContextMenu={handleContextMenu}
                            searchQuery={search}
                        />
                    </>)}
                </div>
                <div className={styles.centerPanel}>
                    {selected ? (
                        <>
                            <div className={styles.centerHeader}><div className={styles.centerTitle}>{selected.name}</div></div>
                            <MarkdownEditor content={editorContent} onChange={setEditorContent} onSave={handleSave} figureName={selected?.name} folderPath={selected?.folder_path || ''} />
                        </>
                    ) : selectedFolder ? (
                        <div className={styles.figureGrid}>
                            {filtered.map(f => (
                                <div
                                    key={f.id}
                                    className={`${styles.figureCard} ${selectedId === f.id ? styles.figureCardSelected : ''}`}
                                    onClick={() => setSelectedId(f.id)}
                                    onDoubleClick={() => { setEditingFigure(f); setModalOpen(true); }}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardTitle}>{f.name}</div>
                                        <span className={`${styles.cardBadge} ${statusTag(f.status)}`}>{statusLabel(f.status)}</span>
                                    </div>
                                    <div className={styles.cardMeta}>
                                        {f.manufacturer && <span>{f.manufacturer}</span>}
                                        {f.scale && <span>{f.scale}</span>}
                                        {f.material && <span>{f.material}</span>}
                                    </div>
                                    <div className={styles.cardActions}>
                                        <button className={styles.cardBtn} onClick={(e) => { e.stopPropagation(); setEditingFigure(f); setModalOpen(true); }}>{$t.editFigure}</button>
                                        <button className={`${styles.cardBtn} ${styles.cardBtnDanger}`} onClick={(e) => { e.stopPropagation(); handleDeleteFigure(f.id); }}>{$t.deleteFigure}</button>
                                    </div>
                                </div>
                            ))}
                            {filtered.length === 0 && (
                                <div className={styles.emptyState}>{$t.noFigures}</div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.centerEmpty}>{$t.selectFigure}</div>
                    )}
                </div>
                <div className={styles.resizeHandle} />
                <div className={`${styles.rightPanel} ${rightPanelCollapsed ? styles.rightPanelCollapsed : styles.rightPanelExpanded}`}>
                    <button className={styles.rightToggle} onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}>{rightPanelCollapsed ? '◀' : '▶'}</button>
                    {!rightPanelCollapsed && (
                        selected ? (<>
                            <div className={styles.gallery}><div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', textAlign: 'center' }}>{selected.manufacturer ? `${selected.manufacturer} – ${selected.name}` : selected.name}</div>{selected.scale && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '12px' }}>[{selected.scale}]</div>}
                                {selectedImageId && images.length > 0 ? (<><div className={styles.galleryMain} onMouseEnter={() => setHoverMain(true)} onMouseLeave={() => setHoverMain(false)}><img src={`data:${images.find(i => i.id === selectedImageId)?.content_type || 'image/jpeg'};base64,${images.find(i => i.id === selectedImageId)?.image_data}`} alt="Selected" />{hoverMain && (<div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}><button onClick={(e) => { e.stopPropagation(); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) handleUploadImage(f); }; inp.click(); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>➕</button><button onClick={(e) => { e.stopPropagation(); handleSetPrimary(selectedImageId); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'var(--star-active)' }}>★</button><button onClick={(e) => { e.stopPropagation(); handleDeleteImage(selectedImageId); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>🗑</button></div>)}</div><div className={styles.galleryThumbnails}>{images.map((img: any) => (<div key={img.id} className={`${styles.thumbnail} ${selectedImageId === img.id ? styles.thumbnailActive : ''}`} onClick={() => setSelectedImageId(img.id)}><img src={`data:${img.content_type || 'image/jpeg'};base64,${img.image_data}`} alt={img.filename} /></div>))}</div></>) : (<div className={styles.galleryMain} onMouseEnter={() => setHoverMain(true)} onMouseLeave={() => setHoverMain(false)}><img src={placeholderImg} alt="No photo" style={{ opacity: 0.3 }} />{hoverMain && (<div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}><button onClick={(e) => { e.stopPropagation(); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) handleUploadImage(f); }; inp.click(); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>➕</button></div>)}</div>)}</div>
                            <div style={{ borderTop: '1px solid var(--border)', margin: '0 12px' }} /><div className={styles.detailsSection}><div className={styles.detailsLabel}>{$t.status}</div><div><span className={`${styles.tag} ${statusTag(selected.status)}`}>{statusLabel(selected.status)}</span></div>{selected.manufacturer && <><div className={styles.detailsLabel}>{$t.manufacturer}</div><div className={styles.detailsValue}>{selected.manufacturer}</div></>}{selected.scale && <><div className={styles.detailsLabel}>{$t.scale}</div><div className={styles.detailsValue}>{selected.scale}</div></>}{selected.material && <><div className={styles.detailsLabel}>{$t.material}</div><div className={styles.detailsValue}>{selected.material}</div></>}</div>
                        </>) : selectedFolder ? (
                            <div className={styles.folderInfo}>
                                <div className={styles.folderInfoTitle}>{selectedFolder.split('/').pop() || selectedFolder}</div>
                                <div className={styles.folderInfoPath}>{selectedFolder}</div>
                            </div>
                        ) : (
                            <div className={styles.folderInfo}>
                                <div className={styles.folderInfoTitle}>Potion Rack</div>
                            </div>
                        )
                    )}
                </div>
            </div>
            {modalOpen && <FigureModal figure={editingFigure} onSave={async (data) => { if (editingFigure) { await updateFigureAPI(editingFigure.id, data); } else { await createFigureAPI({ ...data, folder_path: newFigureFolder } as any); } await loadFigures(); }} onClose={() => setModalOpen(false)} />}
            {confirmOpen && <ConfirmModal title={confirmTitle} message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    target={contextMenu.target}
                    onClose={() => setContextMenu(null)}
                    onNewFigure={handleNewFigure}
                    onNewFolder={handleNewFolder}
                    onRename={handleRename}
                    onDelete={handleDeleteTarget}
                />
            )}
            {promptOpen && (
                <PromptModal
                    title={promptTitle}
                    defaultValue={promptDefault}
                    onConfirm={(value) => { setPromptOpen(false); promptCallback(value); }}
                    onCancel={() => setPromptOpen(false)}
                />
            )}
        </div>
    );
}