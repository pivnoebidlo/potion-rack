import styles from './FiguresApp.module.css';
import { Figure } from '../types/figure';
import { statusTag, statusLabel, materialLabel } from '../utils/figures';
import { formatDate } from '../utils/dateFormat';
import { t } from '../i18n';

interface FigureInfoPanelProps {
    selected: Figure;
}

export default function FigureInfoPanel({ selected }: FigureInfoPanelProps) {
    const $t = t();

    return (
        <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
                <div className={styles.detailLabel}>{$t.status}</div>
                <div>
                    <span className={`${styles.tag} ${statusTag(selected.status)}`}>
                        {statusLabel(selected.status)}
                    </span>
                </div>
            </div>
            {selected.manufacturer && (
                <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>{$t.manufacturer}</div>
                    <div className={styles.detailValue}>{selected.manufacturer}</div>
                </div>
            )}
            {selected.scale && (
                <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>{$t.scale}</div>
                    <div className={styles.detailValue}>{selected.scale}</div>
                </div>
            )}
            {selected.material && (
                <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>{$t.material}</div>
                    <div className={styles.detailValue}>{materialLabel(selected.material)}</div>
                </div>
            )}
            {selected.purchase_date && (
                <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>{$t.purchaseDate}</div>
                    <div className={styles.detailValue}>{formatDate(selected.purchase_date)}</div>
                </div>
            )}
            {selected.completed_date && (
                <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>{$t.completedDate || 'Completion date'}</div>
                    <div className={styles.detailValue}>{formatDate(selected.completed_date)}</div>
                </div>
            )}
            {selected.shop_url && (
                <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>{$t.shopUrl || 'Shop Link'}</div>
                    <div className={styles.detailValue}>
                        <a href={selected.shop_url} target="_blank" style={{ color: 'var(--link-color, var(--accent))' }}>
                            {$t.openInShop || 'Open in shop'}
                        </a>
                    </div>
                </div>
            )}
            {selected.folder_path && (
                <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>{$t.folder}</div>
                    <div className={styles.detailValue}>{selected.folder_path}</div>
                </div>
            )}
        </div>
    );
}