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
    const [material, setMaterial] = useState<Figure['material']>(figure?.material || 'plastic');
    const [status, setStatus] = useState<Figure['status']>(figure?.status || 'draft');
    const [description, setDescription] = useState(figure?.description || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (figure) { setName(figure.name || ''); setManufacturer(figure.manufacturer || ''); setScale(figure.scale || ''); setMaterial(figure.material || 'plastic'); setStatus(figure.status || 'draft'); setDescription(figure.description || ''); } }, [figure]);

    const handleSave = async () => { if (!name.trim()) return; setSaving(true); try { await onSave({ id: figure?.id, name: name.trim(), manufacturer: manufacturer.trim() || undefined, scale: scale.trim() || undefined, material, status, description: description.trim() || undefined }); onClose(); } catch (err) { console.error('Save failed:', err); } finally { setSaving(false); } };

    return (
        <div id="figure-modal-overlay" className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}><div className={styles.title}>{isEdit ? $t.editFigure : $t.addFigure}</div><button className={styles.closeBtn} onClick={onClose}>✕</button></div>
                <div className={styles.body}>
                    <div className={styles.group}><label className={styles.label}>{$t.colorName} *</label><input className={styles.input} value={name} onChange={e => setName(e.target.value)} placeholder={$t.colorName} autoFocus /></div>
                    <div className={styles.group}><label className={styles.label}>{$t.manufacturer}</label><input className={styles.input} value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. Games Workshop" /></div>
                    <div className={styles.group}><label className={styles.label}>{$t.scale}</label><input className={styles.input} value={scale} onChange={e => setScale(e.target.value)} placeholder="e.g. 28mm" /></div>
                    <div className={styles.group}><label className={styles.label}>{$t.material}</label><select className={styles.select} value={material} onChange={e => setMaterial(e.target.value as Figure['material'])}><option value="plastic">{$t.plastic}</option><option value="resin">{$t.resin}</option><option value="metal">{$t.metal}</option><option value="other">{$t.other}</option></select></div>
                    <div className={styles.group}><label className={styles.label}>{$t.status}</label><select className={styles.select} value={status} onChange={e => setStatus(e.target.value as Figure['status'])}><option value="draft">{$t.draft}</option><option value="in-progress">{$t.inProgress}</option><option value="completed">{$t.completed}</option></select></div>
                    <div className={styles.group}><label className={styles.label}>{$t.description}</label><textarea className={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} placeholder={$t.description} rows={4} /></div>
                </div>
                <div className={styles.footer}>
                    <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>{$t.cancel}</button>
                    <button className={`${styles.btn} ${styles.btnSave}`} onClick={handleSave} disabled={saving || !name.trim()}>{saving ? '...' : $t.save}</button>
                </div>
            </div>
        </div>
    );
}