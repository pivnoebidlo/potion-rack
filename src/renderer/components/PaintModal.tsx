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
        }
    }, [paint]);

    const handleSave = async () => {
        if (!brand.trim() || !colorName.trim()) return;
        setSaving(true);
        try {
            await onSave({
                id: paint?.id,
                brand: brand.trim(),
                series: seriesVal.trim() || undefined,
                color_name: colorName.trim(),
                article: article.trim() || undefined,
                base_color_id: baseColorId ? Number(baseColorId) : undefined,
                rating,
                status,
                purchase_date: purchaseDate || undefined,
                price: price ? parseFloat(price) : undefined,
                comment: comment.trim() || undefined,
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
                            <input className={styles.input} value={seriesVal} onChange={e => setSeriesVal(e.target.value)} placeholder={$t.series + '...'} list="series-list" />
                            <datalist id="series-list">{series.map(s => <option key={s} value={s} />)}</datalist>
                        </div>
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>{$t.colorName} *</label>
                        <input className={styles.input} value={colorName} onChange={e => setColorName(e.target.value)} placeholder="e.g. Mephiston Red" />
                    </div>
                    <div className={styles.row}>
                        <div className={styles.group}>
                            <label className={styles.label}>{$t.article}</label>
                            <input className={styles.input} value={article} onChange={e => setArticle(e.target.value)} placeholder="e.g. 22-03" />
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
                            <input className={styles.input} value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
                        </div>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.group}>
                            <label className={styles.label}>{$t.purchaseDate}</label>
                            <input className={styles.input} type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
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