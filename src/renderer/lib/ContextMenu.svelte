<!-- A context menu at the mouse (or under a "⋯" button): a list of actions; an item with `items` opens its list in
     place (with "back"), e.g. "Move to…" → folders. Esc, a click outside or an action closes it. -->
<script lang="ts" module>
  import type { Component } from 'svelte';

  export interface MenuItem {
    label: string;
    icon?: Component<{ size?: number }>;
    danger?: boolean;
    disabled?: boolean;
    // Indent in a list of folders.
    depth?: number;
    action?: () => void;
    items?: MenuItem[];
  }

  // Where a menu opens: under a «⋯» button (a click), at the mouse (a right click). Stops the browser's own menu.
  export function menuAt(e: MouseEvent): { x: number; y: number } {
    e.preventDefault();
    e.stopPropagation();
    if (e.type !== 'click') return { x: e.clientX, y: e.clientY };
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: b.left, y: b.bottom + 2 };
  }
</script>

<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';
  

  let { x, y, items, onclose }: { x: number; y: number; items: MenuItem[]; onclose: () => void } = $props();

  let stack = $state<{ title: string; items: MenuItem[] }[]>([]);
  const list = $derived(stack.at(-1)?.items ?? items);
  let el = $state<HTMLDivElement>();
  let pos = $state({ left: 0, top: 0 });
  $effect(() => {
    void list;
    if (!el) return;
    const r = el.getBoundingClientRect();
    pos = { left: Math.max(4, Math.min(x, innerWidth - r.width - 4)), top: Math.max(4, Math.min(y, innerHeight - r.height - 4)) };
  });

  function pick(item: MenuItem) {
    if (item.disabled) return;
    if (item.items) return void (stack = [...stack, { title: item.label, items: item.items }]);
    onclose();
    item.action?.();
  }
  function onkeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    if (stack.length) stack = stack.slice(0, -1);
    else onclose();
  }
</script>

<svelte:window
  onkeydowncapture={onkeydown}
  onpointerdowncapture={(e) => !el?.contains(e.target as Node) && onclose()}
  onblur={onclose}
/>

<div class="ctx-menu" role="menu" tabindex="-1" bind:this={el} style:left="{pos.left}px" style:top="{pos.top}px">
  {#if stack.length}
    <button class="item back" role="menuitem" onclick={() => (stack = stack.slice(0, -1))}><ChevronLeft size={14} /> {stack.at(-1)!.title}</button>
    <div class="sep"></div>
  {/if}
  {#each list as item, i (i)}
    <button class="item" class:danger={item.danger} role="menuitem" disabled={item.disabled} style:--d={item.depth ?? 0} onclick={() => pick(item)}>
      {#if item.icon}<item.icon size={14} />{/if}
      <span class="l">{item.label}</span>
      {#if item.items}<ChevronRight size={13} />{/if}
    </button>
  {:else}
    <span class="none faint">—</span>
  {/each}
</div>

<style>
  .ctx-menu {
    position: fixed;
    -webkit-app-region: no-drag;
    z-index: 200;
    display: flex;
    flex-direction: column;
    min-width: 200px;
    max-width: 340px;
    max-height: 70vh;
    padding: 4px;
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px 5px calc(8px + var(--d, 0) * 14px);
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    color: var(--text-normal);
    font-size: 13px;
    text-align: left;
    cursor: pointer;
  }
  .item:hover:not(:disabled) {
    background: var(--bg-hover);
  }
  .item:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .item.danger {
    color: var(--danger);
  }
  .item.back {
    color: var(--text-muted);
  }
  .l {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sep {
    margin: 3px 4px;
    border-top: 1px solid var(--border);
  }
  .none {
    padding: 5px 8px;
    font-size: 13px;
  }
</style>
