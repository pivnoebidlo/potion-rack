import { useState, useEffect } from 'react';
import { t } from '../i18n';

interface PaintOption {
    id: number;
    brand: string;
    color_name: string;
    color_hex?: string;
    series?: string;
}

export default function FigurePaintPicker({ figureId, onClose, onAdded }: { figureId: number; onClose: () => void; onAdded: () => void }) {
    const $t = t();
    const [paints, setPaints] = useState<PaintOption[]>([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<number>>(new Set());

    useEffect(() => {
        Promise.all([
            fetch('http://127.0.0.1:8765/api/paints').then(r => r.json()),
            fetch(`http://127.0.0.1:8765/api/figures/${figureId}/paints`).then(r => r.json())
        ]).then(([allPaints, linkedPaints]) => {
            const linkedIds = new Set((linkedPaints as any[]).map((p: any) => p.paint_id));
            setPaints((allPaints as any[]).filter((p: any) => !linkedIds.has(p.id)));
        }).catch(console.error);
    }, [figureId]);

    const filtered = paints.filter(p =>
        !search ||
        p.color_name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase())
    );

    const toggle = (id: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleAdd = async () => {
        if (selected.size === 0) return;
        await fetch(`http://127.0.0.1:8765/api/figures/${figureId}/paints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paint_ids: [...selected] }),
        });
        onAdded();
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', width: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>🎨 {$t.addPaintToFigure || 'Add Paints'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>{$t.selectPaints || 'Select one or more paints'}</div>
                <input
                    type="text"
                    placeholder={$t.searchPaints || 'Search paints...'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    autoFocus
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
                />
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300 }}>
                    {filtered.slice(0, 30).map(p => (
                        <div
                            key={p.id}
                            onClick={() => toggle(p.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer', fontSize: 13,
                                background: selected.has(p.id) ? 'var(--accent-light)' : 'transparent',
                            }}
                        >
                            <span style={{ color: 'var(--accent)', fontWeight: 700, width: 16, textAlign: 'center' }}>
                                {selected.has(p.id) ? '✓' : ''}
                            </span>
                            <span style={{ width: 16, height: 16, borderRadius: '50%', background: p.color_hex || 'transparent', border: '1px dashed var(--text-muted)' }} />
                            <span style={{ fontWeight: 600 }}>{p.color_name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{p.brand}</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13 }}>{$t.cancel}</button>
                    <button onClick={handleAdd} disabled={selected.size === 0} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, opacity: selected.size > 0 ? 1 : 0.5 }}>
                        {$t.addPaints || 'Add'} ({selected.size})
                    </button>
                </div>
            </div>
        </div>
    );
}