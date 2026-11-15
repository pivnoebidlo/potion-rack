// What the paints module shows: the filter and the selected paint (not saved between launches).
import { emptyFilter, newPaint } from '../../shared/rack.ts';
import type { Paint, PaintStatus } from '../../shared/types.ts';
import { confirm } from '../lib/confirm.svelte.ts';
import { dispatch, store } from '../lib/store.svelte.ts';
import { t } from '../lib/i18n.svelte.ts';

export const view = $state({
  filter: emptyFilter(),
  selected: null as string | null,
  // The name field of the panel takes the focus once (a paint just created).
  focusName: false,
});

export const selectedPaint = (): Paint | null => store.state.rack.paints.find((p) => p.id === view.selected) ?? null;

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// A new paint takes what the filter narrows to: one brand, one status.
export async function createPaint() {
  const f = view.filter;
  const paint = newPaint(newId(), new Date().toISOString(), {
    brand: f.brands.length === 1 ? f.brands[0] : '',
    status: f.statuses.length === 1 ? f.statuses[0] : 'have',
    type: f.types.length === 1 ? f.types[0] : 'acrylic',
  });
  await dispatch({ type: 'paint/add', paint });
  view.selected = paint.id;
  view.focusName = true;
}

export async function removePaint(p: Paint) {
  if (!(await confirm(t('panel.deleteConfirm', { name: p.name || t('paints.untitled') }), t('app.delete'), true))) return;
  if (view.selected === p.id) view.selected = null;
  await window.api.removePaint(p.id);
}

export const setStatus = (p: Paint, status: PaintStatus) => dispatch({ type: 'paint/update', id: p.id, patch: { status } });

export const paintTitle = (p: Paint) => p.name || t('paints.untitled');
