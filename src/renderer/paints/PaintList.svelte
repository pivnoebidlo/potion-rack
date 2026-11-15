<!-- Paints as a table; a click on a column header sorts by it (again — the other way). -->
<script lang="ts">
  import { ArrowDown, ArrowUp } from '@lucide/svelte';
  import type { Paint, PaintSort } from '../../shared/types.ts';
  import Stars from '../lib/Stars.svelte';
  import Swatch from '../lib/Swatch.svelte';
  import { t } from '../lib/i18n.svelte.ts';
  import { setSettings, store } from '../lib/store.svelte.ts';
  import StatusDot from './StatusDot.svelte';
  import { paintTitle, view } from './view.svelte.ts';

  let { paints, onmenu }: { paints: Paint[]; onmenu: (e: MouseEvent, p: Paint) => void } = $props();

  const prefs = $derived(store.state.settings.paints);
  const cols: { sort: PaintSort | null; label: string; cls?: string }[] = $derived([
    { sort: 'color', label: '', cls: 'sw' },
    { sort: 'name', label: t('field.name') },
    { sort: 'brand', label: t('field.brand') },
    { sort: null, label: t('field.line'), cls: 'opt' },
    { sort: 'code', label: t('field.code') },
    { sort: 'type', label: t('field.type'), cls: 'opt' },
    { sort: 'status', label: t('field.status') },
    { sort: 'rating', label: t('field.rating'), cls: 'opt2' },
  ]);

  function sortBy(sort: PaintSort | null) {
    if (!sort) return;
    void setSettings({ paints: { ...prefs, sort, desc: prefs.sort === sort ? !prefs.desc : false } });
  }
</script>

<table>
  <thead>
    <tr>
      {#each cols as c, i (i)}
        <th class={c.cls} class:sortable={!!c.sort} onclick={() => sortBy(c.sort)}>
          {c.label}
          {#if c.sort && prefs.sort === c.sort}
            {#if prefs.desc}<ArrowUp size={12} />{:else}<ArrowDown size={12} />{/if}
          {/if}
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each paints as p (p.id)}
      <tr class:selected={view.selected === p.id} data-nav={p.id} onclick={() => (view.selected = p.id)} oncontextmenu={(e) => onmenu(e, p)}>
        <td class="sw"><Swatch hex={p.hex} size={18} round /></td>
        <td class="name" class:faint={!p.name}>{paintTitle(p)}</td>
        <td>{p.brand}</td>
        <td class="muted opt">{p.line}</td>
        <td class="muted">{p.code}</td>
        <td class="muted opt">{t(`type.${p.type}`)}</td>
        <td><StatusDot status={p.status} label /></td>
        <td class="opt2"><Stars value={p.rating} size={12} /></td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  /* Narrow (the paint panel is open): less important columns go first. */
  @container paints (max-width: 900px) {
    .opt { display: none; }
  }
  @container paints (max-width: 640px) {
    .opt2 { display: none; }
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 7px 10px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-primary);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 600;
    text-align: left;
    white-space: nowrap;
  }
  th :global(svg) {
    vertical-align: -2px;
  }
  th.sortable {
    cursor: pointer;
  }
  th.sortable:hover {
    color: var(--text-normal);
  }
  td {
    padding: 6px 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
    white-space: nowrap;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sw {
    width: 38px;
    padding-right: 0;
  }
  td.sw :global(.swatch) {
    vertical-align: middle;
  }
  .name {
    font-weight: 600;
  }
  tbody tr {
    cursor: pointer;
  }
  tbody tr:hover {
    background: var(--bg-hover);
  }
  tbody tr.selected {
    background: var(--accent-soft);
  }
</style>
