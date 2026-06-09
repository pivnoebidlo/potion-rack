import styles from './PaintsApp.module.css';
import { t } from '../i18n';
import { Paint } from '../types/paint';
import { getBaseColorHex } from '../utils/colors';

interface PaintGridViewProps {
    filtered: Paint[];
    selectedId: number | null;
    showGridSortBar: boolean;
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
    baseColors: { id: number; name: string }[];
    onSelect: (id: number) => void;
    onDoubleClick: (paint: Paint) => void;
    onSortColumnChange: (col: string) => void;
    onSortDirectionToggle: () => void;
    onUpdateRating: (id: number, rating: number) => void;
}

export default function PaintGridView({
                                          filtered,
                                          selectedId,
                                          showGridSortBar,
                                          sortColumn,
                                          sortDirection,
                                          baseColors,
                                          onSelect,
                                          onDoubleClick,
                                          onSortColumnChange,
                                          onSortDirectionToggle,
                                          onUpdateRating,
                                      }: PaintGridViewProps) {
    const $t = t();

    return (
        <>
            {showGridSortBar && (
                <div className={styles.sortBar}>
                    <span className={styles.sortLabel}>{$t.sortBy || 'Сортировка'}</span>
                    <select
                        className={styles.sortSelect}
                        value={sortColumn}
                        onChange={e => onSortColumnChange(e.target.value)}
                    >
                        <option value="brand">{$t.brand}</option>
                        <option value="series">{$t.series}</option>
                        <option value="color_name">{$t.colorName}</option>
                        <option value="article">{$t.article}</option>
                        <option value="base_color_name">{$t.baseColor}</option>
                        <option value="purchase_date">{$t.purchaseDate}</option>
                        <option value="price">{$t.price}</option>
                        <option value="rating">{$t.rating}</option>
                        <option value="status">{$t.status}</option>
                    </select>
                    <button
                        className={styles.sortDirBtn}
                        onClick={onSortDirectionToggle}
                        title={sortDirection === 'asc' ? '↑' : '↓'}
                    >
                        {sortDirection === 'asc' ? '↑' : '↓'}
                    </button>
                </div>
            )}
            <div className={styles.grid} data-grid-container>
            {filtered.map(paint => (
                    <div
                        key={paint.id}
                        data-paint-id={paint.id}
                        className={`${styles.card} ${selectedId === paint.id ? styles.cardSelected : ''}`}
                        onClick={() => onSelect(paint.id)}
                        onDoubleClick={() => onDoubleClick(paint)}
                    >
                        <div
                            className={styles.cardSwatch}
                            style={{
                                background: paint.color_hex
                                    ? paint.color_hex
                                    : paint.base_color_id
                                        ? getBaseColorHex(baseColors, paint.base_color_id)
                                        : 'transparent',
                            }}
                        >
                            {!(paint.color_hex || paint.base_color_id) && (
                                <span style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1 }}>✕</span>
                            )}
                        </div>
                        <div className={styles.cardName}>{paint.color_name}</div>
                        <div className={styles.cardBrand}>{paint.brand}{paint.series ? ` · ${paint.series}` : ''}</div>
                        <div className={styles.cardMeta}>
                            <span className={styles.cardStars} onClick={e => e.stopPropagation()}>
                                {Array.from({ length: 5 }, (_, i) => (
                                    <span
                                        key={i}
                                        onClick={() => onUpdateRating(paint.id, i + 1)}
                                        style={{ cursor: 'pointer', color: i < (paint.rating || 0) ? 'var(--star-active)' : 'var(--star-inactive)' }}
                                    >★</span>
                                ))}
                            </span>
                            {paint.price != null && <span>{paint.price}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}