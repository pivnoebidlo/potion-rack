import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './PaintsApp.module.css';
import PaintModal from './PaintModal';
import placeholderImg from '../images/placeholder.png';
import { t } from '../i18n';

interface Paint {
    id: number;
    brand: string;
    series?: string;
    color_name: string;
    article?: string;
    base_color_id?: number;
    base_color_name?: string;
    rating?: number;
    status?: string;
    purchase_date?: string;
    price?: number;
    comment?: string;
    created_at?: string;
    updated_at?: string;
}

export default function PaintsApp() {
    const $t = t();

    const [paints, setPaints] = useState<Paint[]>([]);
    const [filtered, setFiltered] = useState<Paint[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

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
    const [hoverMain, setHoverMain] = useState(false);

    const commentRef = useRef<HTMLTextAreaElement>(null);
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
        } catch (err) {
            console.error('Failed to load paints:', err);
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadPaints(); }, [loadPaints]);

    useEffect(() => {
        if (!loading && paints.length > 0 && selectedId === null) {
            setSelectedId(paints[0].id);
        }
    }, [loading, paints, selectedId]);

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
            const visibleTop = scrollTop + headerHeight;
            const visibleBottom = scrollTop + clientHeight;

            if (rowTop < visibleTop) {
                container.scrollTo({ top: rowTop - headerHeight - 4, behavior: 'smooth' });
            } else if (rowTop + rowHeight > visibleBottom) {
                container.scrollTo({ top: rowTop + rowHeight - clientHeight + 4, behavior: 'smooth' });
            }
        }
    }, [selectedId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const currentIndex = filtered.findIndex(p => p.id === selectedId);
                if (e.key === 'ArrowUp' && currentIndex > 0) setSelectedId(filtered[currentIndex - 1].id);
                else if (e.key === 'ArrowDown' && currentIndex < filtered.length - 1) setSelectedId(filtered[currentIndex + 1].id);
                else if (e.key === 'ArrowDown' && currentIndex === -1 && filtered.length > 0) setSelectedId(filtered[0].id);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filtered, selectedId]);

    useEffect(() => {
        fetch('http://127.0.0.1:8765/api/base-colors')
            .then(res => res.json())
            .then(data => setBaseColors(data))
            .catch(err => console.error('Failed to load base colors:', err));
    }, []);

    const loadImages = useCallback(async (paintId: number) => {
        const controller = new AbortController();
        try {
            const res = await fetch(`http://127.0.0.1:8765/api/paints/${paintId}/images`, { signal: controller.signal });
            const data = await res.json();
            if (!controller.signal.aborted) {
                setImages(data);
                setSelectedImageId(data.length > 0 ? data[0].id : null);
            }
        } catch (err: any) { if (err.name !== 'AbortError') console.error('Failed to load images:', err); }
        return () => controller.abort();
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
            if (commentRef.current) {
                commentRef.current.style.height = 'auto';
                commentRef.current.style.height = commentRef.current.scrollHeight + 'px';
            }
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
        result.sort((a, b) => { const av = (a as any)[sortColumn] || ''; const bv = (b as any)[sortColumn] || ''; const cmp = String(av).localeCompare(String(bv)); return sortDirection === 'asc' ? cmp : -cmp; });
        setFiltered(result);
    }, [paints, brandFilter, seriesFilter, baseColorFilter, statusFilter, searchFilter, sortColumn, sortDirection]);

    const handleSort = (col: string) => { if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc'); else { setSortColumn(col); setSortDirection('asc'); } };
    const resetFilters = () => { setBrandFilter(''); setSeriesFilter(''); setBaseColorFilter(''); setStatusFilter(''); setSearchFilter(''); };
    const navigateTo = (page: string) => {
        if (page === 'figures') window.location.href = 'figures.html';
        else if (page === 'settings') window.location.href = 'settings.html';
        else window.location.href = 'paints.html';
    };

    const handleSavePaint = async (data: Partial<Paint>) => {
        const url = data.id
            ? `http://127.0.0.1:8765/api/paints/${data.id}`
            : 'http://127.0.0.1:8765/api/paints';
        const method = data.id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (res.status === 409) {
                const err = await res.json();
                alert(err.message || $t.duplicatePaint);
                return;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            await loadPaints();
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save paint. Please try again.');
        }
    };

    const handleUpdateComment = async (id: number, comment: string) => { await fetch(`http://127.0.0.1:8765/api/paints/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment }) }); setPaints(prev => prev.map(p => p.id === id ? { ...p, comment } : p)); };
    const handleUpdateStatus = async (id: number, status: string) => { await fetch(`http://127.0.0.1:8765/api/paints/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); setPaints(prev => prev.map(p => p.id === id ? { ...p, status } : p)); };
    const handleUpdateRating = async (id: number, rating: number) => { await fetch(`http://127.0.0.1:8765/api/paints/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating }) }); setPaints(prev => prev.map(p => p.id === id ? { ...p, rating } : p)); };
    const handleDeletePaint = async (id: number) => { if (!confirm($t.deleteConfirm)) return; await fetch(`http://127.0.0.1:8765/api/paints/${id}`, { method: 'DELETE' }); setSelectedId(null); await loadPaints(); };
    const handleUploadImage = async (file: File) => { if (!selectedId) return; const r = new FileReader(); r.onload = async () => { const b64 = r.result as string; await fetch(`http://127.0.0.1:8765/api/paints/${selectedId}/images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_data: b64.split(',')[1], content_type: file.type, filename: file.name }) }); await loadImages(selectedId); }; r.readAsDataURL(file); };
    const handleDeleteImage = async (imgId: number) => { if (!selectedId || !confirm($t.deletePhotoConfirm)) return; await fetch(`http://127.0.0.1:8765/api/paints/${selectedId}/images/${imgId}`, { method: 'DELETE' }); await loadImages(selectedId); };
    const handleSetPrimary = async (imgId: number) => { if (!selectedId) return; await fetch(`http://127.0.0.1:8765/api/paints/${selectedId}/images/${imgId}/primary`, { method: 'PUT' }); await loadImages(selectedId); };

    useEffect(() => {
        const hp = (e: ClipboardEvent) => { if (!selectedId) return; const items = e.clipboardData?.items; if (!items) return; for (const item of Array.from(items)) { if (item.type.startsWith('image/')) { e.preventDefault(); const f = item.getAsFile(); if (f) handleUploadImage(f); return; } } };
        document.addEventListener('paste', hp); return () => document.removeEventListener('paste', hp);
    }, [selectedId]);

    if (loading) return <div className={styles.loading}>{$t.loading}</div>;

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div style={{
                width: 48, minWidth: 48, background: 'var(--bg-tertiary)', borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8,
            }}>
                <div onClick={() => navigateTo('paints')} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4, color: 'var(--accent)', background: 'var(--accent-light)' }}>🎨</div>
                <div onClick={() => navigateTo('figures')} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4, color: 'var(--text-secondary)' }} onMouseEnter={e => (e.target as HTMLElement).style.background = 'var(--bg-hover)'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>🧩</div>
                <div onClick={() => navigateTo('settings')} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4, color: 'var(--text-secondary)' }} onMouseEnter={e => (e.target as HTMLElement).style.background = 'var(--bg-hover)'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>⚙️</div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div className={styles.root} style={{ flex: 1 }}>
                    <div className={styles.toolbar}>
                        <div className={styles.filterRow}>
                            <div className={styles.filterGroup}><label className={styles.filterLabel}>{$t.brand}</label><select className={styles.filterSelect} value={brandFilter} onChange={e => setBrandFilter(e.target.value)}><option value="">{$t.all}</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                            <div className={styles.filterGroup}><label className={styles.filterLabel}>{$t.series}</label><select className={styles.filterSelect} value={seriesFilter} onChange={e => setSeriesFilter(e.target.value)}><option value="">{$t.all}</option>{series.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div className={styles.filterGroup}><label className={styles.filterLabel}>{$t.baseColor}</label><select className={styles.filterSelect} value={baseColorFilter} onChange={e => setBaseColorFilter(e.target.value)}><option value="">{$t.all}</option>{baseColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            <div className={styles.filterGroup}><label className={styles.filterLabel}>{$t.status}</label><select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">{$t.all}</option><option value="instock">{$t.inStock}</option><option value="low">{$t.low}</option><option value="out">{$t.outOfStock}</option><option value="ordered">{$t.ordered}</option></select></div>
                            <div className={styles.filterGroup}><label className={styles.filterLabel}>{$t.search}</label><input className={styles.filterInput} type="text" placeholder={$t.search + '...'} value={searchFilter} onChange={e => setSearchFilter(e.target.value)} /></div>
                            <div className={styles.actionButtons}><button className={styles.iconBtn} onClick={resetFilters}>🔄</button><button className={styles.iconBtn} onClick={() => { setEditingPaint(null); setModalOpen(true); }}>➕</button></div>
                        </div>
                    </div>

                    <div className={styles.tableContainer} ref={tableContainerRef}>
                        <table className={styles.table}>
                            <thead className={styles.tableHead}>
                            <tr>
                                <th onClick={() => handleSort('brand')}>{$t.brand} {sortColumn === 'brand' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => handleSort('series')}>{$t.series} {sortColumn === 'series' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => handleSort('color_name')}>{$t.colorName} {sortColumn === 'color_name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => handleSort('article')}>{$t.article} {sortColumn === 'article' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => handleSort('base_color_name')}>{$t.baseColor} {sortColumn === 'base_color_name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => handleSort('purchase_date')}>{$t.purchaseDate} {sortColumn === 'purchase_date' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => handleSort('price')}>{$t.price} {sortColumn === 'price' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => handleSort('rating')}>{$t.rating} {sortColumn === 'rating' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => handleSort('status')}>{$t.status} {sortColumn === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th></th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map(paint => (
                                <tr key={paint.id} ref={selectedId === paint.id ? selectedRowRef : null} className={`${styles.tableRow} ${selectedId === paint.id ? styles.tableRowSelected : ''}`} onClick={() => setSelectedId(paint.id)} onDoubleClick={() => { setEditingPaint(paint); setModalOpen(true); }}>
                                    <td className={styles.tableCell}>{paint.brand}</td>
                                    <td className={styles.tableCell}>{paint.series || '-'}</td>
                                    <td className={styles.tableCell}>{paint.color_name}</td>
                                    <td className={styles.tableCell}>{paint.article || '-'}</td>
                                    <td className={styles.tableCell}>{paint.base_color_name || '-'}</td>
                                    <td className={styles.tableCell}>{paint.purchase_date || '-'}</td>
                                    <td className={styles.tableCell}>{paint.price != null ? paint.price : '-'}</td>
                                    <td className={styles.tableCell} onClick={e => e.stopPropagation()}>
                                        {Array.from({ length: 5 }, (_, i) => (
                                            <span key={i} onClick={() => handleUpdateRating(paint.id, i + 1)} style={{ cursor: 'pointer', color: i < (paint.rating || 0) ? 'var(--star-active)' : 'var(--star-inactive)', fontSize: '16px' }}>★</span>
                                        ))}
                                    </td>
                                    <td className={styles.tableCell} onClick={e => e.stopPropagation()}>
                                        <select value={paint.status || 'instock'} onChange={(e) => handleUpdateStatus(paint.id, e.target.value)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', padding: '2px 4px', cursor: 'pointer', outline: 'none' }}>
                                            <option value="instock">{$t.inStock}</option><option value="low">{$t.low}</option><option value="out">{$t.outOfStock}</option><option value="ordered">{$t.ordered}</option>
                                        </select>
                                    </td>
                                    <td className={styles.tableCell}><button className={styles.iconBtn} onClick={e => { e.stopPropagation(); handleDeletePaint(paint.id); }}>🗑</button></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && !loading && <div className={styles.emptyState}>{$t.noPaints}</div>}
                    </div>

                    <div className={styles.statusBar}><span>{$t.totalPaints}: {filtered.length}</span><span>&nbsp;|&nbsp;</span><span>{$t.brands}: {brands.length}</span></div>
                </div>

                {selectedId && (<>
                    <div style={{ width: '4px', cursor: 'col-resize', background: isResizing ? 'var(--accent)' : 'var(--border)', transition: isResizing ? 'none' : 'background 0.2s', flexShrink: 0 }} onMouseDown={() => setIsResizing(true)} />
                    <div className={`${styles.rightPanel} ${rightPanelCollapsed ? styles.rightPanelCollapsed : ''}`} style={{ width: rightPanelCollapsed ? 32 : rightPanelWidth, minWidth: rightPanelCollapsed ? 32 : rightPanelWidth }}>
                        <button className={styles.collapseBtn} onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}>{rightPanelCollapsed ? '◀' : '▶'}</button>
                        {!rightPanelCollapsed && (
                            <div className={styles.panelContent}>
                                {(() => { const p = paints.find(x => x.id === selectedId); if (!p) return null; return (<>
                                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', textAlign: 'center' }}>{p.brand} – {p.color_name}</div>
                                    {p.series && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '12px' }}>[{p.series}]</div>}
                                    {selectedImageId && images.length > 0 ? (<>
                                        <div className={styles.galleryMain} onMouseEnter={() => setHoverMain(true)} onMouseLeave={() => setHoverMain(false)}>
                                            <img src={`data:${images.find(i => i.id === selectedImageId)?.content_type || 'image/jpeg'};base64,${images.find(i => i.id === selectedImageId)?.image_data}`} alt="Selected paint" />
                                            {hoverMain && (<div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}>
                                                <button onClick={(e) => { e.stopPropagation(); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) handleUploadImage(f); }; inp.click(); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>➕</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleSetPrimary(selectedImageId); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'var(--star-active)' }}>★</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(selectedImageId); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>🗑</button>
                                            </div>)}
                                        </div>
                                        <div className={styles.galleryThumbnails}>{images.map((img: any) => (<div key={img.id} className={`${styles.thumbnail} ${selectedImageId === img.id ? styles.thumbnailActive : ''}`} onClick={() => setSelectedImageId(img.id)}><img src={`data:${img.content_type || 'image/jpeg'};base64,${img.image_data}`} alt={img.filename} /></div>))}</div>
                                    </>) : (
                                        <div className={styles.galleryMain} onMouseEnter={() => setHoverMain(true)} onMouseLeave={() => setHoverMain(false)}><img src={placeholderImg} alt="No photo" style={{ opacity: 0.3 }} />{hoverMain && (<div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px' }}><button onClick={(e) => { e.stopPropagation(); const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) handleUploadImage(f); }; inp.click(); }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#fff' }}>➕</button></div>)}</div>
                                    )}
                                    <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0 12px' }} />
                                    <div className={styles.detailsLabel}>{$t.comment}</div>
                                    <textarea ref={commentRef} value={p.comment || ''} onChange={(e) => { handleUpdateComment(p.id, e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} style={{ width: '100%', minHeight: '40px', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', resize: 'none', outline: 'none', boxSizing: 'border-box', overflow: 'hidden' }} placeholder={$t.commentPlaceholder} />
                                </>); })()}
                            </div>
                        )}
                    </div>
                </>)}
            </div>
            {modalOpen && <PaintModal paint={editingPaint} brands={brands} series={series} baseColors={baseColors} onSave={handleSavePaint} onClose={() => setModalOpen(false)} />}
        </div>
    );
}