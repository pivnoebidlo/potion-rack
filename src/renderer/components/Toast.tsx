import { useState, useEffect, useCallback } from 'react';
import styles from './Toast.module.css';

interface ToastMessage {
    id: number;
    text: string;
    type: 'success' | 'error' | 'info';
}

let addToastGlobal: ((text: string, type: 'success' | 'error' | 'info') => void) | null = null;

export function showToast(text: string, type: 'success' | 'error' | 'info' = 'info') {
    if (addToastGlobal) addToastGlobal(text, type);
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    let idCounter = 0;

    const addToast = useCallback((text: string, type: 'success' | 'error' | 'info') => {
        const id = ++idCounter;
        setToasts(prev => [...prev, { id, text, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    useEffect(() => {
        addToastGlobal = addToast;
        return () => { addToastGlobal = null; };
    }, [addToast]);

    if (toasts.length === 0) return null;

    const typeClass = (type: string) => {
        if (type === 'success') return styles.success;
        if (type === 'error') return styles.error;
        return styles.info;
    };

    return (
        <div className={styles.container}>
            {toasts.map(t => (
                <div key={t.id} className={`${styles.toast} ${typeClass(t.type)}`}>
                    {t.text}
                </div>
            ))}
        </div>
    );
}