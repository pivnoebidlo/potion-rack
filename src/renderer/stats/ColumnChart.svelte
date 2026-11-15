<!-- Columns over months: one series, one axis, the accent colour. Each column's whole slot is its hover/focus target
     (a tooltip with the month and the value); «Table» shows the same numbers as a table. -->
<script lang="ts">
  import { Table2 } from '@lucide/svelte';
  import { locale, t } from '../lib/i18n.svelte.ts';

  let { title, data, format }: { title: string; data: { month: string; value: number }[]; format: (v: number) => string } = $props();

  const max = $derived(Math.max(1, ...data.map((d) => d.value)));
  const monthName = $derived(new Intl.DateTimeFormat(locale.lang, { month: 'short' }));
  const longName = $derived(new Intl.DateTimeFormat(locale.lang, { month: 'long', year: 'numeric' }));
  const date = (m: string) => new Date(`${m}-15T12:00`);
  let hover = $state<number | null>(null);
  let table = $state(false);
  const empty = $derived(data.every((d) => d.value === 0));
</script>

<section class="chart">
  <header>
    <h3>{title}</h3>
    <button class="icon-btn" class:active={table} title={t('stats.table')} onclick={() => (table = !table)}><Table2 size={15} /></button>
  </header>
  {#if table}
    <table>
      <tbody>
        {#each data as d (d.month)}<tr><td>{longName.format(date(d.month))}</td><td class="num">{format(d.value)}</td></tr>{/each}
      </tbody>
    </table>
  {:else if empty}
    <p class="faint none">{t('stats.noData')}</p>
  {:else}
    <div class="plot" role="list" onmouseleave={() => (hover = null)}>
      <span class="maxlabel faint">{format(max)}</span>
      {#each data as d, i (d.month)}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
          class="slot"
          class:on={hover === i}
          role="listitem"
          tabindex="0"
          aria-label="{longName.format(date(d.month))}: {format(d.value)}"
          onmouseenter={() => (hover = i)}
          onfocus={() => (hover = i)}
          onblur={() => (hover = null)}
        >
          <div class="bar" style:height="{(d.value / max) * 100}%"></div>
          <span class="month faint">{monthName.format(date(d.month))}</span>
          {#if hover === i}
            <div class="tip"><b>{format(d.value)}</b><span>{longName.format(date(d.month))}</span></div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .chart {
    padding: 14px 16px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h3 {
    margin: 0;
    font-size: 13px;
  }
  .plot {
    position: relative;
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    height: 150px;
    margin-top: 14px;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--border);
  }
  .maxlabel {
    position: absolute;
    top: -12px;
    left: 0;
    font-size: 10px;
  }
  .slot {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    outline: none;
  }
  .bar {
    width: min(24px, 60%);
    min-height: 0;
    border-radius: 4px 4px 0 0;
    background: var(--accent);
  }
  .slot.on .bar,
  .slot:focus-visible .bar {
    background: var(--accent-hover);
  }
  .month {
    position: absolute;
    bottom: -18px;
    font-size: 10px;
  }
  .tip {
    position: absolute;
    bottom: calc(100% + 4px);
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-s);
    background: var(--bg-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    white-space: nowrap;
    pointer-events: none;
    font-size: 12px;
  }
  .tip span {
    color: var(--text-muted);
    font-size: 11px;
  }
  table {
    width: 100%;
    margin-top: 8px;
    border-collapse: collapse;
    font-size: 12px;
  }
  td {
    padding: 2px 4px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .none {
    margin: 30px 0;
    text-align: center;
  }
</style>
