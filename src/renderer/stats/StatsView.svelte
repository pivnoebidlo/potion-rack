<!-- Statistics: headline numbers as tiles, then figures and hours by month, brands of the rack, figures by status. -->
<script lang="ts">
  import { FIGURE_STATUSES, duration } from '../../shared/projects.ts';
  import { computeStats } from '../../shared/stats.ts';
  import { locale, t } from '../lib/i18n.svelte.ts';
  import { store } from '../lib/store.svelte.ts';
  import FigureStatusDot from '../projects/FigureStatusDot.svelte';
  import ColumnChart from './ColumnChart.svelte';
  import MeterList from './MeterList.svelte';

  const s = $derived(computeStats(store.state.rack, store.state.projects, new Date()));
  const hm = (m: number) => duration(m, t('timer.h'), t('timer.min'));
  const money = $derived(new Intl.NumberFormat(locale.lang, { maximumFractionDigits: 0 }));
  const oneDecimal = $derived(new Intl.NumberFormat(locale.lang, { maximumFractionDigits: 1 }));
  const hours = (m: number) => (m >= 60 ? `${oneDecimal.format(m / 60)} ${t('timer.h')}` : `${Math.round(m)} ${t('timer.min')}`);
  const tiles = $derived([
    { label: t('stats.onShelf'), value: String(s.paints.onShelf), sub: t('stats.ofPaints', { count: s.paints.total }) },
    { label: t('stats.pile'), value: String(s.figures.byStatus.pile), sub: t('stats.ofFigures', { count: s.figures.total }) },
    { label: t('stats.finishedYear'), value: String(s.finishedThisYear), sub: s.avgMinutesPerFinished ? t('stats.avgTime', { time: hm(s.avgMinutesPerFinished) }) : '' },
    { label: t('stats.hoursYear'), value: hours(s.minutesThisYear), sub: t('stats.hoursTotal', { time: hours(s.minutesTotal) }) },
    { label: t('stats.spent'), value: money.format(s.spentOnPaints + s.spentOnFigures), sub: t('stats.spentSplit', { paints: money.format(s.spentOnPaints), figures: money.format(s.spentOnFigures) }) },
  ]);
  const brandRows = $derived(s.brands.slice(0, 8).map((b) => ({ key: b.value || '—', label: b.value || t('filter.noBrand'), value: b.count })));
  const statusRows = $derived(FIGURE_STATUSES.map((st) => ({ key: st, label: t(`fstatus.${st}`), value: s.figures.byStatus[st] })));
</script>

<header class="toolbar drag"><span class="name">{t('app.stats')}</span></header>

<div class="body">
  <div class="page">
    <div class="tiles">
      {#each tiles as tile (tile.label)}
        <div class="tile">
          <span class="label">{tile.label}</span>
          <span class="value">{tile.value}</span>
          {#if tile.sub}<span class="sub faint">{tile.sub}</span>{/if}
        </div>
      {/each}
    </div>
    <div class="grid">
      <ColumnChart title={t('stats.finishedByMonth')} data={s.finishedByMonth} format={(v) => String(v)} />
      <ColumnChart title={t('stats.hoursByMonth')} data={s.minutesByMonth} format={hours} />
      <MeterList title={t('stats.brands')} rows={brandRows} />
      <MeterList title={t('stats.figuresByStatus')} rows={statusRows}>
        {#snippet mark(key)}<FigureStatusDot status={key as (typeof FIGURE_STATUSES)[number]} />{/snippet}
      </MeterList>
    </div>
    {#if s.paints.wanted || s.paints.low || s.paints.out}
      <p class="faint foot">{t('stats.toBuy', { wanted: s.paints.wanted, low: s.paints.low, out: s.paints.out })}</p>
    {/if}
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    flex: none;
    height: var(--title-h);
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
  }
  .name {
    font-weight: 600;
  }
  /* No side panel here: the macOS traffic lights stand over the start of this row. */
  :global(:root[data-platform='darwin']) .toolbar {
    padding-left: 44px;
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .page {
    max-width: 980px;
    margin: 0 auto;
    padding: 18px 24px 60px;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }
  .tile {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-m);
    background: var(--bg-secondary);
  }
  .label {
    color: var(--text-muted);
    font-size: 12px;
  }
  .value {
    font-size: 26px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .sub {
    font-size: 11px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 12px;
  }
  .foot {
    margin-top: 14px;
    font-size: 12px;
  }
</style>
