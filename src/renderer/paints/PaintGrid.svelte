<!-- Paints as cards: the colour (or the cover photo) on top, name and brand below. -->
<script lang="ts">
  import { photoUrl } from '../../shared/api.ts';
  import type { Paint } from '../../shared/types.ts';
  import Swatch from '../lib/Swatch.svelte';
  import StatusDot from './StatusDot.svelte';
  import { paintTitle, view } from './view.svelte.ts';

  let { paints, onmenu }: { paints: Paint[]; onmenu: (e: MouseEvent, p: Paint) => void } = $props();
</script>

<div class="grid">
  {#each paints as p (p.id)}
    <button
      class="card"
      class:selected={view.selected === p.id}
      data-nav={p.id}
      onclick={() => (view.selected = p.id)}
      oncontextmenu={(e) => onmenu(e, p)}
    >
      <div class="top" class:empty={!p.hex && !p.photos.length} style:background={p.hex || null}>
        {#if p.photos[0]}
          <img src={photoUrl(p.id, p.photos[0])} alt="" loading="lazy" />
          {#if p.hex}<span class="corner"><Swatch hex={p.hex} size={16} round /></span>{/if}
        {/if}
        <span class="st"><StatusDot status={p.status} /></span>
      </div>
      <div class="info">
        <div class="name" class:faint={!p.name}>{paintTitle(p)}</div>
        <div class="sub">{[p.brand, p.line].filter(Boolean).join(' · ') || '—'}</div>
        {#if p.code}<div class="code">{p.code}</div>{/if}
      </div>
    </button>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
    padding: 14px;
  }
  .card {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
    text-align: left;
    cursor: pointer;
  }
  .card:hover {
    border-color: var(--text-faint);
  }
  .card.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .top {
    position: relative;
    height: 96px;
    background: var(--bg-active);
  }
  .top.empty {
    background: repeating-conic-gradient(var(--bg-active) 0 25%, var(--bg-primary) 0 50%) 50% / 12px 12px;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .corner {
    position: absolute;
    left: 6px;
    bottom: 6px;
    display: flex;
  }
  .st {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    padding: 3px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--bg-secondary) 80%, transparent);
  }
  .info {
    padding: 7px 9px 9px;
    min-width: 0;
  }
  .name {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub,
  .code {
    overflow: hidden;
    color: var(--text-muted);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .code {
    color: var(--text-faint);
  }
</style>
