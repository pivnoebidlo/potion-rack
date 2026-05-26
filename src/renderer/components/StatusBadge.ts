import { t } from '../i18n/index.js';

export class StatusBadge {
    static render(status: string, paintId: number): string {
        const t_ = t();
        return `
            <select class="status-select" data-id="${paintId}" style="background: var(--select-bg); border: 1px solid var(--select-border); color: var(--select-text); border-radius: 4px; padding: 4px 8px;">
                <option value="instock" ${status === 'instock' ? 'selected' : ''}>${t_.statusInstock}</option>
                <option value="low" ${status === 'low' ? 'selected' : ''}>${t_.statusLow}</option>
                <option value="out" ${status === 'out' ? 'selected' : ''}>${t_.statusOut}</option>
                <option value="ordered" ${status === 'ordered' ? 'selected' : ''}>${t_.statusOrdered}</option>
            </select>
        `;
    }
}