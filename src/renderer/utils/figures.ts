import { t } from '../i18n';
import styles from '../components/FiguresApp.module.css';

export function statusTag(s: string): string {
    if (s === 'draft') return styles.tagNew;
    if (s === 'in-progress') return styles.tagProgress;
    if (s === 'completed') return styles.tagDone;
    return '';
}

export function statusLabel(s: string): string {
    const $t = t();
    if (s === 'draft') return $t.draft;
    if (s === 'in-progress') return $t.inProgress;
    if (s === 'completed') return $t.completed;
    return s;
}

export function materialLabel(m: string): string {
    const $t = t();
    switch (m) {
        case 'plastic': return $t.plastic;
        case 'resin': return $t.resin;
        case 'metal': return $t.metal;
        default: return m;
    }
}