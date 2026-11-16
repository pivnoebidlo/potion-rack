<!-- The running painting session, on top of the projects: how long, and stop. -->
<script lang="ts">
  import { Square, Timer } from '@lucide/svelte';
  import { store, t } from '../store.svelte.ts';
  import { clock } from './view.svelte.ts';

  let { onopen }: { onopen?: (path: string) => void } = $props();
  const running = $derived(store.timer);
  const figure = $derived(running ? store.figure(running.path) : null);
  const elapsed = $derived.by(() => {
    if (!running) return '';
    const s = Math.max(0, Math.floor((clock.now - running.start) / 1000));
    const p = (n: number) => String(n).padStart(2, '0');
    return `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
  });
</script>

{#if running}
  <div class="timer">
    <Timer size={18} />
    <button class="what" onclick={() => onopen?.(running.path)} disabled={!onopen}>
      <b>{elapsed}</b> <span class="faint">{figure?.name ?? ''}</span>
    </button>
    <button class="btn" onclick={() => store.stopTimer()}><Square size={14} /> {t('timer.stop')}</button>
  </div>
{/if}

<style>
  .timer {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 16px 8px;
    padding: 8px 8px 8px 12px;
    border-radius: var(--radius-m);
    background: var(--accent-soft);
    color: var(--text-normal);
  }
  .what {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  b {
    font-variant-numeric: tabular-nums;
  }
</style>
