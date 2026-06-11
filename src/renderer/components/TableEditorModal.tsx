import { useState } from 'react';
import { t } from '../i18n';

interface TableEditorModalProps {
    initialMarkdown: string;
    onApply: (markdown: string) => void;
    onCancel: () => void;
}

export default function TableEditorModal({ initialMarkdown, onApply, onCancel }: TableEditorModalProps) {
    const $t = t();

    // Парсим Markdown в двумерный массив
    const parseTable = (md: string): string[][] => {
        const lines = md.trim().split('\n');
        const rows: string[][] = [];
        for (const line of lines) {
            if (/^\|[-:\s|]+\|$/.test(line)) continue; // пропускаем разделитель
            const cells = line.split('|').filter(c => c.trim() !== '');
            if (cells.length > 0) rows.push(cells.map(c => c.trim()));
        }
        return rows.length >= 1 ? rows : [['']];
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

    const generateMarkdown = (): string => {
        if (rows.length === 0) return '';
        const cols = rows[0].length;
        let md = '';
        // Заголовок
        md += '| ' + rows[0].join(' | ') + ' |\n';
        // Разделитель
        md += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
        // Тело
        for (let r = 1; r < rows.length; r++) {
            md += '| ' + rows[r].join(' | ') + ' |\n';
        }
        return md;
    };

    const handleApply = () => {
        onApply(generateMarkdown());
    };

    const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const inputs = document.querySelectorAll('.pr-table-editor-input');
            const currentIndex = r * (rows[0]?.length || 1) + c;
            const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
            if (nextIndex >= 0 && nextIndex < inputs.length) {
                (inputs[nextIndex] as HTMLElement).focus();
            }
        }
    };

    const cols = rows[0]?.length || 1;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
             onClick={onCancel}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', width: '720px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                 onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>📋 {$t.editTable || 'Edit Table'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>{$t.editTableDesc || 'Edit cells directly. Tab to next cell.'}</div>

                {/* Тулбар */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, padding: 8, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap' }}>
                    <button className="tb-btn" onClick={() => addRow(-1)}>+ {$t.rowAbove || 'Row Above'}</button>
                    <button className="tb-btn" onClick={() => addRow(rows.length - 1)}>+ {$t.rowBelow || 'Row Below'}</button>
                    <button className="tb-btn" onClick={() => addCol(-1)}>+ {$t.colLeft || 'Col Left'}</button>
                    <button className="tb-btn" onClick={() => addCol(cols - 1)}>+ {$t.colRight || 'Col Right'}</button>
                    <span style={{ flex: 1 }} />
                    <button className="tb-btn" onClick={() => deleteRow(rows.length - 1)}>- {$t.deleteRow || 'Row'}</button>
                    <button className="tb-btn" onClick={() => deleteCol(cols - 1)}>- {$t.deleteCol || 'Col'}</button>
                </div>

                {/* Таблица */}
                <div style={{ overflow: 'auto', flex: 1, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                        <tr>
                            {rows[0]?.map((cell, c) => (
                                <th key={c} style={{ background: 'var(--bg-tertiary)', padding: 0, textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
                                    <input
                                        className="pr-table-editor-input"
                                        value={cell}
                                        onChange={e => updateCell(0, c, e.target.value)}
                                        onKeyDown={e => handleKeyDown(e, 0, c)}
                                        style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-sans)' }}
                                    />
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {rows.slice(1).map((row, r) => (
                            <tr key={r}>
                                {row.map((cell, c) => (
                                    <td key={c} style={{ padding: 0, borderBottom: '1px solid var(--bg-hover)' }}>
                                        <input
                                            className="pr-table-editor-input"
                                            value={cell}
                                            onChange={e => updateCell(r + 1, c, e.target.value)}
                                            onKeyDown={e => handleKeyDown(e, r + 1, c)}
                                            style={{ width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-sans)' }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* Футер */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button onClick={onCancel} style={{ padding: '8px 16px', fontSize: 13, fontFamily: 'var(--font-sans)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-secondary)' }}>{$t.cancel}</button>
                    <button onClick={handleApply} style={{ padding: '8px 16px', fontSize: 13, fontFamily: 'var(--font-sans)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: 'none', background: 'var(--accent)', color: '#fff' }}>{$t.apply || 'Apply'}</button>
                </div>
            </div>
        </div>
    );
}