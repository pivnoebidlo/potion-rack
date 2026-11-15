<!-- The status of a paint as a coloured dot (with the name as a tooltip). -->
<script lang="ts">
  import type { PaintStatus } from '../../shared/types.ts';
  import { t } from '../lib/i18n.svelte.ts';

  let { status, label = false }: { status: PaintStatus; label?: boolean } = $props();
</script>

<span class="status" title={label ? undefined : t(`status.${status}`)}>
  <span class="dot {status}"></span>{#if label}<span>{t(`status.${status}`)}</span>{/if}
</span>

<style>
  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
  }
  .have { background: var(--success); }
  .low { background: var(--warning); }
  .out { background: var(--danger); }
  .ordered { background: var(--accent); }
  .wanted { background: transparent; box-shadow: inset 0 0 0 1.5px var(--text-muted); }
</style>
