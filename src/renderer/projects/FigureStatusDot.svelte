<!-- The status of a figure: a dot that fills up on the way from the pile to the shelf. -->
<script lang="ts">
  import { FIGURE_STATUSES, type FigureStatus } from '../../shared/projects.ts';
  import { t } from '../lib/i18n.svelte.ts';

  let { status, label = false }: { status: FigureStatus; label?: boolean } = $props();
  const step = $derived(FIGURE_STATUSES.indexOf(status));
</script>

<span class="fstatus" title={label ? undefined : t(`fstatus.${status}`)}>
  <span class="dot s{step}"></span>{#if label}<span>{t(`fstatus.${status}`)}</span>{/if}
</span>

<style>
  .fstatus {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .dot {
    width: 9px;
    height: 9px;
    flex: none;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1.5px var(--text-muted);
  }
  /* pile — empty, then filling clockwise, done — full green. */
  .s1 { background: conic-gradient(var(--accent) 0 25%, transparent 0); }
  .s2 { background: conic-gradient(var(--accent) 0 50%, transparent 0); }
  .s3 { background: conic-gradient(var(--accent) 0 75%, transparent 0); }
  .s4 { background: var(--success); box-shadow: none; }
</style>
