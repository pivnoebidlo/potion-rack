import { useState, useEffect, useCallback } from 'react';
import { fetchFigures, updateFigureAPI, deleteFigureAPI, Figure } from '../services/apiFigures';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { marked } from 'marked';
import styles from './FiguresApp.module.css';

function FigureCard({ figure, selected, onClick }: { figure: Figure; selected: boolean; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
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

    const handleSave = async () => {
        if (!selected) return;
        await updateFigureAPI(selected.id, { content: editorContent });
        await loadFigures();
    };

    const panelWidth = leftPanelCollapsed ? 40 : 256;

    return (
        <div className={styles.root}>
            <a href="index.html" className={styles.backBtn}>🎨 Paints</a>

            {/* Левая панель */}
            <div
                className={styles.leftPanel}
                style={{
                    width: panelWidth,
                    minWidth: panelWidth,
                    maxWidth: panelWidth,
                }}
            >
                <button
                    onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                    className={styles.collapseBtn}
                    style={{ top: 8, left: panelWidth === 40 ? 4 : 228 }}
                >
                    {leftPanelCollapsed ? '▶' : '◀'}
                </button>

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

                <div className={styles.figureList}>
                    {viewMode === 'grid' ? (
                        filtered.map(f => (
                            <FigureCard key={f.id} figure={f} selected={selectedId === f.id} onClick={() => setSelectedId(f.id)} />
                        ))
                    ) : (
                        filtered.map(f => (
                            <div
                                key={f.id}
                                onClick={() => setSelectedId(f.id)}
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
                        <div className={styles.centerEditor}>
                            <MarkdownEditor content={editorContent} onChange={setEditorContent} onSave={handleSave} />
                        </div>
                    </>
                ) : (
                    <div className={styles.centerEmpty}>Select a figure to start writing</div>
                )}
            </div>
        </div>
    );
}