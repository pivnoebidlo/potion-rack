import { useState } from 'react';
import { Figure } from '../services/apiFigures';
import styles from './FigureModal.module.css';

interface FigureModalProps {
    figure: Figure | null;
    onSave: (data: Partial<Figure>) => Promise<void>;
    onClose: () => void;
}

export default function FigureModal({ figure, onSave, onClose }: FigureModalProps) {
    const isEdit = figure !== null;
    const [name, setName] = useState(figure?.name || '');
    const [manufacturer, setManufacturer] = useState(figure?.manufacturer || '');
    const [scale, setScale] = useState(figure?.scale || '');
    const [material, setMaterial] = useState<Figure['material']>(figure?.material || 'plastic');
    const [status, setStatus] = useState<Figure['status']>(figure?.status || 'draft');
    const [description, setDescription] = useState(figure?.description || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await onSave({
                id: figure?.id,
                name: name.trim(),
                manufacturer: manufacturer.trim() || undefined,
                scale: scale.trim() || undefined,
                material: material,
                status: status,
                description: description.trim() || undefined,
            });
            onClose();
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div id="figure-modal-overlay" className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.title}>{isEdit ? 'Edit Figure' : 'Add Figure'}</div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <div className={styles.body}>
                    <div className={styles.group}>
                        <label className={styles.label}>Name *</label>
                        <input
                            className={styles.input}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Figure name"
                            autoFocus
                        />
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>Manufacturer</label>
                        <input
                            className={styles.input}
                            value={manufacturer}
                            onChange={e => setManufacturer(e.target.value)}
                            placeholder="e.g. Games Workshop"
                        />
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>Scale</label>
                        <input
                            className={styles.input}
                            value={scale}
                            onChange={e => setScale(e.target.value)}
                            placeholder="e.g. 28mm"
                        />
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>Material</label>
                        <select
                            className={styles.select}
                            value={material}
                            onChange={e => setMaterial(e.target.value as Figure['material'])}
                        >
                            <option value="plastic">Plastic</option>
                            <option value="resin">Resin</option>
                            <option value="metal">Metal</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>Status</label>
                        <select
                            className={styles.select}
                            value={status}
                            onChange={e => setStatus(e.target.value as Figure['status'])}
                        >
                            <option value="draft">Draft</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                    <div className={styles.group}>
                        <label className={styles.label}>Description</label>
                        <textarea
                            className={styles.textarea}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Brief description..."
                            rows={4}
                        />
                    </div>
                </div>
                <div className={styles.footer}>
                    <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className={`${styles.btn} ${styles.btnSave}`}
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}