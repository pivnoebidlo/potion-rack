import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchFigures, updateFigureAPI, deleteFigureAPI, createFigureAPI, Figure } from '../services/apiFigures';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { marked } from 'marked';
import styles from './FiguresApp.module.css';
import FigureModal from './FigureModal';
import ConfirmModal from './ConfirmModal';
import placeholderImg from '../images/placeholder.png';
import { t } from '../i18n';

const imagePositions: { from: number; to: number }[] = [];

class ImagePreviewWidget extends WidgetType {
    constructor(readonly src: string, readonly alt: string, readonly from: number, readonly to: number, readonly view: EditorView) { super(); }
    toDOM() {
        const container = document.createElement('span'); container.style.display = 'inline-block'; container.style.margin = '4px 0'; container.style.verticalAlign = 'middle'; container.style.position = 'relative';
        const img = document.createElement('img'); img.src = this.src; img.alt = this.alt; img.style.maxWidth = '200px'; img.style.maxHeight = '200px'; img.style.borderRadius = '6px'; img.style.display = 'block'; img.style.objectFit = 'cover';
        const deleteBtn = document.createElement('button'); deleteBtn.textContent = '✕'; deleteBtn.style.position = 'absolute'; deleteBtn.style.top = '4px'; deleteBtn.style.right = '4px'; deleteBtn.style.background = 'rgba(0,0,0,0.6)'; deleteBtn.style.color = '#fff'; deleteBtn.style.border = 'none'; deleteBtn.style.borderRadius = '50%'; deleteBtn.style.width = '20px'; deleteBtn.style.height = '20px'; deleteBtn.style.fontSize = '12px'; deleteBtn.style.cursor = 'pointer'; deleteBtn.style.display = 'none';
        container.addEventListener('mouseenter', () => { deleteBtn.style.display = 'block'; }); container.addEventListener('mouseleave', () => { deleteBtn.style.display = 'none'; });
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.view.dispatch({ changes: { from: this.from, to: this.to } }); });
        container.appendChild(img); container.appendChild(deleteBtn); return container;
    }
}

function createImagePreviewPlugin(slug: string) {
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet;
        constructor(readonly view: EditorView) { this.decorations = this.buildDecorations(view); }
        update(update: ViewUpdate) { if (update.docChanged || update.viewportChanged) this.decorations = this.buildDecorations(update.view); }
        buildDecorations(view: EditorView) {
            imagePositions.length = 0;
            const widgets: { from: number; to: number; value: Decoration }[] = [];
            const doc = view.state.doc.toString();

            const base64Regex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
            let match;
            while ((match = base64Regex.exec(doc)) !== null) {
                const from = match.index, to = from + match[0].length, base64 = match[2];
                imagePositions.push({ from, to });
                widgets.push({ from, to, value: Decoration.replace({ widget: new ImagePreviewWidget(base64, match[1], from, to, view) }) });
            }

            const fileRegex = /!\[([^\]]*)\]\((\.\.?\/images\/[^)]+)\)/g;
            while ((match = fileRegex.exec(doc)) !== null) {
                const from = match.index, to = from + match[0].length;
                const filePath = match[2];
                imagePositions.push({ from, to });
                const relativePath = filePath.replace(/^\.\.?\//, '');
                const absoluteUrl = `http://127.0.0.1:8765/figures-data/${slug}/${relativePath}`;
                widgets.push({ from, to, value: Decoration.replace({ widget: new ImagePreviewWidget(absoluteUrl, match[1], from, to, view) }) });
            }

            return Decoration.set(widgets);
        }
    }, { decorations: v => v.decorations });
}

const editorTheme = EditorView.theme({
    '&': { background: 'var(--bg-primary)', color: 'var(--text-primary)' },
    '.cm-scroller': { background: 'var(--bg-primary)' },
    '.cm-content': { background: 'var(--bg-primary)', color: 'var(--text-primary)', caretColor: 'var(--text-primary)' },
    '.cm-gutters': { display: 'none' },
    '.cm-activeLineGutter': { display: 'none' },
    '.cm-activeLine': { background: 'var(--bg-hover)' },
    '.cm-cursor': { borderLeftColor: 'var(--text-primary)' },
    '.cm-selectionMatch': { background: 'var(--accent-light)' },
    '.cm-matchingBracket': { background: 'var(--accent-light)' },
});

function slugify(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-а-яё]/gi, '');
}

function MarkdownEditor({ content, onChange, onSave, figureName }: { content: string; onChange: (v: string) => void; onSave: () => void; figureName?: string }) {
    const $t = t();
    const [preview, setPreview] = useState(false);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const slug = figureName ? slugify(figureName) : '';

    useEffect(() => { imagePositions.length = 0; return () => { imagePositions.length = 0; }; }, [content]);

    useEffect(() => {
        const container = editorContainerRef.current; if (!container) return;
        const handlePaste = async (e: ClipboardEvent) => {
            const view = editorViewRef.current; if (!view || !view.hasFocus) return;
            const items = e.clipboardData?.items; if (!items) return;
            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        try {
                            const compressed = await compressImage(file, 240, 240, 0.7);
                            const base64Data = compressed.split(',')[1];
                            const name = figureName || 'unknown';
                            const result = await (window as any).electronAPI?.saveImage(name, file.name, base64Data);
                            if (result?.success) {
                                const imageMarkdown = `![${file.name}](.${result.path})`;
                                const { from } = view.state.selection.main;
                                view.dispatch({ changes: { from, insert: imageMarkdown + '\n' } });
                                onChange(view.state.doc.toString());
                            }
                        } catch (err) { console.error('Failed to insert image:', err); }
                    }
                    return;
                }
            }
        };
        container.addEventListener('paste', handlePaste);
        return () => container.removeEventListener('paste', handlePaste);
    }, [onChange, figureName]);

    const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); const ctx = canvas.getContext('2d'); if (!ctx) { reject(new Error('Canvas not available')); return; } ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', quality)); }; img.onerror = reject; img.src = reader.result as string; }; reader.onerror = reject; reader.readAsDataURL(file);
    });

    const resolvedContent = content
        .replace(/\(\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${slug}/images/`)
        .replace(/\(\.\.\/images\//g, `(http://127.0.0.1:8765/figures-data/${slug}/images/`);

    return (
        <div className={styles.editorRoot} ref={editorContainerRef}>
            <div className={styles.editorToolbar}><button onClick={() => setPreview(!preview)} className={styles.editorBtn}>{preview ? '✏️ ' + $t.edit : '👁 ' + $t.preview}</button><button onClick={onSave} className={`${styles.editorBtn} ${styles.editorBtnPrimary}`}>💾 {$t.saveContent}</button></div>
            {preview ? <div className={styles.previewPane} dangerouslySetInnerHTML={{ __html: marked(resolvedContent, { breaks: true }) as string }} /> : <div className={styles.editorPane}><CodeMirror value={content} onChange={onChange} onCreateEditor={(view) => { editorViewRef.current = view; }} extensions={[keymap.of([...defaultKeymap, ...historyKeymap]), history(), markdown({ base: markdownLanguage, codeLanguages: languages }), EditorView.lineWrapping, createImagePreviewPlugin(slug), editorTheme]} height="100%" style={{ height: '100%' }} /></div>}
        </div>
    );
}

export default function FiguresApp() {
    const $t = t();
    const [figures, setFigures] = useState<Figure[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

    const leftPanelRef = useRef<HTMLDivElement>(null);
    const selectedFigureRef = useRef<HTMLDivElement>(null);

    const loadFigures = useCallback(async () => { try { setFigures(await fetchFigures()); } catch (err) { console.error(err); } }, []);
    useEffect(() => { loadFigures(); }, [loadFigures]);
    useEffect(() => { if (figures.length > 0 && selectedId === null) setSelectedId(figures[0].id); }, [figures, selectedId]);

    const filtered = figures.filter(f => { if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false; if (statusFilter !== 'all' && f.status !== statusFilter) return false; return true; });
    const selected = figures.find(f => f.id === selectedId);

    useEffect(() => {
        if (selected) {
            if ((window as any).electronAPI?.readArticle) {
                (window as any).electronAPI.readArticle(selected.name).then((content: string) => {
                    const cleaned = content.replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/g, '[$1 - old image]');
                    setEditorContent(cleaned || selected.content || '');
                });
            } else {
                setEditorContent(selected.content || '');
            }
        }
    }, [selected]);

    useEffect(() => {
        if (selectedFigureRef.current && leftPanelRef.current) {
            const container = leftPanelRef.current;
            const row = selectedFigureRef.current;
            const rowTop = row.offsetTop;
            const rowHeight = row.offsetHeight;
            const scrollTop = container.scrollTop;
            const clientHeight = container.clientHeight;
            if (rowTop < scrollTop) { container.scrollTop = rowTop - 4; }
            else if (rowTop + rowHeight > scrollTop + clientHeight) { container.scrollTop = rowTop + rowHeight - clientHeight + 4; }
        }
    }, [selectedId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if ((e.target as HTMLElement).closest('.cm-editor')) return;
            if ((e.target as HTMLElement).closest('.cm-content')) return;
            if (document.getElementById('figure-modal-overlay')) return;
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const currentIndex = filtered.findIndex(f => f.id === selectedId); if (e.key === 'ArrowUp' && currentIndex > 0) setSelectedId(filtered[currentIndex - 1].id); else if (e.key === 'ArrowDown' && currentIndex < filtered.length - 1) setSelectedId(filtered[currentIndex + 1].id); }
            if (e.key === 'Enter' && selectedId) { const figure = figures.find(f => f.id === selectedId); if (figure) { setEditingFigure(figure); setModalOpen(true); } }
        };
        window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filtered, selectedId, figures]);

    const handleSave = async () => {
        if (!selected) return;
        if ((window as any).electronAPI?.writeArticle) {
            await (window as any).electronAPI.writeArticle(selected.name, editorContent);
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
                await (window as any).electronAPI.deleteArticle(figure.name);
            }
            await deleteFigureAPI(id);
            setSelectedId(null);
            await loadFigures();
            setConfirmOpen(false);
        });
        setConfirmOpen(true);
    };
    const statusTag = (s: string) => { if (s === 'draft') return styles.tagNew; if (s === 'in-progress') return styles.tagProgress; if (s === 'completed') return styles.tagDone; return ''; };
    const statusLabel = (s: string) => { if (s === 'draft') return $t.draft; if (s === 'in-progress') return $t.inProgress; if (s === 'completed') return $t.completed; return s; };

    const loadImages = useCallback(async (figureId: number) => { try { const res = await fetch(`http://127.0.0.1:8765/api/figures/${figureId}/images`); const data = await res.json(); setImages(data); setSelectedImageId(data.length > 0 ? data[0].id : null); } catch (err) { console.error(err); } }, []);
    useEffect(() => { if (selectedId) loadImages(selectedId); else { setImages([]); setSelectedImageId(null); } }, [selectedId, loadImages]);
    const handleUploadImage = async (file: File) => { if (!selectedId) return; const r = new FileReader(); r.onload = async () => { const b64 = r.result as string; await fetch(`http://127.0.0.1:8765/api/figures/${selectedId}/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_data: b64.split(',')[1], content_type: file.type, filename: file.name }) }); await loadImages(selectedId); }; r.readAsDataURL(file); };
    const handleDeleteImage = (imgId: number) => { setConfirmTitle($t.deletePhoto); setConfirmMessage($t.deletePhotoConfirm); setConfirmAction(() => async () => { await fetch(`http://127.0.0.1:8765/api/figures/${selectedId}/images/${imgId}`, { method: 'DELETE' }); await loadImages(selectedId!); setConfirmOpen(false); }); setConfirmOpen(true); };
    const handleSetPrimary = async (imgId: number) => { if (!selectedId) return; await fetch(`http://127.0.0.1:8765/api/figures/${selectedId}/images/${imgId}/primary`, { method: 'PUT' }); await loadImages(selectedId); };
    useEffect(() => { const hp = (e: ClipboardEvent) => { if (!selectedId) return; const items = e.clipboardData?.items; if (!items) return; for (const item of Array.from(items)) { if (item.type.startsWith('image/')) { e.preventDefault(); const f = item.getAsFile(); if (f) handleUploadImage(f); return; } } }; document.addEventListener('paste', hp); return () => document.removeEventListener('paste', hp); }, [selectedId]);

    return (
        <div className={styles.root}>
            <div className={styles.sidebar}><div className={styles.sidebarItem} onClick={() => navigateTo('paints')}>🎨</div><div className={`${styles.sidebarItem} ${styles.sidebarItemActive}`}>🧩</div><div className={styles.sidebarItem} onClick={() => navigateTo('settings')}>⚙️</div></div>
            <div className={styles.main}>
                <div className={`${styles.leftPanel} ${leftPanelCollapsed ? styles.leftPanelCollapsed : styles.leftPanelExpanded}`} ref={leftPanelRef}>
                    <button className={styles.leftToggle} onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}>{leftPanelCollapsed ? '▶' : '◀'}</button>
                    {!leftPanelCollapsed && (<>
                        <div className={styles.panelHeader}><input className={styles.searchInput} placeholder={$t.search + '...'} value={search} onChange={e => setSearch(e.target.value)} /><div className={styles.filterRow}><select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">{$t.all}</option><option value="draft">{$t.draft}</option><option value="in-progress">{$t.inProgress}</option><option value="completed">{$t.completed}</option></select><button className={styles.viewToggleBtn} onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>{viewMode === 'grid' ? '☰' : '⊞'}</button><button className={styles.addBtn} onClick={() => { setEditingFigure(null); setModalOpen(true); }}>+</button></div></div>
                        <div className={styles.figureList}>
                            {viewMode === 'grid' ? filtered.map(f => (<div key={f.id} ref={selectedId === f.id ? selectedFigureRef : null} className={`${styles.figureCard} ${selectedId === f.id ? styles.figureCardSelected : ''}`} onClick={() => setSelectedId(f.id)} onDoubleClick={() => { setEditingFigure(f); setModalOpen(true); }}><div className={styles.figureInfo}><div className={styles.figureName}>{f.name}</div><div className={styles.figureMeta}>{statusLabel(f.status)}{f.manufacturer ? ' · ' + f.manufacturer : ''}</div></div><div className={styles.figureActions}><button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); setEditingFigure(f); setModalOpen(true); }}>✏️</button><button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={(e) => { e.stopPropagation(); handleDeleteFigure(f.id); }}>🗑</button></div></div>)) : filtered.map(f => (<div key={f.id} ref={selectedId === f.id ? selectedFigureRef : null} onClick={() => setSelectedId(f.id)} onDoubleClick={() => { setEditingFigure(f); setModalOpen(true); }} className={`${styles.listItem} ${selectedId === f.id ? styles.listItemSelected : ''}`}><span>{f.name}</span><div className={styles.figureActions}><button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); setEditingFigure(f); setModalOpen(true); }}>✏️</button><button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={(e) => { e.stopPropagation(); handleDeleteFigure(f.id); }}>🗑</button></div></div>))}
                            {filtered.length === 0 && <div className={styles.emptyState}>{$t.noFigures}</div>}
                        </div>
                    </>)}
                </div>
                <div className={styles.centerPanel}>{selected ? (<><div className={styles.centerHeader}><div className={styles.centerTitle}>{selected.name}</div></div><MarkdownEditor content={editorContent} onChange={setEditorContent} onSave={handleSave} figureName={selected?.name} /></>) : <div className={styles.centerEmpty}>{$t.selectFigure}</div>}</div>
                <div className={styles.resizeHandle} />
                <div className={`${styles.rightPanel} ${rightPanelCollapsed ? styles.rightPanelCollapsed : styles.rightPanelExpanded}`}>
                    <button className={styles.rightToggle} onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}>{rightPanelCollapsed ? '◀' : '▶'}</button>
                    {!rightPanelCollapsed && selected && (<>
                        <div className={styles.gallery}><div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', textAlign: 'center' }}>{selected.manufacturer ? `${selected.manufacturer} – ${selected.name}` : selected.name}</div>{selected.scale && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '12px' }}>[{selected.scale}]</div>}
                            {selectedImageId && images.length > 0 ? (<><div className={styles.galleryMain} onMouseEnter={() => setHoverMain(true)} onMouseLeave={() => setHoverMain(false)}><img src={`data:${images.find(i => i.id === selectedImageId)?.content_type || 'image/jpeg'};base64,${images.find(i => i.id === selectedImageId)?.image_data}`} alt="Selected" />{hoverMain && (<div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}><button onClick={(e) => { e.stopPropagation(); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) handleUploadImage(f); }; inp.click(); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>➕</button><button onClick={(e) => { e.stopPropagation(); handleSetPrimary(selectedImageId); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'var(--star-active)' }}>★</button><button onClick={(e) => { e.stopPropagation(); handleDeleteImage(selectedImageId); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>🗑</button></div>)}</div><div className={styles.galleryThumbnails}>{images.map((img: any) => (<div key={img.id} className={`${styles.thumbnail} ${selectedImageId === img.id ? styles.thumbnailActive : ''}`} onClick={() => setSelectedImageId(img.id)}><img src={`data:${img.content_type || 'image/jpeg'};base64,${img.image_data}`} alt={img.filename} /></div>))}</div></>) : (<div className={styles.galleryMain} onMouseEnter={() => setHoverMain(true)} onMouseLeave={() => setHoverMain(false)}><img src={placeholderImg} alt="No photo" style={{ opacity: 0.3 }} />{hoverMain && (<div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}><button onClick={(e) => { e.stopPropagation(); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) handleUploadImage(f); }; inp.click(); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>➕</button></div>)}</div>)}</div>
                        <div style={{ borderTop: '1px solid var(--border)', margin: '0 12px' }} /><div className={styles.detailsSection}><div className={styles.detailsLabel}>{$t.status}</div><div><span className={`${styles.tag} ${statusTag(selected.status)}`}>{statusLabel(selected.status)}</span></div>{selected.manufacturer && <><div className={styles.detailsLabel}>{$t.manufacturer}</div><div className={styles.detailsValue}>{selected.manufacturer}</div></>}{selected.scale && <><div className={styles.detailsLabel}>{$t.scale}</div><div className={styles.detailsValue}>{selected.scale}</div></>}{selected.material && <><div className={styles.detailsLabel}>{$t.material}</div><div className={styles.detailsValue}>{selected.material}</div></>}</div>
                    </>)}
                </div>
            </div>
            {modalOpen && <FigureModal figure={editingFigure} onSave={async (data) => { if (editingFigure) { await updateFigureAPI(editingFigure.id, data); } else { await createFigureAPI(data as any); } await loadFigures(); }} onClose={() => setModalOpen(false)} />}
            {confirmOpen && <ConfirmModal title={confirmTitle} message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />}
        </div>
    );
}