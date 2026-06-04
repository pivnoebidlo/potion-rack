import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}

export default function ConfirmModal({ title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel, danger = true }: ConfirmModalProps) {
    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.title}>{title}</div>
                <div className={styles.message}>{message}</div>
                <div className={styles.buttons}>
                    <button className={styles.btnCancel} onClick={onCancel}>{cancelLabel}</button>
                    <button className={styles.btnConfirm} onClick={onConfirm} style={danger ? {} : { background: 'var(--accent)' }}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}