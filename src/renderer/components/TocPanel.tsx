import { useState, useEffect } from 'react';
import styles from './TocPanel.module.css';

interface TocItem {
    level: number;
    text: string;
    line: number;
}

interface TocPanelProps {
    content: string;
    onScrollToLine: (line: number) => void;
}

export default function TocPanel({ content, onScrollToLine }: TocPanelProps) {
    const [items, setItems] = useState<TocItem[]>([]);

    useEffect(() => {
        const lines = content.split('\n');
        const toc: TocItem[] = [];
        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,3})\s+(.+)$/);
            if (match) {
                toc.push({
                    level: match[1].length,
                    text: match[2].trim(),
                    line: index + 1
                });
            }
        });
        setItems(toc);
    }, [content]);

    return (
        <div className={styles.tocList}>
            {items.map((item, i) => (
                <div
                    key={i}
                    className={`${styles.tocItem} ${styles[`level${item.level}`]}`}
                    onClick={() => onScrollToLine(item.line)}
                >
                    <span className={styles.tocDot} />
                    <span>{item.text}</span>
                </div>
            ))}
            {items.length === 0 && (
                <div className={styles.tocEmpty}>Нет заголовков</div>
            )}
        </div>
    );
}