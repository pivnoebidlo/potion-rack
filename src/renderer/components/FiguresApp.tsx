import { useState, useEffect, useCallback } from 'react';
import { fetchFigures, updateFigureAPI, deleteFigureAPI, Figure } from '../services/apiFigures';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { marked } from 'marked';

function FigureCard({ figure, selected, onClick }: { figure: Figure; selected: boolean; onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-lg border cursor-pointer transition ${
                selected ? 'border-blue-500 bg-blue-900/40' : 'border-gray-700 hover:border-gray-500 bg-gray-800'
            }`}
        >
            <div className="font-medium text-sm">{figure.name}</div>
            <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                    figure.status === 'completed' ? 'bg-green-900 text-green-300' :
                        figure.status === 'in-progress' ? 'bg-blue-900 text-blue-300' :
                            'bg-yellow-900 text-yellow-300'
                }`}>{figure.status}</span>
                {figure.manufacturer && <span className="text-xs text-gray-500">{figure.manufacturer}</span>}
            </div>
        </div>
    );
}

function MarkdownEditor({ content, onChange, onSave }: { content: string; onChange: (v: string) => void; onSave: () => void }) {
    const [preview, setPreview] = useState(false);

    return (
        <div className="flex flex-col h-full">
            <div className="flex gap-2 mb-3">
                <button onClick={() => setPreview(!preview)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm">
                    {preview ? '✏️ Edit' : '👁 Preview'}
                </button>
                <button onClick={onSave} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm">💾 Save</button>
            </div>
            {preview ? (
                <div className="flex-1 p-4 overflow-y-auto bg-gray-800 rounded-lg border border-gray-700 text-gray-200"
                     dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} />
            ) : (
                <div className="flex-1 border border-gray-700 rounded-lg overflow-hidden">
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

    return (
        <div className="flex h-full w-full bg-gray-900 text-white">
            {/* Левая панель */}
            <div
                className="relative border-r border-gray-700 bg-gray-900 transition-all duration-300"
                style={{ width: leftPanelCollapsed ? 40 : 256 }}
            >
                {/* Кнопка сворачивания */}
                <button
                    onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                    className="absolute top-2 right-2 z-10 px-1.5 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-400 transition"
                    title={leftPanelCollapsed ? 'Show panel' : 'Hide panel'}
                >
                    {leftPanelCollapsed ? '▶' : '◀'}
                </button>

                {/* Содержимое панели */}
                <div className="flex flex-col h-full" style={{ display: leftPanelCollapsed ? 'none' : 'flex' }}>
                    <div className="p-3 space-y-2 border-b border-gray-700">
                        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                               className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                        <div className="flex gap-2">
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                    className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white">
                                <option value="all">All</option>
                                <option value="draft">Draft</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm">
                                {viewMode === 'grid' ? '☰' : '⊞'}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {viewMode === 'grid' ? (
                            filtered.map(f => (
                                <FigureCard key={f.id} figure={f} selected={selectedId === f.id} onClick={() => setSelectedId(f.id)} />
                            ))
                        ) : (
                            filtered.map(f => (
                                <div key={f.id} onClick={() => setSelectedId(f.id)}
                                     className={`p-2 rounded cursor-pointer text-sm ${selectedId === f.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                    {f.name}
                                </div>
                            ))
                        )}
                        {filtered.length === 0 && <div className="text-gray-500 text-sm text-center py-8">No figures yet</div>}
                    </div>
                </div>
            </div>

            {/* Центральная панель */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {selected ? (
                    <div className="flex flex-col h-full">
                        <div className="p-4 bg-gray-800 border-b border-gray-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-lg font-bold">{selected.name}</h2>
                                    <div className="flex gap-3 mt-1 text-sm text-gray-400">
                                        <span>{selected.status}</span>
                                        {selected.manufacturer && <span>🏭 {selected.manufacturer}</span>}
                                        {selected.scale && <span>📏 {selected.scale}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={async () => { if (confirm('Delete?')) { await deleteFigureAPI(selected.id); setSelectedId(null); await loadFigures(); } }}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm">🗑</button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-4 overflow-hidden">
                            <MarkdownEditor content={editorContent} onChange={setEditorContent} onSave={handleSave} />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Select a figure to start writing
                    </div>
                )}
            </div>
        </div>
    );
}