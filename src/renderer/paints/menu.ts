// The actions of a paint: the right-click menu of a card, a row and the panel's «⋯».
import { CircleCheck, Circle, Trash2 } from '@lucide/svelte';
import { PAINT_STATUSES, type Paint } from '../../shared/types.ts';
import type { MenuItem } from '../lib/ContextMenu.svelte';
import { t } from '../lib/i18n.svelte.ts';
import { removePaint, setStatus } from './view.svelte.ts';

export function paintMenu(p: Paint): MenuItem[] {
  return [
    ...PAINT_STATUSES.map((s) => ({ label: t(`status.${s}`), icon: s === p.status ? CircleCheck : Circle, action: () => void setStatus(p, s) })),
    { label: t('panel.delete'), icon: Trash2, danger: true, action: () => void removePaint(p) },
  ];
}
