import { useState, useRef, useEffect } from 'react';
import styles from './PromptModal.module.css';
import { t } from '../i18n';

interface PromptModalProps {
    title: string;
    defaultValue?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

export default function PromptModal({ title, defaultValue = '', onConfirm, onCancel }: PromptModalProps) {
    const $t = t();
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onConfirm(value);
        if (e.key === 'Escape') onCancel();
    };

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.title}>{title}</div>
                <input
                    ref={inputRef}
                    className={styles.input}
                    type="text"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <div className={styles.buttons}>
                    <button className={styles.btnCancel} onClick={onCancel}>{$t.cancel}</button>
                    <button className={styles.btnOk} onClick={() => onConfirm(value)}>OK</button>
                </div>
            </div>
        </div>
    );
}