import { useState, useEffect } from 'react';
import { Figure } from '../services/apiFigures';
import styles from './FigureModal.module.css';
import { t } from '../i18n';

interface FigureModalProps {
    figure: Figure | null;
    onSave: (data: Partial<Figure>) => Promise<void>;
    onClose: () => void;
}

export default function FigureModal({ figure, onSave, onClose }: FigureModalProps) {
    const $t = t();
    const isEdit = figure !== null;
    const [name, setName] = useState(figure?.name || '');
    const [manufacturer, setManufacturer] = useState(figure?.manufacturer || '');
    const [scale, setScale] = useState(figure?.scale || '');
    const [material, setMaterial] = useState<Figure['material']>(figure?.material || 'resin');
    const [status, setStatus] = useState<Figure['status']>(figure?.status || 'draft');
    const [purchaseDate, setPurchaseDate] = useState(figure?.purchase_date || '');
    const [completedDate, setCompletedDate] = useState(figure?.completed_date || '');
    const [shopUrl, setShopUrl] = useState(figure?.shop_url || '');

    useEffect(() => {
        if (figure) {
            setName(figure.name || '');
            setManufacturer(figure.manufacturer || '');
            setScale(figure.scale || '');
            setMaterial(figure.material || 'resin');
            setStatus(figure.status || 'draft');
            setPurchaseDate(figure.purchase_date || '');
            setCompletedDate(figure.completed_date || '');
            setShopUrl(figure.shop_url || '');
        }
    }, [figure]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSave = async () => {
        if (!name.trim()) return;
        try {
            console.log('Saving:', { purchase_date: purchaseDate, completed_date: completedDate });
            await onSave({
                id: figure?.id,
                name: name.trim(),
                manufacturer: manufacturer.trim() || undefined,
                scale: scale.trim() || undefined,
                material,
                status,
                purchase_date: purchaseDate || null,
                completed_date: completedDate || null,
                shop_url: shopUrl.trim() || undefined,
            });
            const updated = await fetch(`http://127.0.0.1:8765/api/figures/${figure?.id}`).then(r => r.json());
            console.log('After save:', JSON.stringify({ purchase_date: updated.purchase_date, completed_date: updated.completed_date }));
            onClose();
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    return (
        <div id="figure-modal-overlay" className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}><div className={styles.title}>{isEdit ? $t.editFigure : $t.addFigure}</div><button className={styles.closeBtn} onClick={onClose}>✕</button></div>
                <div className={styles.body}>
                    <div className={styles.group}><label className={styles.label}>{$t.figureName} *</label><input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder={$t.figureName} autoFocus /></div>
                    <div className={styles.group}><label className={styles.label}>{$t.manufacturer}</label><input className={styles.input} value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. Games Workshop" /></div>
                    <div className={styles.formRow}>
                        <div className={styles.group} style={{flex:1}}><label className={styles.label}>{$t.scale}</label><input className={styles.input} value={scale} onChange={e => setScale(e.target.value)} placeholder="e.g. 28mm" /></div>
                        <div className={styles.group} style={{flex: 1}}><label
                            className={styles.label}>{$t.material}</label><select className={styles.select}
                                                                                  value={material}
                                                                                  onChange={e => setMaterial(e.target.value as Figure['material'])}>
                            <option value="resin">{$t.resin}</option>
                            <option value="plastic">{$t.plastic}</option>
                            <option value="metal">{$t.metal}</option>
                            <option value="other">{$t.other}</option>
                        </select></div>
                    </div>
                    <div className={styles.group}><label className={styles.label}>{$t.status}</label><select className={styles.select} value={status} onChange={e => setStatus(e.target.value as Figure['status'])}><option value="draft">{$t.draft}</option><option value="in-progress">{$t.inProgress}</option><option value="completed">{$t.completed}</option></select></div>
                    <div className={styles.formRow}>
                        <div className={styles.group} style={{flex:1}}>
                            <label className={styles.label}>{$t.purchaseDate}</label>
                            <div style={{position:'relative'}}>
                                <input className={styles.input} style={{width:'100%', paddingRight:24}} type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                                {purchaseDate && <button onClick={() => setPurchaseDate('')} style={{position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, lineHeight:1}}>✕</button>}
                            </div>
                        </div>
                        <div className={styles.group} style={{flex:1}}>
                            <label className={styles.label}>{$t.completedDate || 'Дата завершения'}</label>
                            <div style={{position:'relative'}}>
                                <input className={styles.input} style={{width:'100%', paddingRight:24}} type="date" value={completedDate} onChange={e => setCompletedDate(e.target.value)} />
                                {completedDate && <button onClick={() => setCompletedDate('')} style={{position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, lineHeight:1}}>✕</button>}
                            </div>
                        </div>
                    </div>
                    <div className={styles.group}><label className={styles.label}>{$t.shopUrl || 'Shop Link'}</label><input className={styles.input} value={shopUrl} onChange={e => setShopUrl(e.target.value)} placeholder="https://..." /></div>
                </div>
                <div className={styles.footer}>
                    <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>{$t.cancel}</button>
                    <button className={`${styles.btn} ${styles.btnSave}`} onClick={handleSave} disabled={!name.trim()}>{$t.save}</button>
                </div>
            </div>
        </div>
    );
}