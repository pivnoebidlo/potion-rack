import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchFigures, updateFigureAPI, deleteFigureAPI, createFigureAPI, Figure } from '../services/apiFigures';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { marked } from 'marked';
import styles from './FiguresApp.module.css';
import FigureModal from './FigureModal';
import ConfirmModal from './ConfirmModal';
import { t } from '../i18n';
import { showToast } from './Toast';

const imagePositions: { from: number; to: number }[] = [];

class ImagePreviewWidget extends WidgetType {
    constructor(readonly base64: string, readonly alt: string, readonly from: number, readonly to: number, readonly view: EditorView) { super(); }
    toDOM() {
        const container = document.createElement('span');
        container.style.display = 'inline-block'; container.style.margin = '4px 0'; container.style.verticalAlign = 'middle'; container.style.position = 'relative';
        const img = document.createElement('img'); img.src = this.base64; img.alt = this.alt; img.style.maxWidth = '200px'; img.style.maxHeight = '200px'; img.style.borderRadius = '6px'; img.style.display = 'block'; img.style.objectFit = 'cover';
        const deleteBtn = document.createElement('button'); deleteBtn.textContent = '✕'; deleteBtn.style.position = 'absolute'; deleteBtn.style.top = '4px'; deleteBtn.style.right = '4px'; deleteBtn.style.background = 'rgba(0,0,0,0.6)'; deleteBtn.style.color = '#fff'; deleteBtn.style.border = 'none'; deleteBtn.style.borderRadius = '50%'; deleteBtn.style.width = '20px'; deleteBtn.style.height = '20px'; deleteBtn.style.fontSize = '12px'; deleteBtn.style.cursor = 'pointer'; deleteBtn.style.display = 'none';
        container.addEventListener('mouseenter', () => { deleteBtn.style.display = 'block'; }); container.addEventListener('mouseleave', () => { deleteBtn.style.display = 'none'; });
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.view.dispatch({ changes: { from: this.from, to: this.to } }); });
        container.appendChild(img); container.appendChild(deleteBtn); return container;
    }
}

const imagePreviewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    constructor(readonly view: EditorView) { this.decorations = this.buildDecorations(view); }
    update(update: ViewUpdate) { if (update.docChanged || update.viewportChanged) this.decorations = this.buildDecorations(update.view); }
    buildDecorations(view: EditorView) {
        imagePositions.length = 0;
        const widgets: { from: number; to: number; value: Decoration }[] = [];
        const doc = view.state.doc.toString();
        const regex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g; let match;
        while ((match = regex.exec(doc)) !== null) {
            const from = match.index, to = from + match[0].length, base64 = match[2];
            imagePositions.push({ from, to });
            widgets.push({ from, to, value: Decoration.replace({ widget: new ImagePreviewWidget(base64, match[1], from, to, view) }) });
        }
        return Decoration.set(widgets);
    }
}, { decorations: v => v.decorations });

function FigureCard({ figure, selected, onClick, onDoubleClick }: { figure: Figure; selected: boolean; onClick: () => void; onDoubleClick: () => void }) {
    return <div onClick={onClick} onDoubleClick={onDoubleClick} className={`${styles.card} ${selected ? styles.cardSelected : styles.cardDefault}`}>{figure.name}</div>;
}

function MarkdownEditor({ content, onChange, onSave }: { content: string; onChange: (v: string) => void; onSave: () => void }) {
    const $t = t();
    const [preview, setPreview] = useState(false);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);

    useEffect(() => { imagePositions.length = 0; return () => { imagePositions.length = 0; }; }, [content]);
    useEffect(() => {
        const container = editorContainerRef.current; if (!container) return;
        const handlePaste = async (e: ClipboardEvent) => {
            const view = editorViewRef.current; if (!view || !view.hasFocus) return;
            const items = e.clipboardData?.items; if (!items) return;
            for (const item of Array.from(items)) { if (item.type.startsWith('image/')) { e.preventDefault(); const file = item.getAsFile(); if (file) { try { const compressed = await compressImage(file, 240, 240, 0.7); const imageMarkdown = `![${file.name}](${compressed})`; const { from } = view.state.selection.main; view.dispatch({ changes: { from, insert: imageMarkdown + '\n' } }); onChange(view.state.doc.toString()); } catch (err) { console.error('Failed to insert image:', err); } } return; } }
        };
        container.addEventListener('paste', handlePaste); return () => container.removeEventListener('paste', handlePaste);
    }, [onChange]);
    const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); const ctx = canvas.getContext('2d'); if (!ctx) { reject(new Error('Canvas not available')); return; } ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', quality)); }; img.onerror = reject; img.src = reader.result as string; }; reader.onerror = reject; reader.readAsDataURL(file);
    });

    return (
        <div className={styles.editorRoot} ref={editorContainerRef}>
            <div className={styles.editorToolbar}><button onClick={() => setPreview(!preview)} className={styles.editorBtn}>{preview ? '✏️ ' + $t.edit : '👁 ' + $t.preview}</button><button onClick={onSave} className={`${styles.editorBtn} ${styles.editorBtnPrimary}`}>💾 {$t.saveContent}</button></div>
            {preview ? <div className={styles.previewPane} dangerouslySetInnerHTML={{ __html: marked(content, { breaks: true }) as string }} /> : <div className={styles.editorPane}><CodeMirror value={content} onChange={onChange} onCreateEditor={(view) => { editorViewRef.current = view; }} extensions={[keymap.of([...defaultKeymap, ...historyKeymap]), history(), markdown({ base: markdownLanguage, codeLanguages: languages }), oneDark, EditorView.lineWrapping, imagePreviewPlugin, EditorView.theme({ '.cm-gutters': { display: 'none' }, '.cm-activeLineGutter': { display: 'none' } })]} height="100%" style={{ height: '100%' }} /></div>}
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
    const [modalOpen, setModalOpen] = useState(false);
    const [editingFigure, setEditingFigure] = useState<Figure | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

    const loadFigures = useCallback(async () => { try { setFigures(await fetchFigures()); } catch (err) { console.error(err); } }, []);
    useEffect(() => { loadFigures(); }, [loadFigures]);
    const filtered = figures.filter(f => { if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false; if (statusFilter !== 'all' && f.status !== statusFilter) return false; return true; });
    const selected = figures.find(f => f.id === selectedId);
    useEffect(() => { if (selected) setEditorContent(selected.content || ''); }, [selected]);

    useEffect(() => { const handleKeyDown = (e: KeyboardEvent) => { const tag = (e.target as HTMLElement).tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; if ((e.target as HTMLElement).closest('.cm-editor')) return; if ((e.target as HTMLElement).closest('.cm-content')) return; if (document.getElementById('figure-modal-overlay')) return; if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const currentIndex = filtered.findIndex(f => f.id === selectedId); if (e.key === 'ArrowUp' && currentIndex > 0) setSelectedId(filtered[currentIndex - 1].id); else if (e.key === 'ArrowDown' && currentIndex < filtered.length - 1) setSelectedId(filtered[currentIndex + 1].id); } }; window.addEventListener('keydown', handleKeyDown); return () => window.removeEventListener('keydown', handleKeyDown); }, [filtered, selectedId, figures]);

    const handleSave = async () => { if (!selected) return; await updateFigureAPI(selected.id, { content: editorContent }); await loadFigures(); showToast('Content saved', 'success'); };
    const navigateTo = (page: string) => { if (page === 'paints') window.location.href = 'paints.html'; else if (page === 'settings') window.location.href = 'settings.html'; else window.location.href = 'figures.html'; };

    const handleDeleteFigure = (id: number) => {
        setConfirmTitle($t.deleteFigure);
        setConfirmMessage($t.deleteFigureConfirm);
        setConfirmAction(() => async () => { await deleteFigureAPI(id); setSelectedId(null); await loadFigures(); showToast('Figure deleted', 'success'); setConfirmOpen(false); });
        setConfirmOpen(true);
    };

    return (
        <div className={styles.root}>
            <div style={{ width: 48, minWidth: 48, background: 'var(--bg-tertiary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
                <div onClick={() => navigateTo('paints')} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4, color: 'var(--text-secondary)' }} onMouseEnter={e => (e.target as HTMLElement).style.background = 'var(--bg-hover)'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>🎨</div>
                <div onClick={() => navigateTo('figures')} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4, color: 'var(--accent)', background: 'var(--accent-light)' }}>🧩</div>
                <div onClick={() => navigateTo('settings')} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4, color: 'var(--text-secondary)' }} onMouseEnter={e => (e.target as HTMLElement).style.background = 'var(--bg-hover)'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>⚙️</div>
            </div>

            <div className={`${styles.leftPanel} ${leftPanelCollapsed ? styles.leftPanelCollapsed : styles.leftPanelExpanded}`}>
                <button onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)} className={styles.collapseBtn}>{leftPanelCollapsed ? '▶' : '◀'}</button>
                <div style={{ opacity: leftPanelCollapsed ? 0 : 1, pointerEvents: leftPanelCollapsed ? 'none' : 'auto', transition: 'opacity 0.3s', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div className={styles.searchBox}><input type="text" placeholder={$t.search + '...'} value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
                        <div className={styles.filterRow}><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={styles.filterSelect}><option value="all">{$t.all}</option><option value="draft">{$t.draft}</option><option value="in-progress">{$t.inProgress}</option><option value="completed">{$t.completed}</option></select><button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className={styles.viewToggleBtn}>{viewMode === 'grid' ? '☰' : '⊞'}</button></div>
                    </div>
                    <div style={{ padding: '0 12px 8px' }}><button onClick={() => { setEditingFigure(null); setModalOpen(true); }} style={{ width: '100%', padding: '8px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>+ {$t.addFigure}</button></div>
                    <div className={styles.figureList}>{viewMode === 'grid' ? filtered.map(f => <FigureCard key={f.id} figure={f} selected={selectedId === f.id} onClick={() => setSelectedId(f.id)} onDoubleClick={() => { setEditingFigure(f); setModalOpen(true); }} />) : filtered.map(f => <div key={f.id} onClick={() => setSelectedId(f.id)} onDoubleClick={() => { setEditingFigure(f); setModalOpen(true); }} className={`${styles.listItem} ${selectedId === f.id ? styles.listItemSelected : ''}`}>{f.name}</div>)}{filtered.length === 0 && <div className={styles.emptyState}>{$t.noFigures}</div>}</div>
                </div>
            </div>

            <div className={styles.centerPanel}>
                {selected ? (<>
                    <div className={styles.centerHeader}><div className={styles.centerTitle}>{selected.name}</div><div className={styles.centerMeta}><span>{selected.status === 'draft' ? $t.draft : selected.status === 'in-progress' ? $t.inProgress : selected.status === 'completed' ? $t.completed : selected.status}</span>{selected.manufacturer && <span>🏭 {selected.manufacturer}</span>}{selected.scale && <span>📏 {selected.scale}</span>}</div></div>
                    <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}><button onClick={() => { setEditingFigure(selected); setModalOpen(true); }} className={styles.editorBtn}>✏️ {$t.edit}</button><button onClick={() => handleDeleteFigure(selected.id)} className={styles.editorBtn} style={{ background: 'var(--danger)' }}>🗑 {$t.deleteFigure}</button></div>
                    <div className={styles.centerEditor}><MarkdownEditor content={editorContent} onChange={setEditorContent} onSave={handleSave} /></div>
                </>) : <div className={styles.centerEmpty}>{$t.selectFigure}</div>}
            </div>

            {modalOpen && <FigureModal figure={editingFigure} onSave={async (data) => { if (editingFigure) { await updateFigureAPI(editingFigure.id, data); } else { await createFigureAPI(data as any); } await loadFigures(); showToast(editingFigure ? 'Figure updated' : 'Figure created', 'success'); }} onClose={() => setModalOpen(false)} />}
            {confirmOpen && <ConfirmModal title={confirmTitle} message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />}
        </div>
    );
}