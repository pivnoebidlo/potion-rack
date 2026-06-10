import styles from './PaintsApp.module.css';
import { t } from '../i18n';
import { Paint } from '../types/paint';
import { formatDate } from '../utils/dateFormat';
import { getBaseColorHex } from '../utils/colors';

interface PaintListViewProps {
    filtered: Paint[];
    selectedId: number | null;
    showColorDots: boolean;
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
    baseColors: { id: number; name: string }[];
    selectedRowRef: React.RefObject<HTMLTableRowElement>;
    onSelect: (id: number) => void;
    onDoubleClick: (paint: Paint) => void;
    onSort: (col: string) => void;
    onUpdateRating: (id: number, rating: number) => void;
    onUpdateStatus: (id: number, status: string) => void;
    onDelete: (id: number) => void;
}

export default function PaintListView({
                                          filtered,
                                          selectedId,
                                          showColorDots,
                                          sortColumn,
                                          sortDirection,
                                          baseColors,
                                          selectedRowRef,
                                          onSelect,
                                          onDoubleClick,
                                          onSort,
                                          onUpdateRating,
                                          onUpdateStatus,
                                          onDelete,
                                      }: PaintListViewProps) {
    const $t = t();
    const sortArrow = (col: string) => sortColumn === col ? (sortDirection === 'asc' ? '↑' : '↓') : '';

    return (
        <table className={styles.table}>
            <thead className={styles.tableHead}>
            <tr>
                <th onClick={() => onSort('brand')}>{$t.brand} {sortArrow('brand')}</th>
                <th onClick={() => onSort('series')}>{$t.series} {sortArrow('series')}</th>
                <th onClick={() => onSort('color_name')}>{$t.colorName} {sortArrow('color_name')}</th>
                <th onClick={() => onSort('article')}>{$t.article} {sortArrow('article')}</th>
                <th onClick={() => onSort('base_color_name')}>{$t.baseColor} {sortArrow('base_color_name')}</th>
                <th onClick={() => onSort('purchase_date')}>{$t.purchaseDate} {sortArrow('purchase_date')}</th>
                <th onClick={() => onSort('price')}>{$t.price} {sortArrow('price')}</th>
                <th onClick={() => onSort('rating')}>{$t.rating} {sortArrow('rating')}</th>
                <th onClick={() => onSort('status')}>{$t.status} {sortArrow('status')}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
            {filtered.map(paint => (
                <tr
                    key={paint.id}
                    ref={selectedId === paint.id ? selectedRowRef : null}
                    className={`${styles.tableRow} ${selectedId === paint.id ? styles.tableRowSelected : ''}`}
                    onClick={() => onSelect(paint.id)}
                    onDoubleClick={() => onDoubleClick(paint)}
                >
                    <td className={styles.tableCell}>{paint.brand}</td>
                    <td className={styles.tableCell}>{paint.series || '-'}</td>
                    <td className={styles.tableCell}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                {showColorDots && (paint.color_hex || paint.base_color_id) ? (
                                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: paint.color_hex || getBaseColorHex(baseColors, paint.base_color_id), flexShrink: 0, border: '1px dashed var(--text-muted)' }} />
                                ) : showColorDots && (
                                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'transparent', flexShrink: 0, border: '1px dashed var(--text-muted)', position: 'relative' }}>
                                        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'var(--text-muted)', fontSize: 8 }}>✕</span>
                                    </span>
                                )}
                                {paint.color_name}
                            </span>
                    </td>
                    <td className={styles.tableCell}>{paint.article || '-'}</td>
                    <td className={styles.tableCell}>{paint.base_color_name || '-'}</td>
                    <td className={styles.tableCell}>{formatDate(paint.purchase_date)}</td>
                    <td className={styles.tableCell}>{paint.price != null ? paint.price : '-'}</td>
                    <td className={styles.tableCell} onClick={e => e.stopPropagation()}>
                        {Array.from({ length: 5 }, (_, i) => (
                            <span
                                key={i}
                                onClick={() => onUpdateRating(paint.id, i + 1)}
                                style={{ cursor: 'pointer', color: i < (paint.rating || 0) ? 'var(--star-active)' : 'var(--star-inactive)', fontSize: '16px' }}
                            >★</span>
                        ))}
                    </td>
                    <td className={styles.tableCell} onClick={e => e.stopPropagation()}>
                        <select
                            value={paint.status || 'instock'}
                            onChange={(e) => onUpdateStatus(paint.id, e.target.value)}
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', padding: '2px 4px', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="instock">{$t.inStock}</option>
                            <option value="low">{$t.low}</option>
                            <option value="out">{$t.outOfStock}</option>
                            <option value="ordered">{$t.ordered}</option>
                        </select>
                    </td>
                    <td className={styles.tableCell}>
                        <button className={styles.iconBtn} onClick={e => { e.stopPropagation(); onDelete(paint.id); }}>🗑</button>
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
    );
}