<!-- Figures by status (those being painted first), search by name or group; a tap opens the figure. -->
<script lang="ts">
  import { Clock } from '@lucide/svelte';
  import { duration, parentOf, totalMinutes, type FigureStatus } from '../../../src/shared/projects.ts';
  import type { SyncFigure } from '../../../src/shared/sync.ts';
  import { store, t } from '../store.svelte.ts';
  import Figure from './Figure.svelte';
  import Picture from './Picture.svelte';
  import TimerBar from './TimerBar.svelte';
  import { pv } from './view.svelte.ts';

  const ORDER: FigureStatus[] = ['painting', 'primed', 'assembly', 'pile', 'done'];
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const found = $derived.by(() => {
    const q = pv.query.trim().toLocaleLowerCase();
    return store.figures.filter((f) => !q || f.path.toLocaleLowerCase().includes(q)).sort((a, b) => collator.compare(a.name, b.name));
  });
  const groups = $derived(ORDER.map((s) => ({ status: s, figures: found.filter((f) => f.status === s) })).filter((g) => g.figures.length));
  const cover = (f: SyncFigure) => {
    const images = f.images ?? [];
    return f.meta?.cover && images.includes(f.meta.cover) ? f.meta.cover : (images.at(-1) ?? '');
  };
  const time = (f: SyncFigure) => (f.meta ? totalMinutes(f.meta) : 0);
</script>

{#if pv.open && store.figure(pv.open)}
  <Figure path={pv.open} onback={() => (pv.open = '')} />
{:else}
  <header class="bar">
    <h1>{t('app.projects')} <span class="faint">{store.figures.length}</span></h1>
    <input type="search" placeholder={t('m.search')} bind:value={pv.query} />
  </header>
  <TimerBar onopen={(path) => (pv.open = path)} />
  {#each groups as g (g.status)}
    <h2 class="group">{t(`fstatus.${g.status}`)} <span class="faint">{g.figures.length}</span></h2>
    {#each g.figures as f (f.path)}
      {@const c = cover(f)}
      {@const m = time(f)}
      <button class="list-row" onclick={() => (pv.open = f.path)}>
        <span class="thumb">{#if c}<Picture figure={f.path} name={c} w={160} />{/if}</span>
        <span class="two-lines">
          <b>{f.name}</b>
          <small class="faint">{parentOf(f.path) || ' '}</small>
        </span>
        {#if m}<small class="faint time"><Clock size={12} /> {duration(m, t('timer.h'), t('timer.min'))}</small>{/if}
      </button>
    {/each}
  {:else}
    <p class="faint empty">{store.figures.length ? t('m.nothing') : store.pairing ? t('projects.empty') : t('m.empty')}</p>
  {/each}
{/if}

<style>
  .group {
    margin: 14px 16px 4px;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .thumb {
    display: block;
    flex: none;
    width: 44px;
    height: 44px;
    overflow: hidden;
    border-radius: var(--radius-m);
    background: var(--bg-hover);
  }
  .time {
    display: flex;
    flex: none;
    align-items: center;
    gap: 3px;
  }
</style>
