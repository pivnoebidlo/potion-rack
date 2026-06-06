import { useState, useRef, useEffect } from 'react';
import styles from './TableDialog.module.css';

interface TableDialogProps {
    onInsert: (rows: number, cols: number) => void;
    onClose: () => void;
}

export default function TableDialog({ onInsert, onClose }: TableDialogProps) {
    const [hoveredRow, setHoveredRow] = useState(1);
    const [hoveredCol, setHoveredCol] = useState(1);
    const [selected, setSelected] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    const maxRows = 5;
    const maxCols = 5;

    const handleMouseEnter = (r: number, c: number) => {
        if (!selected) {
            setHoveredRow(r);
            setHoveredCol(c);
        }
    };

    const handleClick = (r: number, c: number) => {
        onInsert(r + 1, c + 1);
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.dialog} ref={dialogRef}>
                <div className={styles.title}>Выберите размер таблицы</div>
                <div className={styles.label}>{hoveredRow + 1} × {hoveredCol + 1}</div>
                <div className={styles.grid}>
                    {Array.from({ length: maxRows }, (_, r) => (
                        <div key={r} className={styles.row}>
                            {Array.from({ length: maxCols }, (_, c) => (
                                <div
                                    key={c}
                                    className={`${styles.cell} ${r <= hoveredRow && c <= hoveredCol ? styles.active : ''}`}
                                    onMouseEnter={() => handleMouseEnter(r, c)}
                                    onClick={() => handleClick(r, c)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}