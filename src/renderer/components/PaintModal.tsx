import { useState, useEffect } from 'react';
import styles from './PaintModal.module.css';
import { t } from '../i18n';

interface Paint {
    id?: number;
    brand: string;
    series?: string;
    color_name: string;
    article?: string;
    base_color_id?: number;
    rating?: number;
    status?: string;
    purchase_date?: string;
    price?: number;
    comment?: string;
    color_hex?: string;
}

interface PaintModalProps {
    paint: Paint | null;
    brands: string[];
    series: string[];
    baseColors: { id: number; name: string }[];
    onSave: (data: Partial<Paint>) => Promise<void>;
    onClose: () => void;
}

export default function PaintModal({ paint, brands, series, baseColors, onSave, onClose }: PaintModalProps) {
    const $t = t();
    const isEdit = paint !== null;
    const [brand, setBrand] = useState(paint?.brand || '');
    const [seriesVal, setSeriesVal] = useState(paint?.series || '');
    const [colorName, setColorName] = useState(paint?.color_name || '');
    const [article, setArticle] = useState(paint?.article || '');
    const [baseColorId, setBaseColorId] = useState(paint?.base_color_id || '');
    const [rating, setRating] = useState(paint?.rating || 0);
    const [status, setStatus] = useState(paint?.status || 'instock');
    const [purchaseDate, setPurchaseDate] = useState(paint?.purchase_date || '');
    const [price, setPrice] = useState(paint?.price?.toString() || '');
    const [comment, setComment] = useState(paint?.comment || '');
    const [colorHex, setColorHex] = useState(paint?.color_hex || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (paint) {
            setBrand(paint.brand || '');
            setSeriesVal(paint.series || '');
            setColorName(paint.color_name || '');
            setArticle(paint.article || '');
            setBaseColorId(paint.base_color_id || '');
            setRating(paint.rating || 0);
            setStatus(paint.status || 'instock');
            setPurchaseDate(paint.purchase_date || '');
            setPrice(paint.price?.toString() || '');
            setComment(paint.comment || '');
            setColorHex(paint.color_hex || '');
        }
    }, [paint]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, brand, seriesVal, colorName, article, baseColorId, rating, status, purchaseDate, price, comment, colorHex]);

    const handleSave = async () => {
        if (!brand.trim() || !colorName.trim()) return;
        setSaving(true);
        try {
            await onSave({
                id: paint?.id,
                brand: brand.trim(),
                series: seriesVal.trim() || null,
                color_name: colorName.trim(),
                article: article.trim() || null,
                base_color_id: baseColorId ? Number(baseColorId) : null,
                rating,
                status,
                purchase_date: purchaseDate || null,
                price: price ? parseFloat(price) : null,
                comment: comment.trim() || undefined,
                color_hex: colorHex || null,
            });
            onClose();
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id="paint-modal-overlay" className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.title}>{isEdit ? $t.editPaint : $t.addPaint}</div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div className={styles.body}>
                    <div className={styles.row}>
                        <div className={styles.group}>
                            <label className={styles.label}>{$t.brand} *</label>
                            <input className={styles.input} value={brand} onChange={e => setBrand(e.target.value)} placeholder={$t.brand + '...'} list="brands-list" autoFocus />
                            <datalist id="brands-list">{brands.map(b => <option key={b} value={b} />)}</datalist>
                        </div>
                        <div className={styles.group}>
                            <label className={styles.label}>{$t.series}</label>
                            <div style={{position:'relative'}}>
                                <input className={styles.input} style={{width:'100%', paddingRight:24}} value={seriesVal} onChange={e => setSeriesVal(e.target.value)} placeholder={$t.series + '...'} list="series-list" />
                                {seriesVal && <button onClick={() => setSeriesVal('')} style={{position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, lineHeight:1}}>✕</button>}
                            </div>
                            <datalist id="series-list">{series.map(s => <option key={s} value={s} />)}</datalist>
                        </div>
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>{$t.colorName} *</label>
                        <input className={styles.input} value={colorName} onChange={e => setColorName(e.target.value)} placeholder="e.g. Mephiston Red" />
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>{$t.paintColor || 'Цвет краски'}</label>
                        <div style={{display:'flex', gap:8, alignItems:'center'}}>
                            <input type="color" value={colorHex || '#000000'} onChange={e => setColorHex(e.target.value)} style={{width:36, height:36, padding:0, border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', background:'none'}} />
                            <div style={{position:'relative', flex:1}}>
                                <input className={styles.input} value={colorHex} onChange={e => setColorHex(e.target.value)} placeholder="#RRGGBB" style={{width:'100%', paddingRight:24}} />
                                {colorHex && <button onClick={() => setColorHex('')} style={{position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, lineHeight:1}}>✕</button>}
                            </div>
                        </div>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.group}>
                            <label className={styles.label}>{$t.article}</label>
                            <div style={{position:'relative'}}>
                                <input className={styles.input} style={{width:'100%', paddingRight:24}} value={article} onChange={e => setArticle(e.target.value)} placeholder="e.g. 22-03" />
                                {article && <button onClick={() => setArticle('')} style={{position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, lineHeight:1}}>✕</button>}
                            </div>
                        </div>
                        <div className={styles.group}>
                            <label className={styles.label}>{$t.baseColor}</label>
                            <select className={styles.select} value={baseColorId} onChange={e => setBaseColorId(e.target.value)}>
                                <option value="">{$t.none}</option>
                                {baseColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.group}>
                            <label className={styles.label}>{$t.status}</label>
                            <select className={styles.select} value={status} onChange={e => setStatus(e.target.value)}>
                                <option value="instock">{$t.inStock}</option>
                                <option value="low">{$t.low}</option>
                                <option value="out">{$t.outOfStock}</option>
                                <option value="ordered">{$t.ordered}</option>
                            </select>
                        </div>
                        <div className={styles.group}>
                            <label className={styles.label}>{$t.price}</label>
                            <div style={{position:'relative'}}>
                                <input className={styles.input} style={{width:'100%', paddingRight:24}} value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                                {price && <button onClick={() => setPrice('')} style={{position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, lineHeight:1}}>✕</button>}
                            </div>
                        </div>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.group}>
                            <label className={styles.label}>{$t.purchaseDate}</label>
                            <div style={{position:'relative'}}>
                                <input className={styles.input} style={{width:'100%', paddingRight:24}} type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                                {purchaseDate && <button onClick={() => setPurchaseDate('')} style={{position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, lineHeight:1}}>✕</button>}
                            </div>
                        </div>
                        <div className={styles.group}>
                            <label className={styles.label}>{$t.rating}</label>
                            <div className={styles.stars}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <button key={i} type="button" className={`${styles.star} ${i <= rating ? styles.starActive : ''}`} onClick={() => setRating(i)}>★</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>{$t.comment}</label>
                        <textarea className={styles.textarea} value={comment} onChange={e => setComment(e.target.value)} placeholder={$t.commentPlaceholder} rows={4} />
                    </div>
                </div>
                <div className={styles.footer}>
                    <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>{$t.cancel}</button>
                    <button className={`${styles.btn} ${styles.btnSave}`} onClick={handleSave} disabled={saving || !brand.trim() || !colorName.trim()}>{saving ? '...' : $t.save}</button>
                </div>
            </div>
        </div>
    );
}