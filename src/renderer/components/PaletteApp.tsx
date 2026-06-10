import { useState, useEffect, useCallback } from 'react';
import styles from './PaletteApp.module.css';
import { t } from '../i18n';
import { Paint } from '../types/paint';
import { mixColors } from '../utils/colorUtils';

interface MixPaint extends Paint {
    ratio: number;
}

export default function PaletteApp() {
    const $t = t();
    const [paints, setPaints] = useState<Paint[]>([]);
    const [mixPaints, setMixPaints] = useState<MixPaint[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [savedMixes, setSavedMixes] = useState<MixPaint[][]>([]);
    const [resultColor, setResultColor] = useState<string | null>(null);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [mixName, setMixName] = useState('');
    const [pendingRatios, setPendingRatios] = useState<Record<number, string>>({});

    useEffect(() => {
        fetch('http://127.0.0.1:8765/api/paints')
            .then(r => r.json())
            .then(data => setPaints(data.filter((p: Paint) => p.color_hex)))
            .catch(console.error);
    }, []);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('potion-rack-palette-mixes');
            if (saved) setSavedMixes(JSON.parse(saved));
        } catch (e) {}
    }, []);

    useEffect(() => {
        if (mixPaints.length === 0) {
            setResultColor(null);
            return;
        }
        const color = mixColors(
            mixPaints.map(p => ({ hex: p.color_hex!, ratio: p.ratio }))
        );
        setResultColor(color);
    }, [mixPaints]);

    useEffect(() => {
        const newPending: Record<number, string> = {};
        mixPaints.forEach(p => { newPending[p.id] = String(p.ratio); });
        setPendingRatios(newPending);
    }, [mixPaints]);

    const addToMix = useCallback((paint: Paint) => {
        setMixPaints(prev => {
            if (prev.find(p => p.id === paint.id)) return prev;
            const newCount = prev.length + 1;
            const equalRatio = Math.floor(100 / newCount);
            const remainder = 100 - equalRatio * newCount;
            const updated = prev.map((p, i) => ({ ...p, ratio: equalRatio + (i === 0 ? remainder : 0) }));
            return [...updated, { ...paint, ratio: equalRatio }];
        });
        setSearchOpen(false);
        setSearchQuery('');
    }, []);

    const removeFromMix = useCallback((id: number) => {
        setMixPaints(prev => {
            const filtered = prev.filter(p => p.id !== id);
            if (filtered.length === 0) return filtered;
            const equalRatio = Math.floor(100 / filtered.length);
            const remainder = 100 - equalRatio * filtered.length;
            return filtered.map((p, i) => ({ ...p, ratio: equalRatio + (i === 0 ? remainder : 0) }));
        });
    }, []);

    const updateRatio = useCallback((id: number, ratio: number) => {
        setMixPaints(prev => {
            const clamped = Math.max(0, Math.min(100, ratio));
            const idx = prev.findIndex(p => p.id === id);
            if (idx === -1) return prev;

            const others = prev.filter(p => p.id !== id);
            if (others.length === 0) return prev.map(p => p.id === id ? { ...p, ratio: 100 } : p);

            const remaining = 100 - clamped;
            const equalShare = Math.floor(remaining / others.length);
            const rem = remaining - equalShare * others.length;

            const updatedOthers = others.map((p, i) => ({ ...p, ratio: equalShare + (i === 0 ? rem : 0) }));
            const updated = [...updatedOthers];
            updated.splice(idx, 0, { ...prev[idx], ratio: clamped });
            return updated;
        });
    }, []);

    const applyRatios = useCallback(() => {
        const entries = Object.entries(pendingRatios).map(([id, val]) => ({
            id: parseInt(id),
            ratio: Math.max(0, Math.min(100, parseInt(val) || 0))
        }));
        const total = entries.reduce((sum, e) => sum + e.ratio, 0);
        if (total === 0) return;

        setMixPaints(prev => {
            return prev.map(p => {
                const entry = entries.find(e => e.id === p.id);
                if (entry) {
                    return { ...p, ratio: Math.round((entry.ratio / total) * 100) };
                }
                return p;
            });
        });
    }, [pendingRatios]);

    const saveMix = useCallback(async () => {
        if (!resultColor || mixPaints.length === 0) return;
        setMixName('');
        setSaveModalOpen(true);
    }, [resultColor, mixPaints]);

    const confirmSaveMix = useCallback(async () => {
        if (!resultColor || !mixName.trim()) return;
        try {
            const res = await fetch('http://127.0.0.1:8765/api/paints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand: 'Custom Mix',
                    color_name: mixName.trim(),
                    color_hex: resultColor,
                    is_mix: 1,
                    comment: mixPaints.map(p => `${p.brand} ${p.color_name} ${p.ratio}%`).join(' + '),
                }),
            });
            if (res.status === 409) {
                alert($t.duplicateMix || 'A mix with this name already exists');
                return;
            }
            if (res.ok) {
                const saved = [...savedMixes, mixPaints];
                setSavedMixes(saved);
                localStorage.setItem('potion-rack-palette-mixes', JSON.stringify(saved));
                setMixPaints([]);
                setResultColor(null);
                setSaveModalOpen(false);
            }
        } catch (err) {
            console.error('Save mix failed:', err);
        } finally {
            setSaveModalOpen(false);
        }
    }, [resultColor, mixName, mixPaints, savedMixes]);

    const filteredPaints = paints.filter(p =>
        !searchQuery ||
        p.color_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const navigateTo = (page: string) => {
        if (page === 'paints') window.location.href = 'paints.html';
        else if (page === 'figures') window.location.href = 'figures.html';
        else if (page === 'settings') window.location.href = 'settings.html';
    };

    return (
        <div className={styles.root}>
            <div className={styles.sidebar}>
                <div className={styles.sidebarItem} onClick={() => navigateTo('paints')}>🎨</div>
                <div className={styles.sidebarItem} onClick={() => navigateTo('figures')}>🧩</div>
                <div className={`${styles.sidebarItem} ${styles.sidebarItemActive}`}>🖌️</div>
                <div className={styles.sidebarItem} onClick={() => navigateTo('settings')}>⚙️</div>
            </div>

            <div className={styles.main}>
                <div className={styles.colorSection}>
                    <div
                        className={styles.colorCircle}
                        style={{ background: resultColor || 'var(--bg-input)' }}
                    />
                    <div className={styles.colorLabel}>{$t.resultColor || 'Result Color'}</div>
                    <div className={styles.colorHex}>{resultColor || '—'}</div>
                </div>

                <div className={styles.mixPanel}>
                    <div className={styles.sectionTitle}>
                        🖌️ {$t.mixPalette || 'Mix Palette'}
                    </div>

                    {mixPaints.map(paint => (
                        <div key={paint.id} className={styles.paintRow}>
                            <div
                                className={styles.paintDot}
                                style={{ background: paint.color_hex || 'transparent' }}
                            />
                            <div className={styles.paintInfo}>
                                <div className={styles.paintName}>{paint.color_name}</div>
                                <div className={styles.paintMeta}>
                                    {paint.brand}{paint.series ? ` · ${paint.series}` : ''}
                                </div>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={paint.ratio}
                                onChange={e => updateRatio(paint.id, parseInt(e.target.value))}
                                className={styles.slider}
                            />
                            <input
                                type="text"
                                value={pendingRatios[paint.id] ?? String(paint.ratio)}
                                onChange={e => {
                                    setPendingRatios(prev => ({ ...prev, [paint.id]: e.target.value }));
                                }}
                                className={styles.ratioInput}
                            />
                            <span className={styles.percentSign}>%</span>
                            <span className={styles.removeBtn} onClick={() => removeFromMix(paint.id)}>✕</span>
                        </div>
                    ))}

                    <div className={styles.addRow} onClick={() => setSearchOpen(!searchOpen)}>
                        + {$t.addPaint || 'Add paint'}
                    </div>

                    {searchOpen && (
                        <div className={styles.searchPopup}>
                            <input
                                type="text"
                                placeholder={$t.searchPaints || 'Search paints...'}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                autoFocus
                                className={styles.searchInput}
                            />
                            <div className={styles.searchList}>
                                {filteredPaints.slice(0, 20).map(p => (
                                    <div
                                        key={p.id}
                                        className={styles.searchItem}
                                        onClick={() => addToMix(p)}
                                    >
                                        <div
                                            className={styles.searchDot}
                                            style={{ background: p.color_hex || 'transparent' }}
                                        />
                                        <span>
                                            {p.color_name}{' '}
                                            <span className={styles.searchMeta}>{p.brand}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button
                            className={styles.btn}
                            onClick={() => { setMixPaints([]); setResultColor(null); }}
                        >
                            {$t.clearAll || 'Clear All'}
                        </button>
                        <button
                            className={styles.btn}
                            onClick={applyRatios}
                        >
                            {$t.applyRatios || 'Apply'}
                        </button>
                        <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={saveMix}
                            disabled={!resultColor || mixPaints.length < 2}
                        >
                            💾 {$t.saveMix || 'Save Mix'}
                        </button>
                    </div>
                </div>
            </div>

            {saveModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', width: '360px' }}>
                        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>💾 {$t.saveMix || 'Save Mix'}</div>
                        <input
                            type="text"
                            placeholder={$t.mixName || 'Mix name'}
                            value={mixName}
                            onChange={e => setMixName(e.target.value)}
                            autoFocus
                            style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
                            onKeyDown={e => { if (e.key === 'Enter') confirmSaveMix(); if (e.key === 'Escape') setSaveModalOpen(false); }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setSaveModalOpen(false)} style={{ padding: '8px 16px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13 }}>{$t.cancel}</button>
                            <button onClick={confirmSaveMix} disabled={!mixName.trim()} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13, opacity: mixName.trim() ? 1 : 0.5 }}>{$t.save}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}