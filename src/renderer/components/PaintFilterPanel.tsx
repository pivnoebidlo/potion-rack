// @ts-ignore
import ResetIcon from '../assets/icons/reset.svg?react';
// @ts-ignore
import GridIcon from '../assets/icons/grid.svg?react';
// @ts-ignore
import ListIcon from '../assets/icons/list.svg?react';
// @ts-ignore
import AddIcon from '../assets/icons/add.svg?react';
// @ts-ignore
import CollapseIcon from '../assets/icons/collapse.svg?react';
// @ts-ignore
import ExpandIcon from '../assets/icons/expand.svg?react';
import styles from './PaintsApp.module.css';
import { t } from '../i18n';

interface PaintFilterPanelProps {
    collapsed: boolean;
    brandFilter: string;
    seriesFilter: string;
    baseColorFilter: string;
    statusFilter: string;
    searchFilter: string;
    viewMode: 'list' | 'grid';
    brands: string[];
    series: string[];
    baseColors: { id: number; name: string }[];
    onToggle: () => void;
    onBrandChange: (value: string) => void;
    onSeriesChange: (value: string) => void;
    onBaseColorChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onSearchChange: (value: string) => void;
    onReset: () => void;
    onViewModeToggle: () => void;
    onAddPaint: () => void;
}

export default function PaintFilterPanel({
                                             collapsed,
                                             brandFilter,
                                             seriesFilter,
                                             baseColorFilter,
                                             statusFilter,
                                             searchFilter,
                                             viewMode,
                                             brands,
                                             series,
                                             baseColors,
                                             onToggle,
                                             onBrandChange,
                                             onSeriesChange,
                                             onBaseColorChange,
                                             onStatusChange,
                                             onSearchChange,
                                             onReset,
                                             onViewModeToggle,
                                             onAddPaint,
                                         }: PaintFilterPanelProps) {
    const $t = t();

    return (
        <div className={`${styles.filterPanel} ${collapsed ? styles.filterPanelCollapsed : ''}`}>
            <button className={styles.filterToggle} onClick={onToggle}>
                {collapsed ? <ExpandIcon style={{ width: 12, height: 12, color: 'var(--text-secondary)' }} /> : <CollapseIcon style={{ width: 12, height: 12, color: 'var(--text-secondary)' }} />}
            </button>
            <div className={styles.filterContent}>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>{$t.brand}</label>
                    <select className={styles.filterSelect} value={brandFilter} onChange={e => onBrandChange(e.target.value)}>
                        <option value="">{$t.all}</option>
                        {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>{$t.series}</label>
                    <select className={styles.filterSelect} value={seriesFilter} onChange={e => onSeriesChange(e.target.value)}>
                        <option value="">{$t.all}</option>
                        {series.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>{$t.baseColor}</label>
                    <select className={styles.filterSelect} value={baseColorFilter} onChange={e => onBaseColorChange(e.target.value)}>
                        <option value="">{$t.all}</option>
                        {baseColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>{$t.status}</label>
                    <select className={styles.filterSelect} value={statusFilter} onChange={e => onStatusChange(e.target.value)}>
                        <option value="">{$t.all}</option>
                        <option value="instock">{$t.inStock}</option>
                        <option value="low">{$t.low}</option>
                        <option value="out">{$t.outOfStock}</option>
                        <option value="ordered">{$t.ordered}</option>
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>{$t.search}</label>
                    <input className={styles.filterInput} type="text" placeholder={$t.search + '...'} value={searchFilter} onChange={e => onSearchChange(e.target.value)} />
                </div>
                <hr className={styles.panelDivider} />
                <div className={styles.filterActions}>
                    <button className={styles.iconBtn} onClick={onReset}><ResetIcon style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} /></button>
                    <button className={styles.iconBtn} onClick={onViewModeToggle}>{viewMode === 'list' ? <GridIcon style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} /> : <ListIcon style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} />}</button>
                    <button className={styles.iconBtn} onClick={onAddPaint}><AddIcon style={{ width: 16, height: 16, color: 'var(--text-secondary)' }} /></button>
                </div>
            </div>
        </div>
    );
}