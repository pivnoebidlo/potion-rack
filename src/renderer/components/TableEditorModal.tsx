import { useState, useEffect, useCallback } from 'react';
import { t } from '../i18n';

interface TableEditorModalProps {
    initialMarkdown: string;
    onApply: (markdown: string) => void;
    onCancel: () => void;
}

export default function TableEditorModal({ initialMarkdown, onApply, onCancel }: TableEditorModalProps) {
    const $t = t();
    const [confirmDelete, setConfirmDelete] = useState(false);

    const parseTable = (md: string): string[][] => {
        const lines = md.trim().split('\n');
        const rows: string[][] = [];
        for (const line of lines) {
            if (/^\|[-:\s|]+\|$/.test(line)) continue;
            const raw = line.split('|');
            const cells = raw.slice(1, -1).map(c => c.trim().replace(/ \/ /g, '\n'));
            if (cells.length > 0) rows.push(cells);
        }
        return rows.length >= 2 ? rows : [['', '', ''], ['', '', '']];
    };

    const [rows, setRows] = useState<string[][]>(parseTable(initialMarkdown));

    const updateCell = (r: number, c: number, value: string) => {
        setRows(prev => {
            const updated = prev.map(row => [...row]);
            updated[r][c] = value;
            return updated;
        });
    };

    const addRow = (afterIndex: number) => {
        setRows(prev => {
            const cols = prev[0]?.length || 1;
            const newRow = Array(cols).fill('');
            const updated = [...prev];
            updated.splice(afterIndex + 1, 0, newRow);
            return updated;
        });
    };

    const deleteRow = (index: number) => {
        if (rows.length <= 1) return;
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    const addCol = (afterIndex: number) => {
        setRows(prev => prev.map(row => {
            const updated = [...row];
            updated.splice(afterIndex + 1, 0, '');
            return updated;
        }));
    };

    const deleteCol = (index: number) => {
        if ((rows[0]?.length || 0) <= 1) return;
        setRows(prev => prev.map(row => row.filter((_, i) => i !== index)));
    };

    const generateMarkdown = useCallback((): string => {
        if (rows.length === 0) return '';

        const nonEmptyRows = rows.filter((row, i) => {
            if (i === 0) return true;
            return row.some(cell => cell.trim() !== '');
        });
        if (nonEmptyRows.length < 2) return '';

        const cols = nonEmptyRows[0].length;

        const nonEmptyCols: number[] = [];
        for (let c = 0; c < cols; c++) {
            const hasContent = nonEmptyRows.some(row => (row[c] || '').trim() !== '');
            if (hasContent) nonEmptyCols.push(c);
        }
        if (nonEmptyCols.length === 0) return '';

        let md = '';
        md += '| ' + nonEmptyCols.map(c => (nonEmptyRows[0][c] || '').replace(/\n/g, ' / ')).join(' | ') + ' |\n';
        md += '| ' + nonEmptyCols.map(() => '---').join(' | ') + ' |\n';
        for (let r = 1; r < nonEmptyRows.length; r++) {
            md += '| ' + nonEmptyCols.map(c => (nonEmptyRows[r][c] || '').replace(/\n/g, ' / ')).join(' | ') + ' |\n';
        }
        return md.replace(/\n$/, '');
    }, [rows]);

    const handleApply = useCallback(() => {
        onApply(generateMarkdown());
    }, [generateMarkdown, onApply]);

    // Фокус на модалке при открытии
    useEffect(() => {
        const modal = document.querySelector('.te-modal') as HTMLElement;
        if (modal) modal.focus();
    }, []);

    // Хоткеи: Esc, Cmd+S
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.code === 'Escape') { onCancel(); return; }
            if ((e.metaKey || e.ctrlKey) && e.code === 'KeyS') {
                e.preventDefault();
                handleApply();
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [handleApply, onCancel]);

    const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
        const cols = rows[0]?.length || 1;

        if (e.key === 'Tab') {
            e.preventDefault();
            const totalCells = rows.length * cols;
            const currentIndex = r * cols + c;
            const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
            if (nextIndex >= 0 && nextIndex < totalCells) {
                const inputs = document.querySelectorAll('.te-cell-input');
                (inputs[nextIndex] as HTMLElement)?.focus();
            }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const nextR = r + 1;
            if (nextR < rows.length) {
                const inputs = document.querySelectorAll('.te-cell-input');
                const idx = nextR * cols + c;
                if (inputs[idx]) (inputs[idx] as HTMLElement)?.focus();
            }
        }
        if (e.key === 'ArrowUp' && r > 0) {
            e.preventDefault();
            const inputs = document.querySelectorAll('.te-cell-input');
            const idx = (r - 1) * cols + c;
            if (inputs[idx]) (inputs[idx] as HTMLElement)?.focus();
        }
        if (e.key === 'ArrowDown' && r < rows.length - 1) {
            e.preventDefault();
            const inputs = document.querySelectorAll('.te-cell-input');
            const idx = (r + 1) * cols + c;
            if (inputs[idx]) (inputs[idx] as HTMLElement)?.focus();
        }
        if (e.key === 'ArrowLeft' && c > 0) {
            e.preventDefault();
            const inputs = document.querySelectorAll('.te-cell-input');
            const idx = r * cols + c - 1;
            if (inputs[idx]) (inputs[idx] as HTMLElement)?.focus();
        }
        if (e.key === 'ArrowRight' && c < cols - 1) {
            e.preventDefault();
            const inputs = document.querySelectorAll('.te-cell-input');
            const idx = r * cols + c + 1;
            if (inputs[idx]) (inputs[idx] as HTMLElement)?.focus();
        }
    };

    const cols = rows[0]?.length || 1;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
             onClick={onCancel}>
            <div className="te-modal" tabIndex={-1}
                 style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', width: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', outline: 'none' }}
                 onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{$t.editTable || 'Edit Table'}</div>

                <div style={{ overflow: 'auto', flex: 1, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
                    <div style={{ position: 'relative', display: 'inline-block', minWidth: '100%' }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                            <tr>
                                <td style={{ width: 52, minWidth: 52, borderRight: 'none', borderBottom: 'none', background: 'transparent' }}></td>
                                {rows[0]?.map((_, c) => (
                                    <td key={c} className="te-col-indicator" style={{ height: 52, padding: 0, borderBottom: 'none', background: 'transparent', position: 'relative' }}>
                                        <button
                                            onClick={() => cols > 1 && deleteCol(c)}
                                            className="te-col-del-btn"
                                            title="Delete column"
                                            style={{ position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%)', width: 20, height: 20, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '50%', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, lineHeight: 1, alignItems: 'center', justifyContent: 'center' }}
                                        >✕</button>
                                        <button
                                            onClick={() => addCol(c)}
                                            className="te-col-add-btn"
                                            title="Add column after"
                                            style={{ position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)', width: 20, height: 20, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, alignItems: 'center', justifyContent: 'center' }}
                                        >+</button>
                                    </td>
                                ))}
                            </tr>
                            </thead>
                            <thead>
                            <tr>
                                <td style={{ width: 52, minWidth: 52, borderRight: 'none', background: 'transparent' }}></td>
                                {rows[0]?.map((cell, c) => (
                                    <th key={c} style={{ padding: 0, position: 'relative', background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border)', borderRight: c < cols - 1 ? '1px solid var(--bg-hover)' : 'none' }}>
                                        <textarea
                                            className="te-cell-input"
                                            value={cell}
                                            placeholder="Header"
                                            onChange={e => updateCell(0, c, e.target.value)}
                                            onKeyDown={e => handleKeyDown(e, 0, c)}
                                            rows={1}
                                            style={{ width: '100%', padding: '10px 14px', minWidth: 80, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-sans)', resize: 'none', overflow: 'hidden' }}
                                            onFocus={e => { (e.target as HTMLElement).style.overflow = 'auto'; (e.target as HTMLElement).style.resize = 'vertical'; }}
                                            onBlur={e => { (e.target as HTMLElement).style.overflow = 'hidden'; (e.target as HTMLElement).style.resize = 'none'; }}
                                        />
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {rows.slice(1).map((row, r) => (
                                <tr key={r}>
                                    <td className="te-row-indicator" style={{ width: 52, minWidth: 52, borderRight: 'none', borderBottom: '1px solid var(--bg-hover)', position: 'relative', cursor: 'default' }}>
                                        <button
                                            onClick={() => rows.length > 1 && deleteRow(r + 1)}
                                            className="te-row-del-btn"
                                            title="Delete row"
                                            style={{ position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%)', width: 20, height: 20, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '50%', color: 'var(--danger)', cursor: 'pointer', fontSize: 11, lineHeight: 1, alignItems: 'center', justifyContent: 'center' }}
                                        >✕</button>
                                        <button
                                            onClick={() => addRow(r + 1)}
                                            className="te-row-add-btn"
                                            title="Add row below"
                                            style={{ position: 'absolute', top: '50%', right: 6, transform: 'translateY(-50%)', width: 20, height: 20, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '50%', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, alignItems: 'center', justifyContent: 'center' }}
                                        >+</button>
                                    </td>
                                    {row.map((cell, c) => (
                                        <td key={c} style={{ padding: 0, position: 'relative', borderBottom: '1px solid var(--bg-hover)', borderRight: c < cols - 1 ? '1px solid var(--bg-hover)' : 'none' }}>
                                            <textarea
                                                className="te-cell-input"
                                                value={cell}
                                                placeholder="Cell"
                                                onChange={e => updateCell(r + 1, c, e.target.value)}
                                                onKeyDown={e => handleKeyDown(e, r + 1, c)}
                                                rows={1}
                                                style={{ width: '100%', padding: '10px 14px', minWidth: 80, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)', resize: 'none', overflow: 'hidden' }}
                                                onFocus={e => { (e.target as HTMLElement).style.overflow = 'auto'; (e.target as HTMLElement).style.resize = 'vertical'; }}
                                                onBlur={e => { (e.target as HTMLElement).style.overflow = 'hidden'; (e.target as HTMLElement).style.resize = 'none'; }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    {!confirmDelete ? (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            style={{ padding: '8px 16px', fontSize: 11, fontFamily: 'var(--font-sans)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid transparent', background: 'transparent', color: 'var(--danger)' }}
                        >
                            {$t.deleteTable || 'Delete Table'}
                        </button>
                    ) : (
                        <>
                            <span style={{ fontSize: 11, color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                                {$t.deleteTableConfirm || 'Are you sure?'}
                            </span>
                            <button
                                onClick={() => onApply('')}
                                style={{ padding: '8px 16px', fontSize: 11, fontFamily: 'var(--font-sans)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--danger)', background: 'var(--danger)', color: '#fff' }}
                            >
                                {$t.yes || 'Yes'}
                            </button>
                            <button
                                onClick={() => setConfirmDelete(false)}
                                style={{ padding: '8px 16px', fontSize: 11, fontFamily: 'var(--font-sans)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--border-light)', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                            >
                                {$t.no || 'No'}
                            </button>
                        </>
                    )}
                    <span style={{ flex: 1 }} />
                    <button
                        onClick={onCancel}
                        style={{ padding: '8px 16px', fontSize: 13, fontFamily: 'var(--font-sans)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--border-light)', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                    >
                        {$t.cancel}
                    </button>
                    <button
                        onClick={handleApply}
                        style={{ padding: '8px 16px', fontSize: 13, fontFamily: 'var(--font-sans)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: 'none', background: 'var(--accent)', color: '#fff' }}
                    >
                        {$t.apply || 'Apply'}
                    </button>
                </div>
            </div>
        </div>
    );
}