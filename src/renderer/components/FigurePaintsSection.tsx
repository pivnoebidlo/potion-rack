import { useState, useEffect, useCallback } from 'react';
import styles from './FiguresApp.module.css';
import { t } from '../i18n';
import FigurePaintPicker from './FigurePaintPicker';

interface FigurePaint {
    id: number;
    paint_id: number;
    brand: string;
    series?: string;
    color_name: string;
    color_hex?: string;
    article?: string;
}

export default function FigurePaintsSection({ figureId }: { figureId: number }) {
    const $t = t();
    const [paints, setPaints] = useState<FigurePaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [pickerOpen, setPickerOpen] = useState(false);

    const loadPaints = useCallback(async () => {
        try {
            const res = await fetch(`http://127.0.0.1:8765/api/figures/${figureId}/paints`);
            const data = await res.json();
            setPaints(data);
        } catch (err) {
            console.error('Failed to load figure paints:', err);
        } finally {
            setLoading(false);
        }
    }, [figureId]);

    useEffect(() => { loadPaints(); }, [loadPaints]);

    const handleRemove = async (paintId: number) => {
        await fetch(`http://127.0.0.1:8765/api/figures/${figureId}/paints/${paintId}`, { method: 'DELETE' });
        setPaints(prev => prev.filter(p => p.paint_id !== paintId));
    };

    if (loading) return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>...</span>;

    return (
        <div className={styles.figurePaintsList}>
            {paints.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{$t.noPaintsLinked || 'No paints linked'}</span>
            ) : (
                paints.map(p => (
                    <div key={p.id} className={styles.figurePaintChip}>
                        <span
                            className={styles.figurePaintDot}
                            style={{ background: p.color_hex || 'var(--text-muted)' }}
                        />
                        <span className={styles.figurePaintName}>{p.color_name}</span>
                        <span className={styles.figurePaintMeta}>{p.brand}</span>
                        <span
                            className={styles.figurePaintRemove}
                            onClick={() => handleRemove(p.paint_id)}
                        >✕</span>
                    </div>
                ))
            )}
            <div className={styles.figureAddPaintBtn} onClick={() => setPickerOpen(true)}>
                + {$t.addPaint || 'Add paint'}
            </div>

            {pickerOpen && (
                <FigurePaintPicker
                    figureId={figureId}
                    onClose={() => setPickerOpen(false)}
                    onAdded={() => loadPaints()}
                />
            )}
        </div>
    );
}