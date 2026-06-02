import { useState, useEffect, useCallback } from 'react';
import { fetchFigures, updateFigureAPI, deleteFigureAPI, createFigureAPI, Figure } from '../services/apiFigures';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { marked } from 'marked';
import styles from './FiguresApp.module.css';
import FigureModal from './FigureModal';

function FigureCard({ figure, selected, onClick, onDoubleClick }: {
    figure: Figure; selected: boolean; onClick: () => void; onDoubleClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            className={`${styles.card} ${selected ? styles.cardSelected : styles.cardDefault}`}
        >
            {figure.name}
        </div>
    );
}

function MarkdownEditor({ content, onChange, onSave }: { content: string; onChange: (v: string) => void; onSave: () => void }) {
    const [preview, setPreview] = useState(false);

    return (
        <div className={styles.editorRoot}>
            <div className={styles.editorToolbar}>
                <button onClick={() => setPreview(!preview)} className={styles.editorBtn}>
                    {preview ? '✏️ Edit' : '👁 Preview'}
                </button>
                <button onClick={onSave} className={`${styles.editorBtn} ${styles.editorBtnPrimary}`}>
                    💾 Save
                </button>
            </div>
            {preview ? (
                <div className={styles.previewPane}
                     dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} />
            ) : (
                <div className={styles.editorPane}>
                    <CodeMirror
                        value={content}
                        onChange={onChange}
                        extensions={[
                            markdown({ base: markdownLanguage, codeLanguages: languages }),
                            oneDark,
                            EditorView.lineWrapping,
                            EditorView.theme({
                                '.cm-gutters': { display: 'none' },
                                '.cm-activeLineGutter': { display: 'none' },
                            }),
                        ]}
                        height="100%" style={{ height: '100%' }}
                    />
                </div>
            )}
        </div>
    );
}

export default function FiguresApp() {
    const [figures, setFigures] = useState<Figure[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [editorContent, setEditorContent] = useState('');
    const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingFigure, setEditingFigure] = useState<Figure | null>(null);

    const loadFigures = useCallback(async () => {
        try { setFigures(await fetchFigures()); } catch (err) { console.error(err); }
    }, []);

    useEffect(() => { loadFigures(); }, [loadFigures]);

    const filtered = figures.filter(f => {
        if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (statusFilter !== 'all' && f.status !== statusFilter) return false;
        return true;
    });

    const selected = figures.find(f => f.id === selectedId);

    useEffect(() => {
        if (selected) setEditorContent(selected.content || '');
    }, [selected]);

    // Навигация курсором
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if ((e.target as HTMLElement).closest('.cm-editor')) return;
            if (document.getElementById('figure-modal-overlay')) return;

            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const currentIndex = filtered.findIndex(f => f.id === selectedId);
                if (e.key === 'ArrowUp' && currentIndex > 0) {
                    setSelectedId(filtered[currentIndex - 1].id);
                } else if (e.key === 'ArrowDown' && currentIndex < filtered.length - 1) {
                    setSelectedId(filtered[currentIndex + 1].id);
                }
            }
            if (e.key === 'Enter' && selectedId) {
                const figure = figures.find(f => f.id === selectedId);
                if (figure) {
                    setEditingFigure(figure);
                    setModalOpen(true);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filtered, selectedId, figures]);

    const handleSave = async () => {
        if (!selected) return;
        await updateFigureAPI(selected.id, { content: editorContent });
        await loadFigures();
    };

    const navigateTo = (page: string) => {
        if ((window as any).electronAPI?.navigate) {
            (window as any).electronAPI.navigate(page === 'figures' ? 'figures' : 'paints');
        } else {
            window.location.href = page === 'figures' ? 'figures.html' : 'index.html';
        }
    };

    return (
        <div className={styles.root}>
            {/* Левый сайдбар навигации */}
            <div style={{
                width: 48, minWidth: 48, background: '#16213e', borderRight: '1px solid #333366',
                display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8,
            }}>
                <div
                    onClick={() => navigateTo('paints')}
                    style={{
                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 4, cursor: 'pointer', marginBottom: 4, color: '#a0a0b0',
                    }}
                    onMouseEnter={e => (e.target as HTMLElement).style.background = '#2a2a4a'}
                    onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}
                    title="Paints"
                >
                    🎨
                </div>
                <div
                    onClick={() => navigateTo('figures')}
                    style={{
                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 4, cursor: 'pointer', marginBottom: 4, color: '#7c8aff',
                        background: 'rgba(124, 138, 255, 0.15)',
                    }}
                    title="Figures"
                >
                    🧩
                </div>
                <div
                    onClick={() => navigateTo('settings')}
                    style={{
                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 4, cursor: 'pointer', marginBottom: 4, color: '#a0a0b0',
                    }}
                    onMouseEnter={e => (e.target as HTMLElement).style.background = '#2a2a4a'}
                    onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}
                    title="Settings"
                >
                    ⚙️
                </div>
            </div>

            {/* Левая панель */}
            <div className={`${styles.leftPanel} ${leftPanelCollapsed ? styles.leftPanelCollapsed : styles.leftPanelExpanded}`}>
                <button
                    onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                    className={styles.collapseBtn}
                >
                    {leftPanelCollapsed ? '▶' : '◀'}
                </button>

                {/* Содержимое панели */}
                <div style={{
                    opacity: leftPanelCollapsed ? 0 : 1,
                    pointerEvents: leftPanelCollapsed ? 'none' : 'auto',
                    transition: 'opacity 0.3s',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    overflow: 'hidden',
                }}>
                    <div className={styles.searchBox}>
                        <input
                            type="text" placeholder="Search..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={styles.searchInput}
                        />
                        <div className={styles.filterRow}>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="all">All</option>
                                <option value="draft">Draft</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                            <button
                                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                                className={styles.viewToggleBtn}
                            >
                                {viewMode === 'grid' ? '☰' : '⊞'}
                            </button>
                        </div>
                    </div>

                    {/* Кнопка Add Figure */}
                    <div style={{ padding: '0 12px 8px' }}>
                        <button
                            onClick={() => { setEditingFigure(null); setModalOpen(true); }}
                            style={{
                                width: '100%', padding: '8px', background: '#3b82f6', color: '#fff',
                                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                            }}
                        >
                            + Add Figure
                        </button>
                    </div>

                    <div className={styles.figureList}>
                        {viewMode === 'grid' ? (
                            filtered.map(f => (
                                <FigureCard
                                    key={f.id}
                                    figure={f}
                                    selected={selectedId === f.id}
                                    onClick={() => setSelectedId(f.id)}
                                    onDoubleClick={() => { setEditingFigure(f); setModalOpen(true); }}
                                />
                            ))
                        ) : (
                            filtered.map(f => (
                                <div
                                    key={f.id}
                                    onClick={() => setSelectedId(f.id)}
                                    onDoubleClick={() => { setEditingFigure(f); setModalOpen(true); }}
                                    className={`${styles.listItem} ${selectedId === f.id ? styles.listItemSelected : ''}`}
                                >
                                    {f.name}
                                </div>
                            ))
                        )}
                        {filtered.length === 0 && (
                            <div className={styles.emptyState}>No figures yet</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Центральная панель */}
            <div className={styles.centerPanel}>
                {selected ? (
                    <>
                        <div className={styles.centerHeader}>
                            <div className={styles.centerTitle}>{selected.name}</div>
                            <div className={styles.centerMeta}>
                                <span>{selected.status}</span>
                                {selected.manufacturer && <span>🏭 {selected.manufacturer}</span>}
                                {selected.scale && <span>📏 {selected.scale}</span>}
                            </div>
                        </div>
                        {/* Кнопки Edit и Delete */}
                        <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: '#1e1e3a', borderBottom: '1px solid #333' }}>
                            <button
                                onClick={() => { setEditingFigure(selected); setModalOpen(true); }}
                                className={styles.editorBtn}
                            >
                                ✏️ Edit
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirm('Delete this figure?')) {
                                        await deleteFigureAPI(selected.id);
                                        setSelectedId(null);
                                        await loadFigures();
                                    }
                                }}
                                className={styles.editorBtn}
                                style={{ background: '#dc2626' }}
                            >
                                🗑 Delete
                            </button>
                        </div>
                        <div className={styles.centerEditor}>
                            <MarkdownEditor content={editorContent} onChange={setEditorContent} onSave={handleSave} />
                        </div>
                    </>
                ) : (
                    <div className={styles.centerEmpty}>Select a figure to start writing</div>
                )}
            </div>

            {/* Модалка добавления/редактирования */}
            {modalOpen && (
                <FigureModal
                    figure={editingFigure}
                    onSave={async (data) => {
                        if (editingFigure) {
                            await updateFigureAPI(editingFigure.id, data);
                        } else {
                            await createFigureAPI(data as any);
                        }
                        await loadFigures();
                    }}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </div>
    );
}