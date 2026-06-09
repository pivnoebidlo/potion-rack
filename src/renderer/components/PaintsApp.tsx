import PaintDetailPanel from './PaintDetailPanel';
import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './PaintsApp.module.css';
import PaintModal from './PaintModal';
import ConfirmModal from './ConfirmModal';
import { t } from '../i18n';
import { Paint } from '../types/paint';
import PaintFilterPanel from './PaintFilterPanel';
import PaintListView from './PaintListView';
import PaintGridView from './PaintGridView';

export default function PaintsApp() {
    const $t = t();

    const [paints, setPaints] = useState<Paint[]>([]);
    const [filtered, setFiltered] = useState<Paint[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
        return (localStorage.getItem('paints-view-mode') as 'list' | 'grid') || 'list';
    });
    const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(() => {
        return localStorage.getItem('paints-filter-panel-collapsed') === 'true';
    });
    const [showColorDots, setShowColorDots] = useState(() => {
        return localStorage.getItem('potion-rack-show-paint-color-dots') !== 'false';
    });

    const [showGridSortBar, setShowGridSortBar] = useState(() => {
        return localStorage.getItem('potion-rack-show-grid-sort-bar') !== 'false';
    });

    const [brandFilter, setBrandFilter] = useState('');
    const [seriesFilter, setSeriesFilter] = useState('');
    const [baseColorFilter, setBaseColorFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchFilter, setSearchFilter] = useState('');

    const [sortColumn, setSortColumn] = useState('brand');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const [brands, setBrands] = useState<string[]>([]);
    const [series, setSeries] = useState<string[]>([]);
    const [baseColors, setBaseColors] = useState<{ id: number; name: string }[]>([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingPaint, setEditingPaint] = useState<Paint | null>(null);

    const [images, setImages] = useState<any[]>([]);
    const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
    const [rightPanelWidth, setRightPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

    const commentRef = useRef<HTMLTextAreaElement>(null);
    const commentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const selectedRowRef = useRef<HTMLTableRowElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const loadPaints = useCallback(async () => {
        try {
            const res = await fetch('http://127.0.0.1:8765/api/paints');
            const data = await res.json();
            setPaints(data);
            setLoading(false);
            const uniqueBrands = [...new Set(data.map((p: Paint) => p.brand))].sort();
            const uniqueSeries = [...new Set(data.filter((p: Paint) => p.series).map((p: Paint) => p.series))].sort();
            setBrands(uniqueBrands as string[]);
            setSeries(uniqueSeries as string[]);
        } catch (err) { console.error('Failed to load paints:', err); setLoading(false); }
    }, []);

    useEffect(() => { loadPaints(); }, [loadPaints]);
    useEffect(() => { if (!loading && paints.length > 0 && selectedId === null) setSelectedId(paints[0].id); }, [loading, paints, selectedId]);
    useEffect(() => { const saved = localStorage.getItem('potion-rack-show-paint-color-dots'); if (saved !== null) setShowColorDots(saved === 'true'); }, []);
    useEffect(() => {
        const saved = localStorage.getItem('potion-rack-show-paint-color-dots');
        if (saved !== null) setShowColorDots(saved === 'true');
        const savedSortBar = localStorage.getItem('potion-rack-show-grid-sort-bar');
        if (savedSortBar !== null) setShowGridSortBar(savedSortBar === 'true');
    }, []);

    useEffect(() => {
        if (selectedRowRef.current && tableContainerRef.current) {
            const container = tableContainerRef.current;
            const row = selectedRowRef.current;
            const thead = container.querySelector('thead') as HTMLElement;
            const headerHeight = thead?.offsetHeight || 0;
            const rowTop = row.offsetTop;
            const rowHeight = row.offsetHeight;
            const scrollTop = container.scrollTop;
            const clientHeight = container.clientHeight;
            if (rowTop < scrollTop + headerHeight) container.scrollTo({ top: rowTop - headerHeight - 4, behavior: 'smooth' });
            else if (rowTop + rowHeight > scrollTop + clientHeight) container.scrollTo({ top: rowTop + rowHeight - clientHeight + 4, behavior: 'smooth' });
        }
    }, [selectedId]);

    useEffect(() => {
        const getColumnsCount = (): number => {
            const grid = document.querySelector('[data-grid-container]');
            if (!grid) return 4;
            const style = getComputedStyle(grid);
            const cols = style.gridTemplateColumns.split(' ').length;
            return cols || 4;
        };

        const h = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const idx = filtered.findIndex(p => p.id === selectedId);

            // Стрелки вверх/вниз — работают в обоих режимах
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                if (viewMode === 'list') {
                    if (e.key === 'ArrowUp' && idx > 0) setSelectedId(filtered[idx - 1].id);
                    else if (e.key === 'ArrowDown' && idx < filtered.length - 1) setSelectedId(filtered[idx + 1].id);
                    else if (e.key === 'ArrowDown' && idx === -1 && filtered.length > 0) setSelectedId(filtered[0].id);
                } else {
                    const cols = getColumnsCount();
                    if (e.key === 'ArrowUp' && idx >= cols) setSelectedId(filtered[idx - cols].id);
                    else if (e.key === 'ArrowDown' && idx < filtered.length - cols) setSelectedId(filtered[idx + cols].id);
                    else if (e.key === 'ArrowDown' && idx === -1 && filtered.length > 0) setSelectedId(filtered[0].id);
                }
            }

            // Left/Right только для grid
            if (viewMode === 'grid' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                e.preventDefault();
                if (e.key === 'ArrowLeft' && idx > 0) setSelectedId(filtered[idx - 1].id);
                else if (e.key === 'ArrowRight' && idx < filtered.length - 1) setSelectedId(filtered[idx + 1].id);
                else if (e.key === 'ArrowRight' && idx === -1 && filtered.length > 0) setSelectedId(filtered[0].id);
            }

            // Скролл к выбранной карточке в grid
            if (viewMode === 'grid' && selectedId) {
                setTimeout(() => {
                    const card = document.querySelector(`[data-paint-id="${selectedId}"]`);
                    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 50);
            }
        };
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [filtered, selectedId, viewMode]);

    useEffect(() => {
        fetch('http://127.0.0.1:8765/api/base-colors').then(r => r.json()).then(d => setBaseColors(d)).catch(e => console.error(e));
    }, []);

    const loadImages = useCallback(async (paintId: number) => {
        const ctrl = new AbortController();
        try {
            const res = await fetch(`http://127.0.0.1:8765/api/paints/${paintId}/images`, { signal: ctrl.signal });
            const data = await res.json();
            if (!ctrl.signal.aborted) { setImages(data); setSelectedImageId(data.length > 0 ? data[0].id : null); }
        } catch (err: any) { if (err.name !== 'AbortError') console.error(err); }
        return () => ctrl.abort();
    }, []);

    useEffect(() => {
        let cleanup: (() => void) | undefined;
        if (selectedId) loadImages(selectedId).then(cb => { cleanup = cb; });
        else { setImages([]); setSelectedImageId(null); }
        return () => { cleanup?.(); };
    }, [selectedId, loadImages]);

    useEffect(() => {
        if (!isResizing) return;
        const mm = (e: MouseEvent) => { const w = window.innerWidth - e.clientX - 48; if (w >= 200 && w <= 500) setRightPanelWidth(w); };
        const mu = () => setIsResizing(false);
        document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
        return () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    }, [isResizing]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (commentRef.current) { commentRef.current.style.height = 'auto'; commentRef.current.style.height = commentRef.current.scrollHeight + 'px'; }
        }, 150);
        return () => clearTimeout(timer);
    }, [selectedId, paints.find(p => p.id === selectedId)?.comment, rightPanelCollapsed]);

    useEffect(() => {
        let result = [...paints];
        if (brandFilter) result = result.filter(p => p.brand === brandFilter);
        if (seriesFilter) result = result.filter(p => p.series === seriesFilter);
        if (baseColorFilter) result = result.filter(p => p.base_color_id === parseInt(baseColorFilter));
        if (statusFilter) result = result.filter(p => p.status === statusFilter);
        if (searchFilter) { const s = searchFilter.toLowerCase(); result = result.filter(p => p.color_name.toLowerCase().includes(s) || p.article?.toLowerCase().includes(s)); }
        result.sort((a, b) => { const av = (a as any)[sortColumn] || ''; const bv = (b as any)[sortColumn] || ''; return sortDirection === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av)); });
        setFiltered(result);
    }, [paints, brandFilter, seriesFilter, baseColorFilter, statusFilter, searchFilter, sortColumn, sortDirection]);

    const handleSort = (col: string) => { if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); else { setSortColumn(col); setSortDirection('asc'); } };
    const resetFilters = () => { setBrandFilter(''); setSeriesFilter(''); setBaseColorFilter(''); setStatusFilter(''); setSearchFilter(''); };
    const navigateTo = (page: string) => { if (page === 'figures') window.location.href = 'figures.html'; else if (page === 'settings') window.location.href = 'settings.html'; else window.location.href = 'paints.html'; };

    const handleSavePaint = async (data: Partial<Paint>) => {
        const url = data.id ? `http://127.0.0.1:8765/api/paints/${data.id}` : 'http://127.0.0.1:8765/api/paints';
        const method = data.id ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (res.status === 409) { const err = await res.json(); alert(err.message || $t.duplicatePaint); return; }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await loadPaints();
        } catch (err) { console.error('Save failed:', err); alert('Failed to save paint'); }
    };

    const handleUpdateComment = async (id: number, comment: string) => {
        setPaints(prev => prev.map(p => p.id === id ? { ...p, comment } : p));
        if (commentTimerRef.current) clearTimeout(commentTimerRef.current);
        commentTimerRef.current = setTimeout(async () => {
            await fetch(`http://127.0.0.1:8765/api/paints/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment }) });
        }, 500);
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        await fetch(`http://127.0.0.1:8765/api/paints/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        setPaints(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    };

    const handleUpdateRating = async (id: number, rating: number) => {
        await fetch(`http://127.0.0.1:8765/api/paints/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating }) });
        setPaints(prev => prev.map(p => p.id === id ? { ...p, rating } : p));
    };

    const handleDeletePaint = async (id: number) => {
        setConfirmTitle($t.deletePaint); setConfirmMessage($t.deleteConfirm);
        setConfirmAction(() => async () => {
            await fetch(`http://127.0.0.1:8765/api/paints/${id}`, { method: 'DELETE' });
            setSelectedId(null); await loadPaints(); alert($t.deletePaint + ' — OK'); setConfirmOpen(false);
        });
        setConfirmOpen(true);
    };

    const handleUploadImage = async (file: File) => {
        if (!selectedId) return;
        try {
            const r = new FileReader();
            r.onload = async () => {
                const b64 = r.result as string;
                await fetch(`http://127.0.0.1:8765/api/paints/${selectedId}/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_data: b64.split(',')[1], content_type: file.type, filename: file.name }) });
                await loadImages(selectedId); alert('Photo uploaded');
            };
            r.readAsDataURL(file);
        } catch (err) { console.error('Failed to upload image:', err); alert('Failed to upload image'); }
    };

    const handleDeleteImage = (imgId: number) => {
        setConfirmTitle($t.deletePhoto); setConfirmMessage($t.deletePhotoConfirm);
        setConfirmAction(() => async () => {
            await fetch(`http://127.0.0.1:8765/api/paints/${selectedId}/images/${imgId}`, { method: 'DELETE' });
            await loadImages(selectedId!); alert('Photo deleted'); setConfirmOpen(false);
        });
        setConfirmOpen(true);
    };

    const handleSetPrimary = async (imgId: number) => {
        if (!selectedId) return;
        await fetch(`http://127.0.0.1:8765/api/paints/${selectedId}/images/${imgId}/primary`, { method: 'PUT' });
        await loadImages(selectedId);
    };

    useEffect(() => {
        const hp = (e: ClipboardEvent) => { if (!selectedId) return; const items = e.clipboardData?.items; if (!items) return; for (const item of Array.from(items)) { if (item.type.startsWith('image/')) { e.preventDefault(); const f = item.getAsFile(); if (f) handleUploadImage(f); return; } } };
        document.addEventListener('paste', hp); return () => document.removeEventListener('paste', hp);
    }, [selectedId]);

    if (loading) return <div className={styles.loading}>{$t.loading}</div>;

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div style={{ width: 48, minWidth: 48, background: 'var(--bg-tertiary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
                <div onClick={() => navigateTo('paints')} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4, color: 'var(--accent)', background: 'var(--accent-light)' }}>🎨</div>
                <div onClick={() => navigateTo('figures')} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4, color: 'var(--text-secondary)' }} onMouseEnter={e => (e.target as HTMLElement).style.background = 'var(--bg-hover)'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>🧩</div>
                <div onClick={() => navigateTo('settings')} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4, color: 'var(--text-secondary)' }} onMouseEnter={e => (e.target as HTMLElement).style.background = 'var(--bg-hover)'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>⚙️</div>
            </div>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <PaintFilterPanel
                    collapsed={filterPanelCollapsed}
                    brandFilter={brandFilter}
                    seriesFilter={seriesFilter}
                    baseColorFilter={baseColorFilter}
                    statusFilter={statusFilter}
                    searchFilter={searchFilter}
                    viewMode={viewMode}
                    brands={brands}
                    series={series}
                    baseColors={baseColors}
                    onToggle={() => { setFilterPanelCollapsed(!filterPanelCollapsed); localStorage.setItem('paints-filter-panel-collapsed', (!filterPanelCollapsed).toString()); }}
                    onBrandChange={setBrandFilter}
                    onSeriesChange={setSeriesFilter}
                    onBaseColorChange={setBaseColorFilter}
                    onStatusChange={setStatusFilter}
                    onSearchChange={setSearchFilter}
                    onReset={resetFilters}
                    onViewModeToggle={() => { const next = viewMode === 'list' ? 'grid' : 'list'; setViewMode(next); localStorage.setItem('paints-view-mode', next); }}
                    onAddPaint={() => { setEditingPaint(null); setModalOpen(true); }}
                />
                <div className={styles.root} style={{ flex: 1 }}>
                    <div className={styles.tableContainer} ref={tableContainerRef}>
                        {viewMode === 'list' ? (
                            <PaintListView
                                filtered={filtered}
                                selectedId={selectedId}
                                showColorDots={showColorDots}
                                sortColumn={sortColumn}
                                sortDirection={sortDirection}
                                baseColors={baseColors}
                                selectedRowRef={selectedRowRef}
                                onSelect={setSelectedId}
                                onDoubleClick={(paint) => { setEditingPaint(paint); setModalOpen(true); }}
                                onSort={handleSort}
                                onUpdateRating={handleUpdateRating}
                                onUpdateStatus={handleUpdateStatus}
                                onDelete={handleDeletePaint}
                            />
                        ) : (
                            <PaintGridView
                                filtered={filtered}
                                selectedId={selectedId}
                                showGridSortBar={showGridSortBar}
                                sortColumn={sortColumn}
                                sortDirection={sortDirection}
                                baseColors={baseColors}
                                onSelect={setSelectedId}
                                onDoubleClick={(paint) => { setEditingPaint(paint); setModalOpen(true); }}
                                onSortColumnChange={setSortColumn}
                                onSortDirectionToggle={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                                onUpdateRating={handleUpdateRating}
                            />
                        )}
                        {filtered.length === 0 && !loading && <div className={styles.emptyState}>{$t.noPaints}</div>}
                    </div>
                    <div className={styles.statusBar}><span>{$t.totalPaints}: {filtered.length}</span><span>&nbsp;|&nbsp;</span><span>{$t.brands}: {brands.length}</span></div>
                </div>
                {selectedId && (() => {
                    const p = paints.find(x => x.id === selectedId);
                    if (!p) return null;
                    return (
                        <PaintDetailPanel
                            paint={p}
                            images={images}
                            selectedImageId={selectedImageId}
                            rightPanelCollapsed={rightPanelCollapsed}
                            rightPanelWidth={rightPanelWidth}
                            isResizing={isResizing}
                            commentRef={commentRef}
                            onCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                            onImageSelect={setSelectedImageId}
                            onResizeStart={() => setIsResizing(true)}
                            onUpload={handleUploadImage}
                            onSetPrimary={handleSetPrimary}
                            onDeleteImage={handleDeleteImage}
                            onCommentChange={handleUpdateComment}
                        />
                    );
                })()}
            </div>
            {modalOpen && <PaintModal paint={editingPaint} brands={brands} series={series} baseColors={baseColors} onSave={handleSavePaint} onClose={() => setModalOpen(false)} />}
            {confirmOpen && <ConfirmModal title={confirmTitle} message={confirmMessage} onConfirm={confirmAction} onCancel={() => setConfirmOpen(false)} />}
        </div>
    );
}